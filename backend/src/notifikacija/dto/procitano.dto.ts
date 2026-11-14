import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ProcitanoDto {
  @IsOptional()
  @IsString({ message: 'Link mora biti tekst.' })
  @IsNotEmpty({ message: 'Link ne sme biti prazan.' })
  @MaxLength(200, { message: 'Link može imati najviše 200 znakova.' })
  link?: string;
}
