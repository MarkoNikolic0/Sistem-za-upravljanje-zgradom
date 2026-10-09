import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrijavaKvara } from './prijava-kvara';

describe('PrijavaKvara', () => {
  let component: PrijavaKvara;
  let fixture: ComponentFixture<PrijavaKvara>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrijavaKvara],
    }).compileComponents();

    fixture = TestBed.createComponent(PrijavaKvara);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
