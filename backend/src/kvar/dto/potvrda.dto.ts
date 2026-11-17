import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAKS_OCENA } from '../kvar.constants.js';

const PORUKA_OCENA = `Ocena je ceo broj od 1 do ${MAKS_OCENA}.`;

export class PotvrdaDto {
  @Max(MAKS_OCENA, { message: PORUKA_OCENA })
  @Min(1, { message: PORUKA_OCENA })
  @IsInt({ message: PORUKA_OCENA })
  @IsOptional()
  ocena?: number;
}
