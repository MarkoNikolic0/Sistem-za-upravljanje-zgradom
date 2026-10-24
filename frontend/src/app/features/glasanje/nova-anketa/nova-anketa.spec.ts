import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NovaAnketa } from './nova-anketa';

describe('NovaAnketa', () => {
  let component: NovaAnketa;
  let fixture: ComponentFixture<NovaAnketa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NovaAnketa],
    }).compileComponents();

    fixture = TestBed.createComponent(NovaAnketa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
