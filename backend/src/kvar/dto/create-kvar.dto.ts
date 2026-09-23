import { IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { KategorijaKvara, LokacijaTip, Prioritet } from '../../shared/enums/kvar.enums.js';

export class CreateKvarDto {
  @IsString()
  @IsNotEmpty()
  naslov: string;

  @IsString()
  @IsNotEmpty()
  opis: string;

  @IsEnum(KategorijaKvara)
  @IsNotEmpty()
  kategorija: KategorijaKvara;

  @IsOptional()
  @IsEnum(Prioritet)
  prioritet: Prioritet;

  @IsEnum(LokacijaTip)
  @IsNotEmpty()
  lokacijaTip: LokacijaTip
}
