import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { StatusZahteva } from '../../shared/enums/status-zahteva.enum.js';

export class ResponseZahtevDto {
  @IsIn([StatusZahteva.PRIHVACEN, StatusZahteva.ODBIJEN])
  status: StatusZahteva;
  @IsOptional()
  @IsBoolean()
  vlasnik?: boolean;
}
