
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

//import { Project, ProjectRequest } from '../models/project.model';

export interface Project {
  projectId: number;
  projectName: string;
}

export interface ProjectRequest {
  projectName: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {

  private readonly apiUrl = 'http://localhost:8081/api/projects';

  constructor(private http: HttpClient) {}

//   // Lấy toàn bộ Project
//   getAll(): Observable<Project[]> {
//     return this.http.get<Project[]>(this.apiUrl);
//   }

  // Lấy danh sách dùng cho dropdown
  getOptions(): Observable<Project[]> {
    return this.http.get<Project[]>(
      `${this.apiUrl}/options`
    );
  }

//   // Lấy chi tiết Project theo ID
//   getById(projectId: number): Observable<Project> {
//     return this.http.get<Project>(
//       `${this.apiUrl}/${projectId}`
//     );
//   }

//   // Tạo Project
//   create(request: ProjectRequest): Observable<Project> {
//     return this.http.post<Project>(
//       this.apiUrl,
//       request
//     );
//   }

//   // Cập nhật Project
//   update(
//     projectId: number,
//     request: ProjectRequest
//   ): Observable<Project> {
//     return this.http.put<Project>(
//       `${this.apiUrl}/${projectId}`,
//       request
//     );
//   }

//   // Xóa Project
//   delete(projectId: number): Observable<void> {
//     return this.http.delete<void>(
//       `${this.apiUrl}/${projectId}`
//     );
//   }
}
