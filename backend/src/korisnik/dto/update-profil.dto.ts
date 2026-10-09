import { PartialType, PickType } from '@nestjs/swagger';
import { RegisterDto } from '../../auth/dto/register.dto.js';

export class UpdateProfilDto extends PartialType(
  PickType(RegisterDto, ['ime', 'prezime', 'telefon'] as const),
) {}
