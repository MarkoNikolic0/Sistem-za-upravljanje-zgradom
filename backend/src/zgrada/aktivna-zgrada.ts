import { NotFoundException } from '@nestjs/common';
import { EntityManager, IsNull } from 'typeorm';
import { Zgrada } from './zgrada.entity.js';

export const AKTIVNA_ZGRADA = { arhivirana: IsNull() };

export async function proveriAktivnu(
  manager: EntityManager,
  zgradaId: number,
  zakljucaj = false,
) {
  const zgrada = await manager.findOne(Zgrada, {
    where: { id: zgradaId, ...AKTIVNA_ZGRADA },
    select: { id: true },
    ...(zakljucaj && { lock: { mode: 'pessimistic_read' } }),
  });
  if (!zgrada) {
    throw new NotFoundException(`Zgrada sa id-jem ${zgradaId} ne postoji!`);
  }
}
