import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NovoGlasanje } from './novo-glasanje';

describe('NovoGlasanje', () => {
  let component: NovoGlasanje;
  let fixture: ComponentFixture<NovoGlasanje>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NovoGlasanje],
    }).compileComponents();

    fixture = TestBed.createComponent(NovoGlasanje);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
