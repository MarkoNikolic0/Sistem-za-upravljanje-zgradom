import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl } from '@angular/forms';

interface TeloGreske {
  greske?: Record<string, string>;
  message?: unknown;
}

export function greskaPolja(err: HttpErrorResponse, polje: string): string | undefined {
  if (err.status !== 400) {
    return undefined;
  }
  const telo = err.error as TeloGreske | null;
  return telo?.greske?.[polje];
}

export const PREVISE_POKUSAJA = 'Previše pokušaja. Sačekaj minut pa pokušaj ponovo.';

export function prvaGreskaPolja(err: HttpErrorResponse): string | undefined {
  if (err.status !== 400) {
    return undefined;
  }
  const telo = err.error as TeloGreske | null;
  return Object.values(telo?.greske ?? {}).at(0);
}

export function porukaServera(err: HttpErrorResponse): string | undefined {
  const poruka = (err.error as TeloGreske | null)?.message;
  return typeof poruka === 'string' ? poruka : undefined;
}

export function oznaciGreskuPolja<P extends string>(
  err: HttpErrorResponse,
  kontrole: Record<P, AbstractControl>,
  polja: readonly P[],
): P | undefined {
  for (const polje of polja) {
    const poruka = greskaPolja(err, polje);
    if (poruka) {
      kontrole[polje].setErrors({ server: poruka });
      kontrole[polje].markAsTouched();
      return polje;
    }
  }
  return undefined;
}
