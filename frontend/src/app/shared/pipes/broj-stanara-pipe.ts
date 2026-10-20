import { Pipe, PipeTransform } from '@angular/core';

const mnozina = new Intl.PluralRules('sr-Latn');

@Pipe({ name: 'brojStanara' })
export class BrojStanaraPipe implements PipeTransform {
  transform(broj: number): string {
    return `${broj} ${mnozina.select(broj) === 'one' ? 'stanar' : 'stanara'}`;
  }
}
