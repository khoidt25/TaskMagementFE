import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskAssignmentComponent } from './task-assignment.component';

describe('TaskAssignmentComponent', () => {
  let component: TaskAssignmentComponent;
  let fixture: ComponentFixture<TaskAssignmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskAssignmentComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskAssignmentComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
