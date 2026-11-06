import { PartialType } from '@nestjs/swagger';
import { CreateDokumentDto } from './create-dokument.dto.js';

export class UpdateDokumentDto extends PartialType(CreateDokumentDto) {}
