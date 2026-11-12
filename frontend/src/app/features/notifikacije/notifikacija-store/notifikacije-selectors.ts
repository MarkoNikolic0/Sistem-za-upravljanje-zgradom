import { createSelector } from '@ngrx/store';
import { poDanima } from '../notifikacija-models';
import { notifikacijeFeature } from './notifikacije-reducer';

export const selectGrupe = createSelector(notifikacijeFeature.selectStavke, (stavke) =>
  poDanima(stavke),
);
