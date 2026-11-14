import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PORUKA_POTVRDA } from '../auth.constants.js';

export class PotvrdaEmailaDto {
  @IsString({ message: PORUKA_POTVRDA })
  @MaxLength(100, { message: PORUKA_POTVRDA })
  @IsNotEmpty({ message: PORUKA_POTVRDA })
  token: string;
}
