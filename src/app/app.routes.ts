import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { ProfileComponent } from './pages/profile/profile';
export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () =>
            import('./pages/login/login').then(m => m.LoginComponent)
    },
    {
        path: '',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./pages/dashboard/dashboard').then(m => m.DashboardComponent)
    },
    {
        path: 'projects',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./pages/projects/projects').then(m => m.ProjectsComponent)
    },
    {
        path: 'projects/create',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./pages/projects/create-project').then(m => m.CreateProjectComponent)
    },
    {
        path: 'projects/:id',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./pages/projects/project-detail.component')
                .then(m => m.ProjectDetailComponent)
    },
    {
        path: 'team',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/team/team').then(m => m.TeamComponent)
    },
    {
        path: 'team/create',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/team/team-create').then(m => m.TeamCreateComponent)
    },
    { path: 'profile', component: ProfileComponent },
    {
        path: 'my-tasks',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./pages/my-tasks/my-tasks').then(m => m.MyTasksComponent)
    },
    {
        path: 'wiki',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/wiki/wiki-list').then(m => m.WikiListComponent)
    },
    {
        path: 'wiki/new',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/wiki/wiki-edit').then(m => m.WikiEditComponent)
    },
    {
        path: 'wiki/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/wiki/wiki-detail').then(m => m.WikiDetailComponent)
    },
    {
        path: 'wiki/:id/edit',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/wiki/wiki-edit').then(m => m.WikiEditComponent)
    },
    { path: '**', redirectTo: '' }
];