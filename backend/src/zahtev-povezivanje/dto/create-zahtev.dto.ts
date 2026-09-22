import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateZahtevDto {
  @IsInt()
  @IsNotEmpty()
  stanId: number;
}
