import { applyDecorators } from '@nestjs/common';
import {
  IsByteLength,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export function PravilaLozinke() {
  return applyDecorators(
    IsString(),
    IsNotEmpty({ message: 'Unesi lozinku.' }),
    MinLength(8, { message: 'Lozinka mora imati najmanje 8 znakova.' }),
    MaxLength(64, { message: 'Lozinka može imati najviše 64 znaka.' }),
    IsByteLength(0, 72, {
      message:
        'Lozinka je predugačka. Slova č, ć, š, ž i đ zauzimaju dvostruko mesto, pa je skrati.',
    }),
  );
}
