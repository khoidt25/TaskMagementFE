import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Priority {
  priorityId?: number;
  priorityName: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PriorityService {

  //private readonly apiUrl = 'http://localhost:8081/api/priorities';

  private readonly apiUrl = `${environment.apiUrl}/priorities`;

  constructor(private http: HttpClient) {}

  findAll(): Observable<Priority[]> {
    return this.http.get<Priority[]>(this.apiUrl);
  }

  findById(id: number): Observable<Priority> {
    return this.http.get<Priority>(`${this.apiUrl}/${id}`);
  }

  create(priority: Priority): Observable<Priority> {
    return this.http.post<Priority>(this.apiUrl, priority);
  }

  update(id: number, priority: Priority): Observable<Priority> {
    return this.http.put<Priority>(
      `${this.apiUrl}/${id}`,
      priority
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

