import { Pipe, PipeTransform } from '@angular/core';

export function nazivSprata(sprat: number): string {
  return sprat === 0 ? 'prizemlje' : `${sprat}. sprat`;
}

@Pipe({ name: 'sprat' })
export class SpratPipe implements PipeTransform {
  transform(sprat: number): string {
    return nazivSprata(sprat);
  }
}
