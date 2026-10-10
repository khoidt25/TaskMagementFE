
import { Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login';
import { TaskAssignmentComponent } from './pages/task-assignment.component/task-assignment.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard')
        .then(m => m.DashboardComponent)
  },
  {
    path: 'tasks',
    component: TaskAssignmentComponent
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
