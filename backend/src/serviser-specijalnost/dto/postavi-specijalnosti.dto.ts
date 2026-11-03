import { ArrayUnique, IsArray, IsEnum } from 'class-validator';
import { KategorijaKvara } from '../../shared/enums/kvar.enums.js';

export class PostaviSpecijalnostiDto {
  @IsEnum(KategorijaKvara, {
    each: true,
    message: 'Izaberi struke sa spiska.',
  })
  @ArrayUnique({ message: 'Struka je izabrana dvaput.' })
  @IsArray({ message: 'Izaberi struke sa spiska.' })
  kategorije: KategorijaKvara[];
}
