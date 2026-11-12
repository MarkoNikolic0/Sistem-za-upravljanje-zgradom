import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { Kvar } from './kvar.entity.js';
import { PratilacKvara } from '../pratilac-kvara/pratilac-kvara.entity.js';
import { StatusKvara } from '../shared/enums/kvar.enums.js';
import { danISat } from '../shared/vreme.js';
import { NotifikacijaService } from '../notifikacija/notifikacija.service.js';
import { TipNotifikacije } from '../notifikacija/notifikacija.entity.js';
import { upravnikZgrade } from '../notifikacija/primaoci.js';

interface PromenaStatusa {
  kvar: Kvar;
  izStatusa: StatusKvara[];
  status: StatusKvara;
  akterId: number;
  noviServiserId?: number;
}

@Injectable()
export class ObavestenjaKvaraService {
  constructor(private notifikacije: NotifikacijaService) {}

  async prijavljen(manager: EntityManager, kvar: Kvar) {
    const posalji = this.posiljalac(manager, kvar, kvar.korisnik.id);
    await posalji(
      await upravnikZgrade(manager, kvar.zgrada.id),
      `Prijavljen je nov kvar „${kvar.naslov}“.`,
      TipNotifikacije.KVAR_PRIJAVLJEN,
    );
  }

  async promenaStatusa(manager: EntityManager, p: PromenaStatusa) {
    const { kvar } = p;
    const posalji = this.posiljalac(manager, kvar, p.akterId);
    const naslov = `„${kvar.naslov}“`;
    const stanari = () => this.stanari(manager, kvar);
    const upravnik = () => upravnikZgrade(manager, kvar.zgrada.id);
    const serviser = kvar.serviser ? [kvar.serviser.id] : [];

    switch (p.status) {
      case StatusKvara.PRIHVACEN:
        return posalji(
          await stanari(),
          `Upravnik je prihvatio prijavu kvara ${naslov}.`,
        );
      case StatusKvara.ODBIJEN:
        return posalji(await stanari(), `Prijava kvara ${naslov} je odbijena.`);
      case StatusKvara.POVUCEN:
        return posalji(
          await upravnik(),
          `Prijava kvara ${naslov} je povučena.`,
        );
      case StatusKvara.DODELJEN:
        await posalji(
          p.noviServiserId ? [p.noviServiserId] : [],
          `Dodeljen ti je kvar ${naslov}.`,
          TipNotifikacije.KVAR_DODELJEN,
        );
        return kvar.serviser
          ? posalji(serviser, `Kvar ${naslov} je dodeljen drugom serviseru.`)
          : posalji(await stanari(), `Kvar ${naslov} je dodeljen serviseru.`);
      case StatusKvara.U_TOKU:
        return p.izStatusa.includes(StatusKvara.RESEN)
          ? posalji(
              [...serviser, ...(await upravnik())],
              `Kvar ${naslov} nije rešen i vraćen je na popravku.`,
            )
          : posalji(
              await stanari(),
              `Serviser je počeo popravku kvara ${naslov}.`,
            );
      case StatusKvara.RESEN: {
        const potvrdjuju = await stanari();
        await posalji(
          potvrdjuju,
          `Kvar ${naslov} je rešen. Potvrdi da je sve u redu ili javi da nije.`,
        );
        return posalji(
          (await upravnik()).filter((id) => !potvrdjuju.includes(id)),
          `Kvar ${naslov} je rešen.`,
        );
      }
      case StatusKvara.ZATVOREN:
        return posalji(
          [...(await stanari()), ...(await upravnik()), ...serviser],
          `Kvar ${naslov} je zatvoren.`,
        );
    }
  }

  async dolazak(
    manager: EntityManager,
    kvar: Kvar,
    dolazak: Date | null,
    akterId: number,
  ) {
    const posalji = this.posiljalac(manager, kvar, akterId);
    await posalji(
      await this.stanari(manager, kvar),
      dolazak
        ? `Serviser dolazi ${danISat(dolazak)} zbog kvara „${kvar.naslov}“.`
        : `Termin dolaska servisera za kvar „${kvar.naslov}“ je otkazan.`,
      TipNotifikacije.KVAR_DOLAZAK,
    );
  }

  async komentar(manager: EntityManager, kvar: Kvar, akterId: number) {
    const posalji = this.posiljalac(manager, kvar, akterId);
    await posalji(
      [
        ...(await this.stanari(manager, kvar)),
        ...(await upravnikZgrade(manager, kvar.zgrada.id)),
        ...(kvar.serviser ? [kvar.serviser.id] : []),
      ],
      `Nov komentar na kvaru „${kvar.naslov}“.`,
      TipNotifikacije.KVAR_KOMENTAR,
    );
  }

  private async stanari(manager: EntityManager, kvar: Kvar) {
    const pratioci = await manager.find(PratilacKvara, {
      where: { kvar: { id: kvar.id } },
      relations: { korisnik: true },
      select: { id: true, korisnik: { id: true } },
    });
    return [kvar.korisnik.id, ...pratioci.map((p) => p.korisnik.id)];
  }

  private posiljalac(manager: EntityManager, kvar: Kvar, akterId: number) {
    return (
      primaoci: number[],
      tekst: string,
      tip = TipNotifikacije.KVAR_STATUS,
    ) =>
      this.notifikacije.obavesti(
        manager,
        primaoci,
        { tip, tekst, link: `/kvarovi/${kvar.id}` },
        akterId,
      );
  }
}
