import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const CekaGlasActions = createActionGroup({
  source: 'Ceka glas',
  events: {
    'Glasanja promenjena': emptyProps(),
  },
});

export const CekaGlasApiActions = createActionGroup({
  source: 'Ceka glas API',
  events: {
    Ucitano: props<{ ima: boolean }>(),
  },
});
