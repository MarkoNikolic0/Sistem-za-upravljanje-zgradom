import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ZapisnikSastanka } from './zapisnik-sastanka';

describe('ZapisnikSastanka', () => {
  let component: ZapisnikSastanka;
  let fixture: ComponentFixture<ZapisnikSastanka>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZapisnikSastanka],
    }).compileComponents();

    fixture = TestBed.createComponent(ZapisnikSastanka);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
