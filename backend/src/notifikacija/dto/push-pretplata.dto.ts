import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SERVISI_ZA_PUSH } from '../push/push.constants.js';

export class KljuceviPretplateDto {
  @IsString({ message: 'Ključ mora biti tekst.' })
  @IsNotEmpty({ message: 'Ključ p256dh je obavezan.' })
  @MaxLength(200, { message: 'Ključ može imati najviše 200 znakova.' })
  p256dh: string;

  @IsString({ message: 'Ključ mora biti tekst.' })
  @IsNotEmpty({ message: 'Ključ auth je obavezan.' })
  @MaxLength(100, { message: 'Ključ može imati najviše 100 znakova.' })
  auth: string;
}

export class OdjavaPushDto {
  @IsUrl(
    {
      protocols: ['https'],
      require_protocol: true,
      host_whitelist: SERVISI_ZA_PUSH,
    },
    {
      message: 'Adresa pretplate nije adresa poznatog servisa za obaveštenja.',
    },
  )
  @MaxLength(1000, { message: 'Adresa pretplate je predugačka.' })
  @IsNotEmpty({ message: 'Adresa pretplate je obavezna.' })
  endpoint: string;
}

export class PushPretplataDto extends OdjavaPushDto {
  @ValidateNested()
  @Type(() => KljuceviPretplateDto)
  @IsNotEmpty({ message: 'Ključevi pretplate su obavezni.' })
  keys: KljuceviPretplateDto;
}
