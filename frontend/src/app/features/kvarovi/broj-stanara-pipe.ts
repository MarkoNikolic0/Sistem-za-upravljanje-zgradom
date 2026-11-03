import { Pipe, PipeTransform } from '@angular/core';
import { uMnozini } from '../../shared/tekst/mnozina';

@Pipe({ name: 'brojStanara' })
export class BrojStanaraPipe implements PipeTransform {
  transform(broj: number): string {
    return uMnozini(broj, 'stanar', 'stanara', 'stanara');
  }
}
