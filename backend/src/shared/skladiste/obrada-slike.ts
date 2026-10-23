import sharp from 'sharp';
import { greskaPolja } from '../greske-validacije.js';

const MAKS_PIKSELA_SLIKE = 50_000_000;
const VELIKA_SLIKA_PX = 1920;
const SLICICA_PX = 400;

export async function obradiSliku(
  sadrzaj: Buffer,
  polje: string,
): Promise<[Buffer, Buffer]> {
  const ulaz = { limitInputPixels: MAKS_PIKSELA_SLIKE };
  try {
    return await Promise.all([
      sharp(sadrzaj, ulaz)
        .autoOrient()
        .resize(VELIKA_SLIKA_PX, VELIKA_SLIKA_PX, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp()
        .toBuffer(),
      sharp(sadrzaj, ulaz)
        .autoOrient()
        .resize(SLICICA_PX, SLICICA_PX)
        .webp()
        .toBuffer(),
    ]);
  } catch {
    throw greskaPolja(
      polje,
      'Izabrana slika ne može da se obradi. Probaj neku drugu.',
    );
  }
}
