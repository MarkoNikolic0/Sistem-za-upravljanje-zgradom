import { Transform } from 'class-transformer';

export function KaoBoolean() {
  return Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  );
}
