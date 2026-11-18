import { EntityManager, IsNull } from 'typeorm';
import { Zgrada } from './zgrada.entity.js';
import { nePostoji } from '../shared/ne-postoji.js';

export const AKTIVNA_ZGRADA = { arhivirana: IsNull() };

export async function proveriAktivnu(
  manager: EntityManager,
  zgradaId: number,
  zakljucaj?: 'pessimistic_read' | 'pessimistic_write',
) {
  const zgrada = await manager.findOne(Zgrada, {
    where: { id: zgradaId, ...AKTIVNA_ZGRADA },
    select: { id: true },
    ...(zakljucaj && { lock: { mode: zakljucaj } }),
  });
  if (!zgrada) {
    throw nePostoji('Zgrada', zgradaId);
  }
}
