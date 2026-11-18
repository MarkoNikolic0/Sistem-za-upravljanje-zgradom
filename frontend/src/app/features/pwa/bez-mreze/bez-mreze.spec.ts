import { TestBed } from '@angular/core/testing';
import { BezMreze } from './bez-mreze';

describe('BezMreze', () => {
  afterEach(() => vi.restoreAllMocks());

  it('poruka se pojavi bez mreže i nestane kad se veza vrati', async () => {
    const fixture = TestBed.createComponent(BezMreze);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.getAttribute('role')).toBe('status');
    expect(element.textContent).not.toContain('Nema mreže.');

    window.dispatchEvent(new Event('offline'));
    await fixture.whenStable();
    expect(element.textContent).toContain('Nema mreže.');

    window.dispatchEvent(new Event('online'));
    await fixture.whenStable();
    expect(element.textContent).not.toContain('Nema mreže.');
  });

  it('poruka je odmah tu kad se aplikacija otvori bez mreže', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const fixture = TestBed.createComponent(BezMreze);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nema mreže.');
  });
});
