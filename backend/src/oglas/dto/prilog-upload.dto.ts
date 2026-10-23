import { ApiProperty } from '@nestjs/swagger';

export class PrilogUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  prilog: unknown;
}
