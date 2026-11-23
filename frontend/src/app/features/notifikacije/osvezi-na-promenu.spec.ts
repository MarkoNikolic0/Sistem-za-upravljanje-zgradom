import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject } from 'rxjs';
import type { Mock } from 'vitest';
import { VezaActions } from './notifikacija-store/notifikacije-actions';
import { GRUPISANJE_MS, osveziNaPromenu, PROVERA_MS } from './osvezi-na-promenu';

describe('osveziNaPromenu', () => {
  let akcije: Subject<Action>;
  let osvezi: Mock<(ids: number[]) => Promise<void>>;
  let dokument: Document;

  const pokreni = () => TestBed.runInInjectionContext(() => osveziNaPromenu('glasanje', osvezi));

  const javi = (id: number, vrsta: 'glasanje' | 'oglas' = 'glasanje') =>
    akcije.next(VezaActions.promena({ vrsta, id }));

  beforeEach(() => {
    vi.useFakeTimers();
    akcije = new Subject();
    osvezi = vi.fn(async () => undefined);
    TestBed.configureTestingModule({ providers: [provideMockActions(() => akcije)] });
    dokument = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    dokument.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('signale koji stignu zaredom grupiše u jedno osvežavanje, bez duplih id-jeva', async () => {
    pokreni();
    javi(1);
    javi(2);
    javi(1);
    await vi.advanceTimersByTimeAsync(GRUPISANJE_MS - 1);
    expect(osvezi).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(osvezi).toHaveBeenCalledExactlyOnceWith([1, 2]);
  });

  it('osvežava samo svoju vrstu promene', async () => {
    pokreni();
    javi(5, 'oglas');
    await vi.advanceTimersByTimeAsync(GRUPISANJE_MS);
    expect(osvezi).not.toHaveBeenCalled();
  });

  it('dok jedno osvežavanje traje ne pokreće drugo, a signale koji stignu u međuvremenu osveži posle', async () => {
    let zavrsi: () => void = () => undefined;
    osvezi.mockImplementationOnce(() => new Promise<void>((kraj) => (zavrsi = kraj)));
    pokreni();
    javi(1);
    await vi.advanceTimersByTimeAsync(GRUPISANJE_MS);
    javi(2);
    javi(3);
    await vi.advanceTimersByTimeAsync(GRUPISANJE_MS * 3);
    expect(osvezi).toHaveBeenCalledOnce();

    zavrsi();
    await vi.advanceTimersByTimeAsync(0);
    expect(osvezi).toHaveBeenCalledTimes(2);
    expect(osvezi).toHaveBeenLastCalledWith([2, 3]);
  });

  it('osvežava odmah i dok korisnik kuca, bez diranja polja', async () => {
    dokument.body.innerHTML = '<textarea></textarea>';
    const polje = dokument.querySelector('textarea')!;
    polje.focus();
    polje.value = 'Pišem komentar';
    pokreni();
    javi(1);
    await vi.advanceTimersByTimeAsync(GRUPISANJE_MS);

    expect(osvezi).toHaveBeenCalledExactlyOnceWith([1]);
    expect(dokument.activeElement).toBe(polje);
    expect(polje.value).toBe('Pišem komentar');
  });

  it('ne osvežava dok je otvoren dijalog', async () => {
    dokument.body.innerHTML = '<div role="alertdialog" aria-modal="true"></div>';
    pokreni();
    javi(1);
    await vi.advanceTimersByTimeAsync(GRUPISANJE_MS + PROVERA_MS * 2);
    expect(osvezi).not.toHaveBeenCalled();

    dokument.body.innerHTML = '';
    await vi.advanceTimersByTimeAsync(PROVERA_MS);
    expect(osvezi).toHaveBeenCalledExactlyOnceWith([1]);
  });

  it('zatvoren dijalog koji ostaje u stranici ne zaustavlja osvežavanje', async () => {
    dokument.body.innerHTML = '<p-dialog role="alertdialog"></p-dialog>';
    pokreni();
    javi(1);
    await vi.advanceTimersByTimeAsync(GRUPISANJE_MS);
    expect(osvezi).toHaveBeenCalledExactlyOnceWith([1]);
  });

  it('ne osvežava dok je kartica pregledača u pozadini', async () => {
    const vidljivost = vi.spyOn(dokument, 'visibilityState', 'get').mockReturnValue('hidden');
    pokreni();
    javi(1);
    await vi.advanceTimersByTimeAsync(GRUPISANJE_MS + PROVERA_MS * 2);
    expect(osvezi).not.toHaveBeenCalled();

    vidljivost.mockReturnValue('visible');
    await vi.advanceTimersByTimeAsync(PROVERA_MS);
    expect(osvezi).toHaveBeenCalledOnce();
  });

  it('greška u osvežavanju ne prekida sledeća osvežavanja', async () => {
    osvezi.mockRejectedValueOnce(new Error('mreža'));
    pokreni();
    javi(1);
    await vi.advanceTimersByTimeAsync(GRUPISANJE_MS);
    javi(2);
    await vi.advanceTimersByTimeAsync(GRUPISANJE_MS);
    expect(osvezi).toHaveBeenCalledTimes(2);
  });

  it('posle napuštanja stranice ne osvežava ni ono što je čekalo', async () => {
    dokument.body.innerHTML = '<div role="dialog" aria-modal="true"></div>';
    pokreni();
    javi(1);
    await vi.advanceTimersByTimeAsync(GRUPISANJE_MS);
    TestBed.resetTestingModule();
    dokument.body.innerHTML = '';
    await vi.advanceTimersByTimeAsync(PROVERA_MS * 2);
    akcije.next(VezaActions.promena({ vrsta: 'glasanje', id: 2 }));
    await vi.advanceTimersByTimeAsync(GRUPISANJE_MS);
    expect(osvezi).not.toHaveBeenCalled();
  });
});
