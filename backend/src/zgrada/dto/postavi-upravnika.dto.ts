import { IsInt } from 'class-validator';

export class PostaviUpravnikaDto {
  @IsInt({ message: 'Izaberi korisnika.' })
  korisnikId: number;
}
