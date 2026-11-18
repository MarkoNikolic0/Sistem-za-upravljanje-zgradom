import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { NovaVerzija } from './nova-verzija';

describe('NovaVerzija', () => {
  it('poruka se prikazuje i kad stigne pre nego što se toast učita', async () => {
    TestBed.configureTestingModule({ providers: [MessageService] });
    const fixture = TestBed.createComponent(NovaVerzija);
    fixture.componentRef.setInput('poruka', {
      naslov: 'Aplikacija mora ponovo da se učita.',
      opis: 'Deo aplikacije više nije dostupan na uređaju.',
    });
    await fixture.whenStable();
    expect(document.body.textContent).toContain('Aplikacija mora ponovo da se učita.');
    expect(document.body.textContent).toContain('Osveži');
  });
});
