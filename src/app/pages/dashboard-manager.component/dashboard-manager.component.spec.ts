import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardManagerCompoent } from './dashboard-manager.compoent';

describe('DashboardManagerCompoent', () => {
  let component: DashboardManagerCompoent;
  let fixture: ComponentFixture<DashboardManagerCompoent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardManagerCompoent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardManagerCompoent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
