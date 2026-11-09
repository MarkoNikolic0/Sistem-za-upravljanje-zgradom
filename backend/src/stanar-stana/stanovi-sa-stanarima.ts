import { EntityManager } from 'typeorm';
import { StanarStana } from './stanar-stana.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { poRedosleduStanova } from '../stan/redosled-stanova.js';

export async function stanoviSaStanarima(
  manager: EntityManager,
  zgradaId: number,
) {
  const [stanovi, veze] = await Promise.all([
    manager.find(Stan, {
      where: { zgrada: { id: zgradaId } },
      select: { id: true, broj: true, sprat: true, kvadratura: true },
    }),
    manager.find(StanarStana, {
      where: { stan: { zgrada: { id: zgradaId } } },
      relations: { korisnik: true, stan: true },
      select: {
        id: true,
        vlasnik: true,
        stan: { id: true },
        korisnik: {
          id: true,
          ime: true,
          prezime: true,
          email: true,
          telefon: true,
        },
      },
      order: {
        vlasnik: 'DESC',
        korisnik: { prezime: 'ASC', ime: 'ASC' },
      },
    }),
  ]);

  const stanariStana = new Map<
    number,
    Pick<StanarStana, 'id' | 'vlasnik' | 'korisnik'>[]
  >();
  for (const v of veze) {
    const stanari = stanariStana.get(v.stan.id) ?? [];
    stanari.push({ id: v.id, vlasnik: v.vlasnik, korisnik: v.korisnik });
    stanariStana.set(v.stan.id, stanari);
  }
  return stanovi
    .sort(poRedosleduStanova)
    .map(({ id, broj, sprat, kvadratura }) => ({
      id,
      broj,
      sprat,
      kvadratura,
      stanari: stanariStana.get(id) ?? [],
    }));
}

export type StanSaStanarima = Awaited<
  ReturnType<typeof stanoviSaStanarima>
>[number];
