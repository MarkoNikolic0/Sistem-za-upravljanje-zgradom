import type { EntityManager } from 'typeorm';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';

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
