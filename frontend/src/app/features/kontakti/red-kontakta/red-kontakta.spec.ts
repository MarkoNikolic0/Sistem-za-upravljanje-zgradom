import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RedKontakta } from './red-kontakta';

describe('RedKontakta', () => {
  let component: RedKontakta;
  let fixture: ComponentFixture<RedKontakta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RedKontakta],
    }).compileComponents();

    fixture = TestBed.createComponent(RedKontakta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
