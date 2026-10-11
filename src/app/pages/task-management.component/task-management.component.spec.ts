import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskManagementCompoenent } from './task-management.component';

describe('TaskManagementCompoenent', () => {
  let component: TaskManagementCompoenent;
  let fixture: ComponentFixture<TaskManagementCompoenent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskManagementCompoenent],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskManagementCompoenent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
