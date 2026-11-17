import { type EntityManager, Raw } from 'typeorm';
import { PotvrdaPrisustva } from './potvrda-prisustva.entity.js';
import { VrstaSastanka } from '../shared/enums/sastanak.enums.js';

export async function obrisiBuduceNajave(
  manager: EntityManager,
  zgradaId: number,
  korisnikId?: number,
  vrsta?: VrstaSastanka,
) {
  await manager.delete(PotvrdaPrisustva, {
    sastanak: {
      id: Raw(
        (kolona) =>
          `${kolona} IN (SELECT "id" FROM "sastanak" WHERE "zgradaId" = :zgradaId AND "pocetak" > now()${vrsta ? ' AND "vrsta" = :vrsta' : ''})`,
        { zgradaId, ...(vrsta && { vrsta }) },
      ),
    },
    ...(korisnikId !== undefined && { korisnik: { id: korisnikId } }),
  });
}
