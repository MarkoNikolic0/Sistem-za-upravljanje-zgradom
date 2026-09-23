import { IsInt } from "class-validator";

export class DodeliServiseraDto {
    @IsInt()
    serviserId: number
}