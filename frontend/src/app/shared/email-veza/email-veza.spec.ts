import { TestBed } from '@angular/core/testing';
import { EmailVeza } from './email-veza';

describe('EmailVeza', () => {
  const prikazi = async (adresa: string) => {
    const fixture = TestBed.createComponent(EmailVeza);
    fixture.componentRef.setInput('adresa', adresa);
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
  };

  it('nudi prelom pre @, a link vodi na celu adresu', async () => {
    const veza = await prikazi('jovana.ilic@primer.rs');
    expect(veza.getAttribute('href')).toBe('mailto:jovana.ilic@primer.rs');
    expect(veza.innerHTML).toBe('jovana.ilic<wbr>@primer.rs');
    expect(veza.textContent).toBe('jovana.ilic@primer.rs');
  });

  it('adresa bez @ ostaje cela', async () => {
    const veza = await prikazi('bez-domena');
    expect(veza.textContent).toBe('bez-domena');
  });
});
