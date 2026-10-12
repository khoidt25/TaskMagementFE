import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';
import { Observable } from 'rxjs';

export type ProjectStatus = 'ACTIVE' | 'INACTIVE';

export interface Project {
  projectId: number;
  projectCode: string;
  projectName: string;
  description?: string | null;
  projectStatus: ProjectStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ProjectPage {
  content: Project[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ProjectRequest {
  projectCode: string;
  projectName: string;
  description: string;
  projectStatus: ProjectStatus;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8081/api/projects';

  getProjects(
    page = 0,
    size = 10,
    keyword = '',
    status = ''
  ): Observable<ProjectPage> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (keyword.trim()) {
      params = params.set('keyword', keyword.trim());
    }

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<ProjectPage>(this.apiUrl, {
      params,
      withCredentials: true
    });
  }

  getProjectById(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }

  createProject(data: ProjectRequest): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, data, {
      withCredentials: true
    });
  }

  updateProject(
    id: number,
    data: ProjectRequest
  ): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/${id}`, data, {
      withCredentials: true
    });
  }

  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }

  getProjectOptions(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/options`, {
      withCredentials: true
    });
  }
}