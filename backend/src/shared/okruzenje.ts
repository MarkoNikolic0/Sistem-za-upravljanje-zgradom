import { plainToInstance } from 'class-transformer';
import { IsString, IsUrl, MinLength, validateSync } from 'class-validator';

class Okruzenje {
  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsUrl({ require_tld: false, require_protocol: true })
  FRONTEND_URL: string;
}

export function proveriOkruzenje(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const greske = validateSync(plainToInstance(Okruzenje, config));
  if (greske.length > 0) {
    const polja = greske.map((greska) => greska.property).join(', ');
    throw new Error(`Neispravne promenljive okruženja: ${polja}`);
  }
  return config;
}
