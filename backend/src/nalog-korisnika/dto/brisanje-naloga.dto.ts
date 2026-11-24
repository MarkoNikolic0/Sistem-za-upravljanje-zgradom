import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class BrisanjeNalogaDto {
  @IsString({ message: 'Unesi lozinku.' })
  @MaxLength(100, { message: 'Lozinka nije ispravna.' })
  @IsNotEmpty({ message: 'Unesi lozinku.' })
  lozinka: string;
}
