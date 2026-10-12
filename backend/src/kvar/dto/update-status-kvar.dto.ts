import { IsIn } from 'class-validator';
import { StatusKvara } from '../../shared/enums/kvar.enums.js';

export type StatusRadaServisera = StatusKvara.U_TOKU | StatusKvara.RESEN;

export class UpdateStatusKvarDto {
  @IsIn([StatusKvara.U_TOKU, StatusKvara.RESEN])
  status: StatusRadaServisera;
}
