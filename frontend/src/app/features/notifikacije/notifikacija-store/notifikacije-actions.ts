import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Stranica } from '../../../shared/liste/stranica';
import { Notifikacija } from '../notifikacija-models';

export const NotifikacijeActions = createActionGroup({
  source: 'Notifikacije',
  events: {
    'Lista otvorena': props<{ samoNeprocitane: boolean }>(),
    'Lista zatvorena': emptyProps(),
    'Ucitaj starije': emptyProps(),
    Procitaj: props<{ notifikacija: Notifikacija }>(),
    'Procitaj sve': emptyProps(),
  },
});

export const VezaActions = createActionGroup({
  source: 'Notifikacije veza',
  events: {
    Pokreni: emptyProps(),
    Zaustavi: emptyProps(),
    Povezan: emptyProps(),
    Stigla: props<{ notifikacija: Notifikacija }>(),
  },
});

export const NotifikacijeApiActions = createActionGroup({
  source: 'Notifikacije API',
  events: {
    'Broj ucitan': props<{ broj: number }>(),
    'Lista ucitana': props<{ stranica: Stranica<Notifikacija> }>(),
    'Lista neuspela': emptyProps(),
    'Starije ucitane': props<{ stranica: Stranica<Notifikacija> }>(),
    'Starije neuspele': emptyProps(),
    Procitana: props<{ id: number }>(),
    'Procitane sve': emptyProps(),
    'Procitaj sve neuspelo': emptyProps(),
  },
});
