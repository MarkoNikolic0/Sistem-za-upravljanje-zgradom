import { IsNotEmpty, IsString } from 'class-validator';
import { PravilaLozinke } from '../decorators/pravila-lozinke.decorator.js';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Unesi trenutnu lozinku.' })
  trenutnaLozinka: string;

  @PravilaLozinke()
  novaLozinka: string;
}
