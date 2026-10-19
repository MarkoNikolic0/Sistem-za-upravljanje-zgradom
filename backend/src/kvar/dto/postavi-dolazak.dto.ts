import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, MinDate, ValidateIf } from 'class-validator';

export class PostaviDolazakDto {
  @ApiProperty({ type: Date, nullable: true })
  @ValidateIf((_, dolazak) => dolazak !== null)
  @MinDate(() => new Date(), {
    message: 'Dolazak ne može biti u prošlosti.',
  })
  @IsDate({ message: 'Unesi datum i vreme dolaska.' })
  @Type(() => Date)
  dolazak: Date | null;
}
