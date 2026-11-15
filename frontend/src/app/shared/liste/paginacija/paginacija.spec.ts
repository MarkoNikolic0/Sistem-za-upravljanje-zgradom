import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Paginacija } from './paginacija';

describe('Paginacija', () => {
  let fixture: ComponentFixture<Paginacija>;
  let element: HTMLElement;

  async function napravi(strana: number, ukupno: number, poStrani = 10) {
    fixture = TestBed.createComponent(Paginacija);
    fixture.componentRef.setInput('strana', strana);
    fixture.componentRef.setInput('ukupno', ukupno);
    fixture.componentRef.setInput('poStrani', poStrani);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  const brojevi = () => [...element.querySelectorAll<HTMLButtonElement>('.p-paginator-page')];

  it('ne prikazuje se kad sve stane na jednu stranu', async () => {
    await napravi(1, 10);
    expect(element.querySelector('p-paginator')).toBeNull();
  });

  it('prikazuje strane i označava trenutnu', async () => {
    await napravi(2, 25);
    expect(brojevi().map((b) => b.textContent?.trim())).toEqual(['1', '2', '3']);
    expect(brojevi()[1].getAttribute('aria-current')).toBe('page');
  });

  it('klik na stranu javlja njen broj, počev od 1', async () => {
    await napravi(1, 25);
    const izabrano: number[] = [];
    fixture.componentInstance.promena.subscribe((strana) => izabrano.push(strana));
    brojevi()[2].click();
    expect(izabrano).toEqual([3]);
  });
});
