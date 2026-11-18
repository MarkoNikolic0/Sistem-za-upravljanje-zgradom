import { effect } from '@angular/core';
import { AbstractControl } from '@angular/forms';

export function izaberiJedinu(
  kontrola: AbstractControl<number | null>,
  opcije: () => readonly { id: number }[],
  dozvoljeno: () => boolean = () => true,
): void {
  effect(() => {
    const lista = opcije();
    if (dozvoljeno() && lista.length === 1 && kontrola.value === null) {
      kontrola.setValue(lista[0].id);
    }
  });
}
