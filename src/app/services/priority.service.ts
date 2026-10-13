import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  private readonly apiUrl = 'http://localhost:8081/api/priorities';

  constructor(private http: HttpClient) {}

  // Lấy danh sách mức độ ưu tiên
  getAll(): Observable<Priority[]> {
    return this.http.get<Priority[]>(this.apiUrl);
  }

  // Lấy mức độ ưu tiên theo ID
  getById(id: number): Observable<Priority> {
    return this.http.get<Priority>(`${this.apiUrl}/${id}`);
  }

  // Thêm mức độ ưu tiên
  create(priority: Partial<Priority>): Observable<Priority> {
    return this.http.post<Priority>(this.apiUrl, priority);
  }

  // Cập nhật mức độ ưu tiên
  update(
    id: number,
    priority: Partial<Priority>
  ): Observable<Priority> {
    return this.http.put<Priority>(
      `${this.apiUrl}/${id}`,
      priority
    );
  }

  // Xóa mức độ ưu tiên
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
