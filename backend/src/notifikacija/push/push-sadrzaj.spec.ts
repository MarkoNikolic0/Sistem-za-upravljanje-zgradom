import { skrati, temaPusha } from './push.service.js';

describe('sadržaj push obaveštenja', () => {
  it('skraćuje tekst po slovima, ne seče emoji ni slova sa kvačicom', () => {
    expect(skrati('Kratko', 10)).toBe('Kratko');
    expect(skrati('👨‍👩‍👧 porodica', 3)).toBe('👨‍👩‍👧 …');
    expect(skrati('čćžšđ', 4)).toBe('čćž…');
  });

  it('tema je ista za isti link i staje u 32 znaka bezbedna za URL', () => {
    const tema = temaPusha('/kvarovi/15');
    expect(tema).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(temaPusha('/kvarovi/15')).toBe(tema);
    expect(temaPusha('/kvarovi/16')).not.toBe(tema);
    expect(temaPusha(null)).toBeUndefined();
  });
});
