import { Transform } from 'class-transformer';

function ukloni(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export function UkloniRazmake() {
  return Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value.map(ukloni) : ukloni(value),
  );
}
