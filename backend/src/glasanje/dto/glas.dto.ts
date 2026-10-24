import { IsInt, IsPositive } from 'class-validator';

export class GlasDto {
  @IsPositive({ message: 'Izaberi jednu opciju.' })
  @IsInt({ message: 'Izaberi jednu opciju.' })
  opcijaId: number;
}
