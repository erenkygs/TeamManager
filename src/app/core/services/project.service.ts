import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectService {
    constructor(private http: HttpClient) { }

    getProject(id: number) {
        return this.http.get<any>(`${environment.apiUrl}/api/projects/${id}`);
    }

    getTasks(projectId: number) {
        return this.http.get<any[]>(`${environment.apiUrl}/api/Tasks/project/${projectId}`);
    }

    createTask(payload: any) {
        return this.http.post<any>(`${environment.apiUrl}/api/Tasks`, payload);
    }

    updateStatus(taskId: number, status: string) {
        return this.http.put(
            `${environment.apiUrl}/api/Tasks/${taskId}/status`,
            { status }
        );
    }

    assignTask(taskId: number, userId: number) {
        return this.http.put(
            `${environment.apiUrl}/api/Tasks/${taskId}/assign/${userId}`,
            null
        );
    }
    getUsers() {
        return this.http.get<any[]>(`${environment.apiUrl}/api/users`);
    }
}
