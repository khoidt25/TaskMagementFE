import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Priority {
  priorityId: number;
  priorityCode: string;
  priorityName: string;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PriorityService {

  //private readonly apiUrl = 'http://localhost:8081/api/priorities';

  private readonly apiUrl = `${environment.apiUrl}/priorities`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Priority[]> {
    return this.http.get<Priority[]>(this.apiUrl);
  }

  getById(id: number): Observable<Priority> {
    return this.http.get<Priority>(`${this.apiUrl}/${id}`);
  }

  create(priority: Partial<Priority>): Observable<Priority> {
    return this.http.post<Priority>(this.apiUrl, priority);
  }

  update(
    id: number,
    priority: Partial<Priority>
  ): Observable<Priority> {
    return this.http.put<Priority>(
      `${this.apiUrl}/${id}`,
      priority
    );
  }
   
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
