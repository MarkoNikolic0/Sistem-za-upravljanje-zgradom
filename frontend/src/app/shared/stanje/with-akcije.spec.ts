import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import type { Mock } from 'vitest';
import { AkcijeStore } from './with-akcije';

const greska = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

describe('withAkcije', () => {
  let store: InstanceType<typeof AkcijeStore>;
  let osvezi: Mock<() => void>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [AkcijeStore] });
    store = TestBed.inject(AkcijeStore);
    osvezi = vi.fn<() => void>();
  });

  it('uspeh: akcija u toku dok traje, pa poruka o uspehu i osvežavanje', async () => {
    const odgovor = new Subject<void>();
    const rezultat = store.izvrsiZahtev(odgovor, 'Sačuvano.', 'Nije sačuvano.', osvezi);
    expect(store.akcijaUToku()).toBe(true);
    odgovor.next();
    expect(await rezultat).toBe(true);
    expect(store.akcijaUToku()).toBe(false);
    expect(store.poruka()).toEqual({ tip: 'uspeh', tekst: 'Sačuvano.' });
    expect(osvezi).toHaveBeenCalledOnce();
  });

  it('greška polja sa servera ima prednost nad porukom servera i opštom porukom', async () => {
    const telo = { greske: { naslov: 'Naslov je predug.' }, message: 'Neispravno' };
    await store.izvrsiZahtev(
      throwError(() => greska(400, telo)),
      'Da',
      'Ne',
      osvezi,
    );
    expect(store.poruka()).toEqual({ tip: 'greska', tekst: 'Naslov je predug.' });

    await store.izvrsiZahtev(
      throwError(() => greska(403, { message: 'Zabranjeno' })),
      'Da',
      'Ne',
      osvezi,
    );
    expect(store.poruka()).toEqual({ tip: 'greska', tekst: 'Zabranjeno' });

    await store.izvrsiZahtev(
      throwError(() => greska(0)),
      'Da',
      'Nema veze.',
      osvezi,
    );
    expect(store.poruka()).toEqual({ tip: 'greska', tekst: 'Nema veze.' });
    expect(osvezi).not.toHaveBeenCalled();
  });

  it('404 i 409 osvežavaju podatke, a 404 može da ima posebnu poruku', async () => {
    const nema = { tip: 'greska' as const, tekst: 'Kvar više ne postoji.' };
    expect(
      await store.izvrsiZahtev(
        throwError(() => greska(404)),
        'Da',
        'Ne',
        osvezi,
        nema,
      ),
    ).toBe(false);
    expect(store.poruka()).toEqual(nema);
    await store.izvrsiZahtev(
      throwError(() => greska(409, { message: 'Već promenjeno' })),
      'Da',
      'Ne',
      osvezi,
    );
    expect(store.poruka()?.tekst).toBe('Već promenjeno');
    expect(osvezi).toHaveBeenCalledTimes(2);
  });

  it('poruka akcije koja završi posle poništavanja se ne prikazuje', async () => {
    const odgovor = new Subject<void>();
    const rezultat = store.izvrsiZahtev(odgovor, 'Sačuvano.', 'Ne', osvezi);
    store.ponisti();
    odgovor.next();
    await rezultat;
    expect(store.poruka()).toBeNull();
    expect(store.akcijaUToku()).toBe(false);
  });

  it('nova akcija briše staru poruku', async () => {
    store.prikaziPoruku({ tip: 'greska', tekst: 'Stara' });
    const rezultat = store.izvrsiZahtev(of(undefined), 'Nova', 'Ne', osvezi);
    expect(store.poruka()).toBeNull();
    await rezultat;
    expect(store.poruka()?.tekst).toBe('Nova');
  });

  it('jednom: ponovljena akcija sa istim ključem se odbacuje dok prva traje', async () => {
    const odgovor = new Subject<boolean>();
    const akcija = vi.fn(() => firstValueFrom(odgovor));
    const prva = store.jednom('obnovi-1', akcija);
    expect(await store.jednom('obnovi-1', akcija)).toBe(false);
    const druga = store.jednom('obnovi-2', () => Promise.resolve(true));
    expect(await druga).toBe(true);
    odgovor.next(true);
    expect(await prva).toBe(true);
    expect(akcija).toHaveBeenCalledOnce();
    expect(await store.jednom('obnovi-1', () => Promise.resolve(true))).toBe(true);
  });
});
