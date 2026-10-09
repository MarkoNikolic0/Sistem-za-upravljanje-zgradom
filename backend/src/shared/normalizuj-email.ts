import { Transform } from 'class-transformer';

export function NormalizujEmail() {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}
