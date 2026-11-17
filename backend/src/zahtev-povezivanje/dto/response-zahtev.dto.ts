import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { StatusZahteva } from '../../shared/enums/status-zahteva.enum.js';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';
import { MAKS_RAZLOG_ODBIJANJA } from '../zahtev-povezivanje.entity.js';

export class ResponseZahtevDto {
  @IsIn([StatusZahteva.PRIHVACEN, StatusZahteva.ODBIJEN])
  status: StatusZahteva;

  @IsOptional()
  @IsBoolean()
  vlasnik?: boolean;

  @UkloniRazmake()
  @IsString()
  @MaxLength(MAKS_RAZLOG_ODBIJANJA, {
    message: `Razlog može imati najviše ${MAKS_RAZLOG_ODBIJANJA} znakova.`,
  })
  @IsOptional()
  razlog?: string;
}
