import { ApiProperty, PickType } from '@nestjs/swagger';
import { CreateDokumentDto } from '../../dokument-zgrade/dto/create-dokument.dto.js';

export class ZapisnikDto extends PickType(CreateDokumentDto, ['naziv']) {}

export class ZapisnikUploadDto extends ZapisnikDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  fajl: unknown;
}
