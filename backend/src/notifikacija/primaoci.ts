import type { EntityManager } from 'typeorm';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { AKTIVAN_KORISNIK } from '../korisnik/aktivan-korisnik.js';
import { Uloga } from '../shared/enums/uloga.enum.js';

export async function admini(manager: EntityManager): Promise<number[]> {
  const korisnici = await manager.find(Korisnik, {
    where: { uloga: Uloga.ADMIN, ...AKTIVAN_KORISNIK },
    select: { id: true },
  });
  return korisnici.map((k) => k.id);
}

export async function vidiZgradu(
  manager: EntityManager,
  zgradaId: number,
  samoVlasnici = false,
): Promise<number[]> {
  const delovi = await Promise.all([
    stanariZgrade(manager, zgradaId, samoVlasnici),
    upravnikZgrade(manager, zgradaId),
    admini(manager),
  ]);
  return delovi.flat();
}

export async function upravnikZgrade(
  manager: EntityManager,
  zgradaId: number,
): Promise<number[]> {
  const zgrada = await manager.findOne(Zgrada, {
    where: { id: zgradaId },
    select: { id: true, upravnikId: true },
  });
  return zgrada?.upravnikId ? [zgrada.upravnikId] : [];
}

export async function stanariZgrade(
  manager: EntityManager,
  zgradaId: number,
  samoVlasnici = false,
): Promise<number[]> {
  const veze = await manager.find(StanarStana, {
    where: {
      stan: { zgrada: { id: zgradaId } },
      ...(samoVlasnici && { vlasnik: true }),
    },
    relations: { korisnik: true },
    select: { id: true, korisnik: { id: true } },
  });
  return veze.map((v) => v.korisnik.id);
}
