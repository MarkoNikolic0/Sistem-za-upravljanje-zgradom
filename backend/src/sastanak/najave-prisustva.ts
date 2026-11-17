import { type EntityManager, Raw } from 'typeorm';
import { PotvrdaPrisustva } from './potvrda-prisustva.entity.js';

export async function obrisiBuduceNajave(
  manager: EntityManager,
  zgradaId: number,
  korisnikId?: number,
) {
  await manager.delete(PotvrdaPrisustva, {
    sastanak: {
      id: Raw(
        (kolona) =>
          `${kolona} IN (SELECT "id" FROM "sastanak" WHERE "zgradaId" = :zgradaId AND "pocetak" > now())`,
        { zgradaId },
      ),
    },
    ...(korisnikId !== undefined && { korisnik: { id: korisnikId } }),
  });
}
