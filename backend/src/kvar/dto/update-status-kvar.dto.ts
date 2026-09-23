import { IsEnum } from "class-validator";
import { StatusKvara } from "../../shared/enums/kvar.enums.js";

export class UpdateStatusKvarDto {
    @IsEnum(StatusKvara)
    status: StatusKvara
}