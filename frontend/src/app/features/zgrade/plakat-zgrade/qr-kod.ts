import encodeQR from 'qr';

export interface QrKod {
  velicina: number;
  putanja: string;
}

export function qrKod(tekst: string): QrKod {
  const moduli = encodeQR(tekst, 'raw', { ecc: 'high', border: 4 });
  let putanja = '';
  moduli.forEach((red, y) => {
    let x = 0;
    while (x < red.length) {
      if (!red[x]) {
        x++;
        continue;
      }
      const pocetak = x;
      while (red[x]) {
        x++;
      }
      putanja += `M${pocetak} ${y}h${x - pocetak}v1h${pocetak - x}z`;
    }
  });
  return { velicina: moduli.length, putanja };
}
