import sharp, { type ResizeOptions } from 'sharp';
import { greskaPolja } from '../greske-validacije.js';

const MAKS_PIKSELA_SLIKE = 50_000_000;
const VELIKA_SLIKA_PX = 1920;
const SLICICA_PX = 400;

const VELIKA: ResizeOptions = {
  width: VELIKA_SLIKA_PX,
  height: VELIKA_SLIKA_PX,
  fit: 'inside',
  withoutEnlargement: true,
};
const SLICICA: ResizeOptions = { width: SLICICA_PX, height: SLICICA_PX };

async function uWebp(
  sadrzaj: Buffer,
  polje: string,
  velicine: ResizeOptions[],
): Promise<Buffer[]> {
  const ulaz = { limitInputPixels: MAKS_PIKSELA_SLIKE };
  try {
    return await Promise.all(
      velicine.map((velicina) =>
        sharp(sadrzaj, ulaz).autoOrient().resize(velicina).webp().toBuffer(),
      ),
    );
  } catch {
    throw greskaPolja(
      polje,
      'Izabrana slika ne može da se obradi. Probaj neku drugu.',
    );
  }
}

export async function obradiSliku(
  sadrzaj: Buffer,
  polje: string,
): Promise<[Buffer, Buffer]> {
  const [velika, slicica] = await uWebp(sadrzaj, polje, [VELIKA, SLICICA]);
  return [velika, slicica];
}

export async function obradiVelikuSliku(
  sadrzaj: Buffer,
  polje: string,
): Promise<Buffer> {
  const [velika] = await uWebp(sadrzaj, polje, [VELIKA]);
  return velika;
}
