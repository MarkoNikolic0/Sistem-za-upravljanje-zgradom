import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Stranica } from '../../../shared/liste/stranica';
import { NeprocitaneNotifikacije, Notifikacija } from '../notifikacija-models';

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
    'Nov oglas': emptyProps(),
  },
});

export const NotifikacijeApiActions = createActionGroup({
  source: 'Notifikacije API',
  events: {
    'Neprocitane ucitane': props<NeprocitaneNotifikacije>(),
    'Lista ucitana': props<{ stranica: Stranica<Notifikacija> }>(),
    'Lista neuspela': emptyProps(),
    'Starije ucitane': props<{ stranica: Stranica<Notifikacija> }>(),
    'Starije neuspele': emptyProps(),
    Procitana: props<{ notifikacija: Notifikacija }>(),
    'Stranica procitana': props<{ link: string }>(),
    'Procitane sve': emptyProps(),
    'Procitaj sve neuspelo': emptyProps(),
  },
});
