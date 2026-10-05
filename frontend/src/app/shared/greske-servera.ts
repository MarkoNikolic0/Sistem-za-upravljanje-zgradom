import { HttpErrorResponse } from '@angular/common/http';

interface TeloGreskeValidacije {
  greske?: Record<string, string>;
}

export function greskaPolja(err: HttpErrorResponse, polje: string): string | undefined {
  if (err.status !== 400) {
    return undefined;
  }
  const telo = err.error as TeloGreskeValidacije | null;
  return telo?.greske?.[polje];
}
