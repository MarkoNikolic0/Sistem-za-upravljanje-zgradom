import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrisustvoSastanka } from './prisustvo-sastanka';

describe('PrisustvoSastanka', () => {
  let component: PrisustvoSastanka;
  let fixture: ComponentFixture<PrisustvoSastanka>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrisustvoSastanka],
    }).compileComponents();

    fixture = TestBed.createComponent(PrisustvoSastanka);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
