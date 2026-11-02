import type { EntityManager } from 'typeorm';
import { StanarStana } from './stanar-stana.entity.js';

export function zakljucajVeze(
  manager: EntityManager,
  korisnikId: number,
  zgradaId: number,
  mode: 'pessimistic_read' | 'pessimistic_write' = 'pessimistic_read',
) {
  return manager.find(StanarStana, {
    where: { korisnik: { id: korisnikId }, stan: { zgrada: { id: zgradaId } } },
    relations: { stan: true },
    select: { id: true, vlasnik: true, stan: { id: true } },
    order: { id: 'ASC' },
    lock: { mode, tables: ['stanar_stana'] },
  });
}
