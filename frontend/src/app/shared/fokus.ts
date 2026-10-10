import { afterNextRender, ElementRef, inject, Injector } from '@angular/core';

export function fokusPosleCrtanja(): (selektor: string) => void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const injector = inject(Injector);
  return (selektor) =>
    afterNextRender(() => host.nativeElement.querySelector<HTMLElement>(selektor)?.focus(), {
      injector,
    });
}
