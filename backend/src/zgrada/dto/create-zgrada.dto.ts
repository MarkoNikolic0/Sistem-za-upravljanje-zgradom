import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class CreateZgradaDto {
    @IsString()
    @IsNotEmpty()
    naziv: string

    @IsString()
    @IsNotEmpty()
    adresa: string

    @IsInt()
    @IsNotEmpty()
    @Min(1)
    brojSpratova: number

    @IsInt()
    @IsNotEmpty()
    @Min(1)
    brojStanova: number
}