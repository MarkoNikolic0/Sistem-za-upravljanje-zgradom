import { smeNaAdresu } from './navigacija';

describe('smeNaAdresu', () => {
  it('odeljak iz menija dozvoljava samo njegove uloge, ostale adrese su slobodne', () => {
    expect(smeNaAdresu('/zahtevi?strana=2', 'stanar')).toBe(false);
    expect(smeNaAdresu('/zahtevi', 'upravnik')).toBe(true);
    expect(smeNaAdresu('/kvarovi/5#komentari', 'stanar')).toBe(true);
    expect(smeNaAdresu('/', 'serviser')).toBe(true);
    expect(smeNaAdresu('/profil', 'stanar')).toBe(true);
  });
});
