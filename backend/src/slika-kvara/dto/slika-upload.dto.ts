import { ApiProperty } from '@nestjs/swagger';

export class SlikaUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  slika: unknown;
}
