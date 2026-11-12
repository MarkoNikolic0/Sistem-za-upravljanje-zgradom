import type { EntityManager } from 'typeorm';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { Uloga } from '../shared/enums/uloga.enum.js';

export async function upravnikZgrade(
  manager: EntityManager,
  zgradaId: number,
): Promise<number[]> {
  const upravnik = await manager.findOne(Korisnik, {
    where: { zgrada: { id: zgradaId }, uloga: Uloga.UPRAVNIK },
    select: { id: true },
  });
  return upravnik ? [upravnik.id] : [];
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
