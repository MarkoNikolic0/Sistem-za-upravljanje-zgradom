import { IsEnum, IsOptional } from 'class-validator';
import { KategorijaDokumenta } from '../../shared/enums/dokument.enums.js';
import { StranicenjeDto } from '../../shared/stranicenje.js';

export class DokumentUpitDto extends StranicenjeDto {
  @IsOptional()
  @IsEnum(KategorijaDokumenta)
  kategorija?: KategorijaDokumenta;
}
