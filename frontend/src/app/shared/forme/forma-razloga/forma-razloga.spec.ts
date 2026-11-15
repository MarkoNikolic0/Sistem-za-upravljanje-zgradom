import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormaRazloga, MAKS_RAZLOGA } from './forma-razloga';

describe('FormaRazloga', () => {
  let fixture: ComponentFixture<FormaRazloga>;
  let element: HTMLElement;
  let poslato: string[];

  async function napravi(ulazi: Record<string, unknown> = {}) {
    fixture = TestBed.createComponent(FormaRazloga);
    fixture.componentRef.setInput('oznaka', 'Razlog odbijanja');
    fixture.componentRef.setInput('natpis', 'Odbij');
    for (const [ime, vrednost] of Object.entries(ulazi)) {
      fixture.componentRef.setInput(ime, vrednost);
    }
    poslato = [];
    fixture.componentInstance.posalji.subscribe((tekst) => poslato.push(tekst));
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  const polje = () => element.querySelector('textarea')!;
  const greska = () => element.querySelector('small');
  async function upisiIPosalji(tekst: string) {
    polje().value = tekst;
    polje().dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
  }

  it('obavezan razlog: prazno i sami razmaci prikazuju grešku i ne šalju', async () => {
    await napravi();
    await upisiIPosalji('   ');
    expect(poslato).toEqual([]);
    expect(greska()?.textContent).toContain('Napiši razlog.');
    expect(polje().getAttribute('aria-invalid')).toBe('true');
    expect(polje().getAttribute('aria-describedby')).toBe(greska()!.id);
  });

  it('šalje razlog bez razmaka na krajevima i briše grešku', async () => {
    await napravi();
    await upisiIPosalji('');
    await upisiIPosalji('  Nije kvar zgrade.  ');
    expect(poslato).toEqual(['Nije kvar zgrade.']);
    expect(greska()).toBeNull();
  });

  it('neobavezan razlog može prazan', async () => {
    await napravi({ obavezan: false });
    expect(element.querySelector('label')?.textContent).toContain('(nije obavezno)');
    await upisiIPosalji('');
    expect(poslato).toEqual(['']);
  });

  it('predug razlog se ne šalje', async () => {
    await napravi();
    await upisiIPosalji('a'.repeat(MAKS_RAZLOGA + 1));
    expect(poslato).toEqual([]);
  });

  it('pomoć je povezana sa poljem, a dugme se isključuje dok traje slanje', async () => {
    await napravi({ pomoc: 'Stanar vidi razlog.', slanje: true });
    const pomoc = element.querySelector('p')!;
    expect(polje().getAttribute('aria-describedby')).toBe(pomoc.id);
    expect(element.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true);
  });

  it('odustani javlja roditelju', async () => {
    await napravi();
    const odustao = vi.fn();
    fixture.componentInstance.odustani.subscribe(odustao);
    element.querySelector<HTMLButtonElement>('button[type=button]')!.click();
    expect(odustao).toHaveBeenCalledOnce();
  });
});
