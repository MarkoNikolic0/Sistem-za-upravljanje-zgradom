import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class KomentarUpitDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  poStrani: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  preId?: number;
}