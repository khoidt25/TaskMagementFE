import { TestBed } from '@angular/core/testing';
import { Priority } from './priority';

describe('Priority', () => {
  let service: Priority;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Priority);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
