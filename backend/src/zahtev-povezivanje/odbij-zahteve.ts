import type { EntityManager, FindOptionsWhere } from 'typeorm';
import { In } from 'typeorm';
import { ZahtevPovezivanje } from './zahtev-povezivanje.entity.js';
import { StatusZahteva } from '../shared/enums/status-zahteva.enum.js';
import type { NotifikacijaService } from '../notifikacija/notifikacija.service.js';
import { TipNotifikacije } from '../notifikacija/notifikacija.entity.js';

export function tekstObrade(
  brojStana: string,
  status: StatusZahteva,
  razlog: string | null,
) {
  const ishod = status === StatusZahteva.PRIHVACEN ? 'prihvaćen' : 'odbijen';
  return `Zahtev za stan ${brojStana} je ${ishod}.${razlog ? ` Razlog: ${razlog}` : ''}`;
}

export async function odbijZahteve(
  manager: EntityManager,
  notifikacije: NotifikacijaService,
  gde: FindOptionsWhere<ZahtevPovezivanje>,
  razlog: string,
) {
  const zahtevi = await manager.find(ZahtevPovezivanje, {
    where: { ...gde, status: StatusZahteva.NA_CEKANJU },
    relations: { korisnik: true, stan: true },
    select: {
      id: true,
      korisnik: { id: true },
      stan: { id: true, broj: true },
    },
    order: { id: 'ASC' },
    lock: { mode: 'pessimistic_write', tables: ['zahtev_povezivanje'] },
  });
  if (zahtevi.length === 0) {
    return;
  }
  await manager.update(
    ZahtevPovezivanje,
    { id: In(zahtevi.map((z) => z.id)) },
    { status: StatusZahteva.ODBIJEN, razlogOdbijanja: razlog },
  );
  for (const zahtev of zahtevi) {
    await notifikacije.obavesti(manager, [zahtev.korisnik.id], {
      tip: TipNotifikacije.ZAHTEV_OBRADJEN,
      tekst: tekstObrade(zahtev.stan.broj, StatusZahteva.ODBIJEN, razlog),
      link: '/povezivanje',
    });
  }
}
