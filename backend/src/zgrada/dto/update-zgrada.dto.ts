import { PartialType } from "@nestjs/mapped-types";
import { CreateZgradaDto } from "./create-zgrada.dto.js";

export class UpdateZgradaDto extends PartialType(CreateZgradaDto) {}