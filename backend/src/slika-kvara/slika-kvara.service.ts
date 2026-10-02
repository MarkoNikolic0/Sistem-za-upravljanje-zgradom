import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SlikaKvara } from './slika-kvara.entity.js';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createS3Client } from './s3.config.js';
import { Express } from 'express';
import { randomUUID } from 'crypto';
import { KvarService } from '../kvar/kvar.service.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { Uloga } from '../shared/enums/uloga.enum.js';

const DOZVOLJENI_TIPOVI = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_VELICINA = 5 * 1024 * 1024;

@Injectable()
export class SlikaKvaraService {
  private s3: S3Client;
  private bucket: string;

  constructor(
    @InjectRepository(SlikaKvara)
    private slikaRepository: Repository<SlikaKvara>,
    private kvarService: KvarService,
    private config: ConfigService,
  ) {
    this.s3 = createS3Client(config);
    this.bucket = config.get<string>('GARAGE_BUCKET')!;
  }

  async upload(
    kvarId: number,
    korisnikId: number,
    uloga: Uloga,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Fajl nije poslat.');
    }
    if (!DOZVOLJENI_TIPOVI.includes(file.mimetype)) {
      throw new BadRequestException(
        `Dozvoljeni su samo JPG, PNG i WEBP fajlovi.`,
      );
    }
    if (file.size > MAX_VELICINA) {
      throw new BadRequestException(`Fajl ne sme biti veci od 5MB.`);
    }

    const kvar = await this.kvarService.findDostupan(kvarId, korisnikId, uloga);

    const ekstenzija = file.originalname.split('.').pop();
    const kljuc = `kvarovi/${randomUUID()}.${ekstenzija}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: kljuc,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const slika = this.slikaRepository.create({
      kljuc,
      kvar,
      korisnik: { id: korisnikId } as Korisnik,
    });
    return await this.slikaRepository.save(slika);
  }

  async findZaKvar(kvarId: number, korisnikId: number, uloga: Uloga) {
    await this.kvarService.findDostupan(kvarId, korisnikId, uloga);

    return await this.slikaRepository.find({
      where: { kvar: { id: kvarId } },
      order: { datumOtpremanja: 'ASC' },
    });
  }

  async remove(id: number, korisnikId: number, uloga: Uloga) {
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
      !(await this.kvarService.smeDaUpravlja(slika.kvar, korisnikId, uloga))
    ) {
      throw new ForbiddenException('Možete brisati samo svoje slike!');
    }

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: slika.kljuc,
      }),
    );
    return await this.slikaRepository.remove(slika);
  }
}
