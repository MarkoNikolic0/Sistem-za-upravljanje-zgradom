import { PartialType, PickType } from '@nestjs/swagger';
import { CreateKomentarDto } from '../../komentar-kvar/dto/create-komentar.dto.js';

export class RazlogDto extends PickType(CreateKomentarDto, [
  'tekst',
] as const) {}

export class OpcioniRazlogDto extends PartialType(RazlogDto) {}
