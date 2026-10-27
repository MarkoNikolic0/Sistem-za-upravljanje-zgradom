import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateSastanakDto } from './create-sastanak.dto.js';

export class UpdateSastanakDto extends PartialType(
  OmitType(CreateSastanakDto, ['zgradaId'] as const),
) {}
