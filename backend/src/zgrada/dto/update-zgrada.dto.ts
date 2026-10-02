import { PartialType } from '@nestjs/swagger';
import { CreateZgradaDto } from './create-zgrada.dto.js';

export class UpdateZgradaDto extends PartialType(CreateZgradaDto) {}
