import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import { Kvar, KvarDetalj } from './kvar-models';

export const kvarEvents = eventGroup({
  source: 'Kvarovi',
  events: {
    prijavljen: type<Kvar>(),
    azuriran: type<KvarDetalj>(),
  },
});
