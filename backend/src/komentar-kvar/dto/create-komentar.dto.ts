import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateKomentarDto {
  @IsInt()
  @IsNotEmpty()
  kvarId: number;

  @IsString()
  @IsNotEmpty()
  tekst: string;
}
