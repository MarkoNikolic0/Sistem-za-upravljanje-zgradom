import { Uloga } from '../shared/enums/uloga.enum.js';

export const uslovUpravnika = (zgradaId: number) => ({
  uloga: Uloga.UPRAVNIK,
  zgrada: { id: zgradaId },
});
