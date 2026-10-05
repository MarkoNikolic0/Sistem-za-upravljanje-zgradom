import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoviZahtev } from './novi-zahtev';

describe('NoviZahtev', () => {
  let component: NoviZahtev;
  let fixture: ComponentFixture<NoviZahtev>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoviZahtev],
    }).compileComponents();

    fixture = TestBed.createComponent(NoviZahtev);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
