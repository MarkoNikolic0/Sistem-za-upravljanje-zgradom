import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';
import { KaoBoolean } from '../../shared/kao-boolean.js';
import { KategorijaDokumenta } from '../../shared/enums/dokument.enums.js';
import { MAKS_NAZIV_DOKUMENTA } from '../dokument-zgrade.constants.js';

export class CreateDokumentDto {
  @UkloniRazmake()
  @IsString()
  @MaxLength(MAKS_NAZIV_DOKUMENTA, {
    message: `Naziv može imati najviše ${MAKS_NAZIV_DOKUMENTA} znakova.`,
  })
  @IsNotEmpty({ message: 'Unesi naziv.' })
  naziv: string;

  @IsEnum(KategorijaDokumenta, { message: 'Izaberi kategoriju.' })
  kategorija: KategorijaDokumenta;

  @KaoBoolean()
  @IsBoolean({ message: 'Izaberi ko vidi dokument.' })
  samoVlasnici: boolean;
}
