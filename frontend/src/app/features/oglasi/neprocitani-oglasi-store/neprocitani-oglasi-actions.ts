import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const NeprocitaniOglasiActions = createActionGroup({
  source: 'Neprocitani oglasi',
  events: {
    'Lista otvorena': emptyProps(),
    'Lista zatvorena': emptyProps(),
  },
});

export const NeprocitaniOglasiApiActions = createActionGroup({
  source: 'Neprocitani oglasi API',
  events: {
    'Broj ucitan': props<{ broj: number }>(),
    'Oznaceni procitani': props<{ procitanoDo: string; osveziListu: boolean }>(),
  },
});
