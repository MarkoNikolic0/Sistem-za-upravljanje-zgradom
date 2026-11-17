import {
  type CallHandler,
  ClassSerializerContextOptions,
  ClassSerializerInterceptor,
  ExecutionContext,
  StreamableFile,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { DataSource } from 'typeorm';
import { mergeMap } from 'rxjs';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { StanjeKvara } from '../shared/enums/kvar.enums.js';
import { StatusZahteva } from '../shared/enums/status-zahteva.enum.js';
import { STATUSI_PO_STANJU } from '../kvar/kvar.constants.js';
import { Korisnik } from './korisnik.entity.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';

const ULOGE_SA_KONTAKTOM: Uloga[] = [
  Uloga.UPRAVNIK,
  Uloga.SERVISER,
  Uloga.ADMIN,
];

const ULOGE_JAVNOG_KONTAKTA: Uloga[] = [Uloga.SERVISER, Uloga.ADMIN];

export function korisniciUOdgovoru(odgovor: unknown): Korisnik[] {
  const korisnici: Korisnik[] = [];
  const poseceni = new Set<object>();
  const obidji = (vrednost: unknown) => {
    if (
      typeof vrednost !== 'object' ||
      vrednost === null ||
      poseceni.has(vrednost) ||
      vrednost instanceof Date ||
      vrednost instanceof StreamableFile ||
      ArrayBuffer.isView(vrednost)
    ) {
      return;
    }
    poseceni.add(vrednost);
    if (vrednost instanceof Korisnik) {
      korisnici.push(vrednost);
    }
    for (const dete of Object.values(vrednost)) {
      obidji(dete);
    }
  };
  obidji(odgovor);
  return korisnici;
}

export async function korisniciSaKontaktom(
  dataSource: DataSource,
  posmatrac: TrenutniKorisnikPodaci,
  ids: number[],
): Promise<Set<number>> {
  const redovi: { id: number }[] = await dataSource.query(
    `WITH zgrade AS (
       SELECT id FROM zgrada WHERE "upravnikId" = $1 AND $2 = $5
       UNION
       SELECT "zgradaId" FROM kvar
       WHERE "serviserId" = $1 AND $2 = $6 AND status::text = ANY($7::text[])
     )
     SELECT k.id FROM korisnik k
     WHERE k.id = ANY($3::int[])
       AND (
         k.uloga::text = ANY($4::text[])
         OR EXISTS (
           SELECT 1 FROM stanar_stana ss
           JOIN stan s ON s.id = ss."stanId"
           WHERE ss."korisnikId" = k.id AND s."zgradaId" IN (SELECT id FROM zgrade)
         )
         OR EXISTS (
           SELECT 1 FROM zahtev_povezivanje zp
           JOIN stan s ON s.id = zp."stanId"
           WHERE zp."korisnikId" = k.id AND zp.status::text = $8
             AND s."zgradaId" IN (SELECT id FROM zgrade)
         )
         OR EXISTS (
           SELECT 1 FROM zgrada z
           WHERE z."upravnikId" = k.id AND z.id IN (SELECT id FROM zgrade)
         )
       )`,
    [
      posmatrac.id,
      posmatrac.uloga,
      ids,
      ULOGE_JAVNOG_KONTAKTA,
      Uloga.UPRAVNIK,
      Uloga.SERVISER,
      STATUSI_PO_STANJU[StanjeKvara.AKTIVNI],
      StatusZahteva.NA_CEKANJU,
    ],
  );
  return new Set(redovi.map((red) => red.id));
}

export class KontaktSerializerInterceptor extends ClassSerializerInterceptor {
  constructor(
    reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {
    super(reflector);
  }

  intercept(context: ExecutionContext, next: CallHandler) {
    const posmatrac: TrenutniKorisnikPodaci | undefined = context
      .switchToHttp()
      .getRequest()?.user;
    return super.intercept(context, {
      handle: () =>
        next.handle().pipe(
          mergeMap(async (odgovor: unknown) => {
            if (posmatrac) {
              await this.sakrijTudjeKontakte(odgovor, posmatrac);
            }
            return odgovor;
          }),
        ),
    });
  }

  protected getContextOptions(
    context: ExecutionContext,
  ): ClassSerializerContextOptions | undefined {
    const opcije = super.getContextOptions(context);
    const uloga: Uloga | undefined = context.switchToHttp().getRequest()
      ?.user?.uloga;

    if (!uloga || !ULOGE_SA_KONTAKTOM.includes(uloga)) {
      return opcije;
    }
    return { ...opcije, groups: [...(opcije?.groups ?? []), 'kontakt'] };
  }

  private async sakrijTudjeKontakte(
    odgovor: unknown,
    posmatrac: TrenutniKorisnikPodaci,
  ) {
    if (
      posmatrac.uloga !== Uloga.UPRAVNIK &&
      posmatrac.uloga !== Uloga.SERVISER
    ) {
      return;
    }
    const tudji = korisniciUOdgovoru(odgovor).filter(
      (korisnik) =>
        korisnik.id !== posmatrac.id &&
        !ULOGE_JAVNOG_KONTAKTA.includes(korisnik.uloga),
    );
    if (tudji.length === 0) {
      return;
    }
    const saKontaktom = await korisniciSaKontaktom(this.dataSource, posmatrac, [
      ...new Set(tudji.map((korisnik) => korisnik.id)),
    ]);
    for (const korisnik of tudji) {
      if (!saKontaktom.has(korisnik.id)) {
        Object.assign(korisnik, { email: undefined, telefon: undefined });
      }
    }
  }
}
