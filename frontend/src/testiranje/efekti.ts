import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';

export function pokreniEfekat(efekat: (actions$: Actions) => Observable<unknown>) {
  const akcije = new Subject<Action>();
  const izlaz: unknown[] = [];
  efekat(new Actions(akcije)).subscribe((akcija) => izlaz.push(akcija));
  return { posalji: (akcija: Action) => akcije.next(akcija), izlaz };
}
