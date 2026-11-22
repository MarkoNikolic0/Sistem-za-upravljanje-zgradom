import { IsInt, IsPositive } from 'class-validator';

export class CreateZahtevDto {
  @IsInt({ message: 'Izaberi stan.' })
  @IsPositive({ message: 'Izaberi stan.' })
  stanId: number;
}
