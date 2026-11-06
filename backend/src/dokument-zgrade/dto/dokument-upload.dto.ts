import { ApiProperty } from '@nestjs/swagger';
import { CreateDokumentDto } from './create-dokument.dto.js';

//za swagger
export class DokumentUploadDto extends CreateDokumentDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  fajl: unknown;
}
