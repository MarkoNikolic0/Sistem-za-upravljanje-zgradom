import { IsEnum } from 'class-validator';
import { StatusZahteva } from '../../shared/enums/status-zahteva.enum.js';

export class ResponseZahtevDto {
  @IsEnum(StatusZahteva)
  status: StatusZahteva;
}
