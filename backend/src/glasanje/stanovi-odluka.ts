import { EntityManager, MoreThan } from 'typeorm';
import { Glasanje } from './glasanje.entity.js';
import { VrstaGlasanja } from '../shared/enums/glasanje.enums.js';

export async function promeniBrojStanovaOdluka(
  manager: EntityManager,
  zgradaId: number,
  razlika: number,
) {
  await manager.increment(
    Glasanje,
    {
      zgrada: { id: zgradaId },
      vrsta: VrstaGlasanja.ODLUKA,
      rok: MoreThan(new Date()),
    },
    'ukupnoStanova',
    razlika,
  );
}
