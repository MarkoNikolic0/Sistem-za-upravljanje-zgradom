import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class RegisterDto {
    @IsString()
    @IsNotEmpty()
    ime:string

    @IsString()
    @IsNotEmpty()
    prezime:string

    @IsEmail()
    @IsNotEmpty()
    email:string

    @IsString()
    @MinLength(6)
    @IsNotEmpty()
    lozinka:string
}
