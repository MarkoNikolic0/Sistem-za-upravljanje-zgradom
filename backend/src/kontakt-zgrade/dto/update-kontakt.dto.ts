import { PartialType } from '@nestjs/swagger';
import { CreateKontaktDto } from './create-kontakt.dto.js';

export class UpdateKontaktDto extends PartialType(CreateKontaktDto) {}
