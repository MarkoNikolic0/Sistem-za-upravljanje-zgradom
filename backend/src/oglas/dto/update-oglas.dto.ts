import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateOglasDto } from './create-oglas.dto.js';

export class UpdateOglasDto extends PartialType(
  OmitType(CreateOglasDto, ['zgradaId', 'glasanjeId'] as const),
) {}
