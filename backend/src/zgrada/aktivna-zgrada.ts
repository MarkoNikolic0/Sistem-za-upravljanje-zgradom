import { NotFoundException } from '@nestjs/common';
import { EntityManager, IsNull } from 'typeorm';
import { Zgrada } from './zgrada.entity.js';

// Arhivirana zgrada se nikome ne prikazuje i u nju se ništa ne dodaje
export const AKTIVNA_ZGRADA = { arhivirana: IsNull() };

// 404 ako zgrada ne postoji ili je arhivirana. Sa zaključavanjem, u transakciji upisa, arhiviranje
// i brisanje zgrade čekaju kraj upisa, a upis koji je čekao njih dobija 404.
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
