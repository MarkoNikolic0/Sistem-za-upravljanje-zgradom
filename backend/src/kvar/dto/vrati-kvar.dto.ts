import { PickType } from '@nestjs/swagger';
import { CreateKomentarDto } from '../../komentar-kvar/dto/create-komentar.dto.js';

export class VratiKvarDto extends PickType(CreateKomentarDto, [
  'tekst',
] as const) {}
