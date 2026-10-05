import { applyDecorators } from '@nestjs/common';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export function PravilaLozinke() {
  return applyDecorators(
    IsString(),
    MinLength(8, { message: 'Lozinka mora imati najmanje 8 znakova.' }),
    IsNotEmpty({ message: 'Unesi lozinku.' }),
  );
}
