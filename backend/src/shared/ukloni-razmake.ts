import { Transform } from 'class-transformer';

export function UkloniRazmake() {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}
