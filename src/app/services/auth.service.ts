
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface UserInfo {
  userId: number;
  username: string;
  roles: string[];
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  user: UserInfo;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
 
  //private readonly apiUrl = 'http://localhost:8081/api/auth';

  private readonly apiUrl = `${environment.apiUrl}/auth`;
  
  private readonly tokenKey = 'accessToken';
  private readonly userKey = 'user';

  private readonly isBrowser: boolean;

  private readonly userSubject =
    new BehaviorSubject<UserInfo | null>(null);

  readonly user$ = this.userSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.restoreUser();
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, data)
      .pipe(
        tap(response => {
          if (!this.isBrowser) return;

          localStorage.setItem(
            this.tokenKey,
            response.accessToken
          );

          localStorage.setItem(
            this.userKey,
            JSON.stringify(response.user)
          );

          localStorage.setItem(
            'userId',
            String(response.user.userId)
          );

          localStorage.setItem(
            'username',
            response.user.username
          );

          localStorage.setItem(
            'roles',
            JSON.stringify(response.user.roles)
          );

          this.userSubject.next(response.user);
        })
      );
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;

    return localStorage.getItem(this.tokenKey);
  }

  getUser(): UserInfo | null {
    if (!this.isBrowser) {
      return this.userSubject.value;
    }

    const value = localStorage.getItem(this.userKey);

    if (!value) return null;

    try {
      return JSON.parse(value) as UserInfo;
    } catch {
      return null;
    }
  }

  getUsername(): string | null {
    const user = this.getUser();

    if (user?.username) {
      return user.username;
    }

    if (!this.isBrowser) return null;

    return localStorage.getItem('username');
  }

  getUserId(): number | null {
    const user = this.getUser();

    if (user?.userId != null) {
      return user.userId;
    }

    if (!this.isBrowser) return null;

    const value = localStorage.getItem('userId');

    return value ? Number(value) : null;
  }

  getRoles(): string[] {
    const user = this.getUser();

    if (user?.roles) {
      return user.roles;
    }

    if (!this.isBrowser) return [];

    try {
      return JSON.parse(
        localStorage.getItem('roles') || '[]'
      ) as string[];
    } catch {
      return [];
    }
  }

  restoreUser(): void {
    if (!this.isBrowser) return;

    const user = this.getUser();

    if (user) {
      this.userSubject.next(user);
      return;
    }

    const username = localStorage.getItem('username');
    const userId = localStorage.getItem('userId');

    if (username && userId) {
      let roles: string[] = [];

      try {
        roles = JSON.parse(
          localStorage.getItem('roles') || '[]'
        ) as string[];
      } catch {
        roles = [];
      }

      this.userSubject.next({
        userId: Number(userId),
        username,
        roles
      });
    }
  }

  setUser(user: UserInfo): void {
    if (this.isBrowser) {
      localStorage.setItem(
        this.userKey,
        JSON.stringify(user)
      );

      localStorage.setItem('userId', String(user.userId));
      localStorage.setItem('username', user.username);
      localStorage.setItem('roles', JSON.stringify(user.roles));
    }

    this.userSubject.next(user);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  getMe(): Observable<UserInfo> {
    return this.http
      .get<UserInfo>(`${this.apiUrl}/me`)
      .pipe(
        tap(user => this.setUser(user))
      );
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      localStorage.removeItem('roles');
    }

    this.userSubject.next(null);
  }
}
