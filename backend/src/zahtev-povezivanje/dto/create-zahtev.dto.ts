import { IsInt, IsPositive } from 'class-validator';

export class CreateZahtevDto {
  @IsInt()
  @IsPositive()
  stanId: number;
}
