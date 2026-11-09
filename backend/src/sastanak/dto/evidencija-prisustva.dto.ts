import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsPositive,
} from 'class-validator';

export class EvidencijaPrisustvaDto {
  @IsInt({ each: true, message: 'Stan mora biti ceo broj.' })
  @IsPositive({ each: true, message: 'Stan mora biti ceo broj.' })
  @ArrayUnique({ message: 'Stan se ponavlja.' })
  @ArrayMaxSize(1000, { message: 'Previše stanova.' })
  @IsArray({ message: 'Pošalji spisak prisutnih stanova.' })
  stanovi: number[];
}
