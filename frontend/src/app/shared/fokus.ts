import { afterNextRender, DOCUMENT, ElementRef, inject, Injector } from '@angular/core';

export function fokusPosleCrtanja(): (selektor: string) => void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const injector = inject(Injector);
  return (selektor) =>
    afterNextRender(() => host.nativeElement.querySelector<HTMLElement>(selektor)?.focus(), {
      injector,
    });
}

export function fokusNaSadrzaj(): () => void {
  const dokument = inject(DOCUMENT);
  const injector = inject(Injector);
  return () =>
    afterNextRender(() => dokument.getElementById('sadrzaj')?.focus(), {
      injector,
    });
}
