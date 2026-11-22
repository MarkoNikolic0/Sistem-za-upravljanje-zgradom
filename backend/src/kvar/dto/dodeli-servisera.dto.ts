import { IsInt, IsPositive } from 'class-validator';

export class DodeliServiseraDto {
  @IsPositive({ message: 'Izaberi servisera.' })
  @IsInt({ message: 'Izaberi servisera.' })
  serviserId: number;
}
