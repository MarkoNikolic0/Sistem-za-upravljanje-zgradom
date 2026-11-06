import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { DokumentZgrade } from './dokument-zgrade.entity.js';
import { proveriAktivnu } from '../zgrada/aktivna-zgrada.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { sadrzi, zgradeVlasnika } from '../korisnik/pristup-zgradama.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { greskaPolja } from '../shared/greske-validacije.js';
import { stranicenje } from '../shared/stranicenje.js';
import { SkladisteService } from '../shared/skladiste/skladiste.service.js';
import { obradiSliku } from '../shared/skladiste/obrada-slike.js';
import { PDF } from '../shared/skladiste/otpremanje-fajla.js';
import { CreateDokumentDto } from './dto/create-dokument.dto.js';
import { UpdateDokumentDto } from './dto/update-dokument.dto.js';
import { DokumentUpitDto } from './dto/dokument-upit.dto.js';

function nazivPdfFajla(naziv: string) {
  return naziv.toLowerCase().endsWith('.pdf') ? naziv : `${naziv}.pdf`;
}

@Injectable()
export class DokumentZgradeService {
  constructor(
    @InjectRepository(DokumentZgrade)
    private dokumentRepository: Repository<DokumentZgrade>,
    private korisnikService: KorisnikService,
    private skladiste: SkladisteService,
    private dataSource: DataSource,
  ) {}

  async findAll(
    zgradaId: number,
    korisnikId: number,
    uloga: Uloga,
    upit: DokumentUpitDto,
  ) {
    await proveriAktivnu(this.dataSource.manager, zgradaId);
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    if (!sadrzi(p.zgrade, zgradaId)) {
      throw new ForbiddenException('Nemate pristup ovoj zgradi!');
    }

    const [stavke, ukupno] = await this.dokumentRepository.findAndCount({
      where: {
        zgrada: { id: zgradaId },
        ...(upit.kategorija && { kategorija: upit.kategorija }),
        ...(!sadrzi(zgradeVlasnika(p), zgradaId) && { samoVlasnici: false }),
      },
      order: { datumOtpremanja: 'DESC', id: 'DESC' },
      ...stranicenje(upit),
    });

    return {
      stavke: await Promise.all(stavke.map((d) => this.saLinkom(d))),
      ukupno,
    };
  }

  async create(
    zgradaId: number,
    korisnikId: number,
    uloga: Uloga,
    dto: CreateDokumentDto,
    fajl: Express.Multer.File | undefined,
  ) {
    await this.proveriUpravnika(zgradaId, korisnikId, uloga);
    if (!fajl) {
      throw greskaPolja('fajl', 'Izaberi fajl.');
    }

    const osnova = `dokumenti/${zgradaId}/${randomUUID()}`;
    const [kljuc, sadrzaj, tip] =
      fajl.mimetype === PDF
        ? [`${osnova}.pdf`, fajl.buffer, PDF]
        : [
            `${osnova}.webp`,
            (await obradiSliku(fajl.buffer, 'fajl'))[0],
            'image/webp',
          ];
    await this.skladiste.sacuvaj(kljuc, sadrzaj, tip);

    try {
      const dokument = await this.dataSource.transaction(async (manager) => {
        await proveriAktivnu(manager, zgradaId, true);
        return await manager.save(
          manager.create(DokumentZgrade, {
            naziv: dto.naziv,
            kategorija: dto.kategorija,
            samoVlasnici: dto.samoVlasnici,
            kljuc,
            tip,
            velicina: sadrzaj.length,
            zgrada: { id: zgradaId },
          }),
        );
      });
      return await this.saLinkom(dokument);
    } catch (greska) {
      await this.skladiste.obrisi(kljuc);
      throw greska;
    }
  }

  async update(
    zgradaId: number,
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: UpdateDokumentDto,
  ) {
    await this.proveriUpravnika(zgradaId, korisnikId, uloga);
    const dokument = await this.nadjiDokument(zgradaId, id);
    Object.assign(dokument, {
      naziv: dto.naziv ?? dokument.naziv,
      kategorija: dto.kategorija ?? dokument.kategorija,
      samoVlasnici: dto.samoVlasnici ?? dokument.samoVlasnici,
    });

    return await this.saLinkom(await this.dokumentRepository.save(dokument));
  }

  async remove(zgradaId: number, id: number, korisnikId: number, uloga: Uloga) {
    await this.proveriUpravnika(zgradaId, korisnikId, uloga);
    const dokument = await this.nadjiDokument(zgradaId, id);
    await this.dokumentRepository.delete(dokument.id);
    await this.skladiste.obrisi(dokument.kljuc);
  }

  private async proveriUpravnika(
    zgradaId: number,
    korisnikId: number,
    uloga: Uloga,
  ) {
    await this.korisnikService.proveriUpravnikaZgrade(
      korisnikId,
      uloga,
      zgradaId,
      'Dokumente kači samo upravnik ove zgrade!',
    );
  }

  private async nadjiDokument(zgradaId: number, id: number) {
    const dokument = await this.dokumentRepository.findOne({
      where: { id, zgrada: { id: zgradaId } },
    });
    if (!dokument) {
      throw new NotFoundException(`Dokument sa id-jem ${id} ne postoji!`);
    }
    return dokument;
  }

  private async saLinkom(dokument: DokumentZgrade) {
    const url = await this.skladiste.link(
      dokument.kljuc,
      dokument.tip === PDF ? nazivPdfFajla(dokument.naziv) : undefined,
    );
    return Object.assign(dokument, { url });
  }
}
