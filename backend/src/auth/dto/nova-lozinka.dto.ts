import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PravilaLozinke } from '../decorators/pravila-lozinke.decorator.js';
import { PORUKA_LINK } from '../auth.constants.js';

export class NovaLozinkaDto {
  @IsString({ message: PORUKA_LINK })
  @MaxLength(100, { message: PORUKA_LINK })
  @IsNotEmpty({ message: PORUKA_LINK })
  token: string;

  @PravilaLozinke()
  lozinka: string;
}
