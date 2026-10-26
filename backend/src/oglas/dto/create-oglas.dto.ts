import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinDate,
} from 'class-validator';
import { VrstaOglasa } from '../../shared/enums/vrsta-oglasa.enum.js';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateOglasDto {
  @UkloniRazmake()
  @IsString()
  @MaxLength(100, { message: 'Naslov može imati najviše 100 znakova.' })
  @IsNotEmpty({ message: 'Unesi kratak naslov.' })
  naslov: string;

  @UkloniRazmake()
  @IsString()
  @MaxLength(2000, { message: 'Tekst može imati najviše 2000 znakova.' })
  @IsNotEmpty({ message: 'Napiši tekst oglasa.' })
  tekst: string;

  @IsEnum(VrstaOglasa, { message: 'Izaberi vrstu oglasa.' })
  vrsta: VrstaOglasa;

  @IsOptional()
  @IsBoolean()
  vazno?: boolean;

  @ApiProperty({ type: Date, nullable: true, required: false })
  @IsOptional()
  @MinDate(() => new Date(), {
    message: 'Datum ne može biti u prošlosti.',
  })
  @IsDate({ message: 'Unesi datum do kog oglas važi.' })
  @Type(() => Date)
  vaziDo?: Date | null;

  @IsInt()
  @IsPositive()
  zgradaId: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  glasanjeId?: number;
}
