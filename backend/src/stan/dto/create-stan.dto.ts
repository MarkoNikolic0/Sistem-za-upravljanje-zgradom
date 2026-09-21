import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class CreateStanDto {
  @IsString()
  @IsNotEmpty()
  broj: string;

  @IsInt()
  @IsNotEmpty()
  sprat?: number;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  kvadratura?: number;

  @IsInt()
  zgradaId: number;
}