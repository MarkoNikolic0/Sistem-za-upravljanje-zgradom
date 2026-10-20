import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsPositive } from 'class-validator';
import { KategorijaKvara } from '../../shared/enums/kvar.enums.js';

export class SlicniKvaroviUpitDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  stanId: number;

  @IsEnum(KategorijaKvara)
  kategorija: KategorijaKvara;
}
