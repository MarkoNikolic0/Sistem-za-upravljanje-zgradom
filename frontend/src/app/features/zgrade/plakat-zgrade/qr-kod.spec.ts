import encodeQR from 'qr';
import decodeQR from 'qr/decode.js';
import { qrKod } from './qr-kod';

function moduliIzPutanje({ velicina, putanja }: ReturnType<typeof qrKod>): boolean[][] {
  const moduli = Array.from({ length: velicina }, () => Array<boolean>(velicina).fill(false));
  for (const [, x, y, sirina] of putanja.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let i = 0; i < Number(sirina); i++) {
      moduli[Number(y)][Number(x) + i] = true;
    }
  }
  return moduli;
}

function slika(moduli: boolean[][], uvecanje = 4) {
  const strana = moduli.length * uvecanje;
  const data = new Uint8Array(strana * strana * 4).fill(255);
  for (let y = 0; y < strana; y++) {
    for (let x = 0; x < strana; x++) {
      if (moduli[Math.floor(y / uvecanje)][Math.floor(x / uvecanje)]) {
        data.fill(0, (y * strana + x) * 4, (y * strana + x) * 4 + 3);
      }
    }
  }
  return { width: strana, height: strana, data };
}

describe('QR kod plakata', () => {
  const link = 'https://zgrada.example.rs/poziv/123';

  it('putanja crta tačno module koda, sa tihom zonom oko njega', () => {
    const moduli = moduliIzPutanje(qrKod(link));
    expect(moduli).toEqual(encodeQR(link, 'raw', { ecc: 'high', border: 4 }));
    expect(moduli[3].some(Boolean)).toBe(false);
  });

  it('čitač koda dobija isti link', () => {
    expect(decodeQR(slika(moduliIzPutanje(qrKod(link))))).toBe(link);
  });
});
