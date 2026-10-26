import { numberAttribute } from '@angular/core';

// Id iz adrese (/oglasi/5/izmena, ?odluka=63) kao broj; proverava ga jeIspravanId
export function idIzAdrese(id: string | undefined): number | undefined {
  return id === undefined ? undefined : numberAttribute(id);
}

export function jeIspravanId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
}
