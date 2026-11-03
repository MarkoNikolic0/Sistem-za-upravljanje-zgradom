import { signalStoreFeature, withProps, withState } from '@ngrx/signals';

export interface PaginacijaState {
  strana: number;
  ukupno: number;
}

export function withPaginacija(poStrani: number) {
  return signalStoreFeature(
    withState<PaginacijaState>({ strana: 1, ukupno: 0 }),
    withProps(() => ({ poStrani })),
  );
}

export function jePraznaStrana(stavke: unknown[], strana: number): boolean {
  return stavke.length === 0 && strana > 1;
}
