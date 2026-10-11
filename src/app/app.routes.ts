import { Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login';
import { TaskAssignmentComponent } from './pages/task-assignment.component/task-assignment.component';
import { TaskManagementCompoenent } from './pages/task-management.component/task-management.component';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard')
        .then(m => m.DashboardComponent)
  },
  {
    path: 'tasks',
    canActivate: [authGuard],
    component: TaskAssignmentComponent
  },
  {
    path: 'task-management',
    canActivate: [authGuard],
    component: TaskManagementCompoenent
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
