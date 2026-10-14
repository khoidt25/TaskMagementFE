import { Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login';
import { TaskAssignmentComponent } from './pages/task-assignment.component/task-assignment.component';
import { TaskManagementCompoenent } from './pages/task-management.component/task-management.component';
import { authGuard } from './guards/auth-guard';
import { ProjectsComponent } from './pages/projects.component/projects.component';
import { CustomersComponent } from './pages/customers.component/customers.component';
import { UsersComponent } from './pages/users.component/users.component';
import { DashboardMemberComponent } from './pages/dashboard-member.component/dashboard-member.component';
import { DashboardManagerCompoent } from './pages/dashboard-manager.component/dashboard-manager.compoent';
import { TaskManagerComponent } from './pages/task-manager.component/task-manager.component';
// import { DashboardManager } from './pages/dashboard-manager/dashboard-manager';

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
    path: 'projects',
    canActivate: [authGuard],
    component: ProjectsComponent
  }, 
  {
    path: 'customers',
    canActivate: [authGuard],
    component: CustomersComponent
  },
  {
    path: 'users',
    canActivate: [authGuard],
    component: UsersComponent
  },
  {
    path: 'manager',
    canActivate: [authGuard],
    component: DashboardManagerCompoent
  },
  {
    path: 'member',
    canActivate: [authGuard],
    component: DashboardMemberComponent
  },
  {
    path: 'task-manager',
    canActivate: [authGuard],
    component: TaskManagerComponent
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
