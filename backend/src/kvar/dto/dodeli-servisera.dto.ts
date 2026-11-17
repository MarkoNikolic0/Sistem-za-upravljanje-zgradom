import { IsInt, IsPositive } from 'class-validator';

export class DodeliServiseraDto {
  @IsPositive()
  @IsInt()
  serviserId: number;
}
