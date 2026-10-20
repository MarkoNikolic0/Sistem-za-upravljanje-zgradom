import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { SlikaKvara } from './slika-kvara.entity.js';
import { createS3Client } from './s3.config.js';
import { KvarService } from '../kvar/kvar.service.js';
import { KvarPravaService } from '../kvar/kvar-prava.service.js';
import { Kvar } from '../kvar/kvar.entity.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { greskaPolja } from '../shared/greske-validacije.js';
import {
  MAKS_PIKSELA_SLIKE,
  MAKS_SLIKA_PO_KVARU,
  SLICICA_PX,
  TRAJANJE_LINKA_S,
  VELIKA_SLIKA_PX,
} from './slika-kvara.constants.js';
import { jeZavrsen } from '../kvar/kvar.constants.js';

@Injectable()
export class SlikaKvaraService {
  private readonly logger = new Logger(SlikaKvaraService.name);
  private s3: S3Client;
  private bucket: string;

  constructor(
    @InjectRepository(SlikaKvara)
    private slikaRepository: Repository<SlikaKvara>,
    private kvarService: KvarService,
    private kvarPravaService: KvarPravaService,
    private dataSource: DataSource,
    config: ConfigService,
  ) {
    this.s3 = createS3Client(config);
    this.bucket = config.get<string>('GARAGE_BUCKET')!;
  }

  async findZaKvar(kvarId: number, korisnikId: number, uloga: Uloga) {
    await this.kvarService.findDostupan(kvarId, korisnikId, uloga);

    const slike = await this.slikaRepository.find({
      where: { kvar: { id: kvarId } },
      relations: { korisnik: true },
      order: { datumOtpremanja: 'ASC', id: 'ASC' },
    });
    return await Promise.all(slike.map((slika) => this.saLinkovima(slika)));
  }

  async create(
    kvarId: number,
    korisnikId: number,
    uloga: Uloga,
    fajl: Express.Multer.File | undefined,
  ) {
    if (!fajl) {
      throw greskaPolja('slika', 'Izaberi sliku.');
    }
    const kvar = await this.kvarService.findDostupan(kvarId, korisnikId, uloga);

    if (jeZavrsen(kvar.status)) {
      throw new ConflictException(
        'Kvar je završen, pa više ne mogu da se dodaju slike.',
      );
    }

    const [velika, slicica] = await this.obradi(fajl.buffer);
    const osnova = `kvarovi/${kvar.id}/${randomUUID()}`;
    const kljuc = `${osnova}.webp`;
    const kljucSlicice = `${osnova}-slicica.webp`;
    await Promise.all([
      this.sacuvajFajl(kljuc, velika),
      this.sacuvajFajl(kljucSlicice, slicica),
    ]);

    try {
      const id = await this.dataSource.transaction(async (manager) => {
        await manager.findOne(Kvar, {
          where: { id: kvar.id },
          select: { id: true },
          lock: { mode: 'pessimistic_write' },
        });
        const broj = await manager.count(SlikaKvara, {
          where: { kvar: { id: kvar.id } },
        });
        if (broj >= MAKS_SLIKA_PO_KVARU) {
          throw greskaPolja(
            'slika',
            `Kvar može imati najviše ${MAKS_SLIKA_PO_KVARU} slika.`,
          );
        }
        const { identifiers } = await manager.insert(SlikaKvara, {
          kljuc,
          kljucSlicice,
          kvar: { id: kvar.id },
          korisnik: { id: korisnikId },
        });
        return identifiers[0].id as number;
      });

      const slika = await this.slikaRepository.findOneOrFail({
        where: { id },
        relations: { korisnik: true },
      });
      return await this.saLinkovima(slika);
    } catch (greska) {
      await this.obrisiFajlove(kljuc, kljucSlicice);
      throw greska;
    }
  }

  async remove(id: number, korisnikId: number, uloga: Uloga): Promise<void> {
    const slika = await this.slikaRepository.findOne({
      where: { id },
      relations: { korisnik: true, kvar: { zgrada: true } },
    });
    if (!slika) {
      throw new NotFoundException(`Slika sa id-jem ${id} ne postoji!`);
    }

    const autor = slika.korisnik?.id === korisnikId;
    if (
      !autor &&
      !(await this.kvarPravaService.smeDaUpravlja(
        slika.kvar,
        korisnikId,
        uloga,
      ))
    ) {
      throw new ForbiddenException('Možete brisati samo svoje slike!');
    }

    await this.slikaRepository.remove(slika);
    await this.obrisiFajlove(slika.kljuc, slika.kljucSlicice);
  }

  private async obradi(sadrzaj: Buffer): Promise<[Buffer, Buffer]> {
    const ulaz = { limitInputPixels: MAKS_PIKSELA_SLIKE };
    try {
      return await Promise.all([
        sharp(sadrzaj, ulaz)
          .autoOrient()
          .resize(VELIKA_SLIKA_PX, VELIKA_SLIKA_PX, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp()
          .toBuffer(),
        sharp(sadrzaj, ulaz)
          .autoOrient()
          .resize(SLICICA_PX, SLICICA_PX)
          .webp()
          .toBuffer(),
      ]);
    } catch {
      throw greskaPolja(
        'slika',
        'Izabrana slika ne može da se obradi. Probaj neku drugu.',
      );
    }
  }

  private async sacuvajFajl(kljuc: string, sadrzaj: Buffer) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: kljuc,
        Body: sadrzaj,
        ContentType: 'image/webp',
      }),
    );
  }

  private async obrisiFajlove(...kljucevi: string[]) {
    try {
      await Promise.all(
        kljucevi.map((kljuc) =>
          this.s3.send(
            new DeleteObjectCommand({ Bucket: this.bucket, Key: kljuc }),
          ),
        ),
      );
    } catch (greska) {
      this.logger.warn(`Fajlovi nisu obrisani: ${kljucevi.join(', ')}`, greska);
    }
  }

  private async saLinkovima(slika: SlikaKvara) {
    const [url, urlSlicice] = await Promise.all([
      this.link(slika.kljuc),
      this.link(slika.kljucSlicice),
    ]);
    return Object.assign(slika, { url, urlSlicice });
  }

  private link(kljuc: string) {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: kljuc }),
      { expiresIn: TRAJANJE_LINKA_S },
    );
  }
}
