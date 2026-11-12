import { IsBoolean, IsOptional } from 'class-validator';
import { StranicenjeDto } from '../../shared/stranicenje.js';
import { KaoBoolean } from '../../shared/kao-boolean.js';

export class NotifikacijaUpitDto extends StranicenjeDto {
  @IsOptional()
  @KaoBoolean()
  @IsBoolean()
  neprocitane?: boolean;
}
