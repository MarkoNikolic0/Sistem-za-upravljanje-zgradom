import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { KategorijaKvara } from '../../shared/enums/kvar.enums.js';

export class DodajSpecijalnostDto {
  @IsInt()
  @IsNotEmpty()
  korisnikId: number;

  @IsEnum(KategorijaKvara)
  kategorija: KategorijaKvara;
}
