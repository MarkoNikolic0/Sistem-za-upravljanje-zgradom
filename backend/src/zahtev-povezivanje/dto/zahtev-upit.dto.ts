import { IsEnum, IsOptional } from 'class-validator';
import { StatusZahteva } from '../../shared/enums/status-zahteva.enum.js';
import { StranicenjeDto } from '../../shared/stranicenje.js';

export class ZahtevUpitDto extends StranicenjeDto {
  @IsOptional()
  @IsEnum(StatusZahteva)
  status?: StatusZahteva;
}
