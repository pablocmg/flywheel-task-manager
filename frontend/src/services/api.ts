const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = {
    // Nodes
    getNodes: async () => {
        const res = await fetch(`${API_URL}/nodes`);
        if (!res.ok) throw new Error('Failed to fetch nodes');
        return res.json();
    },
    createNode: async (data: any) => {
        const res = await fetch(`${API_URL}/nodes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create node');
        return res.json();
    },
    updateNode: async (id: string, data: any) => {
        const res = await fetch(`${API_URL}/nodes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update node');
        return res.json();
    },
    deleteNode: async (id: string) => {
        const res = await fetch(`${API_URL}/nodes/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete node');
        return res.json();
    },

    // Objectives
    getObjectives: async (nodeId: string) => {
        const res = await fetch(`${API_URL}/objectives/node/${nodeId}`);
        if (!res.ok) throw new Error('Failed to fetch objectives');
        return res.json();
    },
    createObjective: async (data: any) => {
        const res = await fetch(`${API_URL}/objectives`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create objective');
        return res.json();
    },
    updateObjective: async (id: string, data: any) => {
        const res = await fetch(`${API_URL}/objectives/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update objective');
        return res.json();
    },
    deleteObjective: async (id: string) => {
        const res = await fetch(`${API_URL}/objectives/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete objective');
        return res.json();
    },
    updateObjectiveOrder: async (id: string, order: number) => {
        const res = await fetch(`${API_URL}/objectives/${id}/order`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ display_order: order }),
        });
        if (!res.ok) throw new Error('Failed to update objective order');
        return res.json();
    },

    // Objective Groups
    getObjectiveGroups: async (nodeId: string) => {
        const res = await fetch(`${API_URL}/objective-groups/node/${nodeId}`);
        if (!res.ok) throw new Error('Failed to fetch objective periods');
        return res.json();
    },
    createObjectiveGroup: async (data: any) => {
        const res = await fetch(`${API_URL}/objective-groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create objective period');
        return res.json();
    },
    updateObjectiveGroup: async (id: string, data: any) => {
        const res = await fetch(`${API_URL}/objective-groups/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update objective period');
        return res.json();
    },
    deleteObjectiveGroup: async (id: string) => {
        const res = await fetch(`${API_URL}/objective-groups/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete objective period');
        return res.json();
    },
    replicateObjectiveGroup: async (id: string) => {
        const res = await fetch(`${API_URL}/objective-groups/${id}/replicate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Failed to replicate objective period');
        return res.json();
    },
    deleteAllObjectiveGroupsByNode: async (nodeId: string) => {
        const res = await fetch(`${API_URL}/objective-groups/node/${nodeId}/all`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete all objective periods');
        return res.json();
    },
    replicateAllObjectiveGroupsFromNode: async (nodeId: string) => {
        const res = await fetch(`${API_URL}/objective-groups/node/${nodeId}/replicate-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Failed to replicate all objective periods');
        return res.json();
    },

    // Key Results
    createKeyResult: async (data: any) => {
        const res = await fetch(`${API_URL}/key-results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create key result');
        return res.json();
    },
    updateKeyResult: async (id: string, data: any) => {
        const res = await fetch(`${API_URL}/key-results/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update key result');
        return res.json();
    },
    deleteKeyResult: async (id: string) => {
        const res = await fetch(`${API_URL}/key-results/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete key result');
        return res.json();
    },
    updateKeyResultOrder: async (id: string, order: number) => {
        const res = await fetch(`${API_URL}/key-results/${id}/order`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ display_order: order }),
        });
        if (!res.ok) throw new Error('Failed to update key result order');
        return res.json();
    },

    // Tasks
    getTasksByObjective: async (objectiveId: string) => {
        const res = await fetch(`${API_URL}/tasks/objective/${objectiveId}`);
        if (!res.ok) throw new Error('Failed to fetch tasks');
        return res.json();
    },
    getTasksByWeek: async (weekNumber: number) => {
        const res = await fetch(`${API_URL}/tasks/week/${weekNumber}`);
        if (!res.ok) throw new Error('Failed to fetch tasks');
        return res.json();
    },
    getAllTasks: async () => {
        const res = await fetch(`${API_URL}/tasks`);
        if (!res.ok) throw new Error('Failed to fetch all tasks');
        return res.json();
    },
    getTasksByProject: async (projectId: string) => {
        const res = await fetch(`${API_URL}/tasks/project/${projectId}`);
        if (!res.ok) throw new Error('Failed to fetch tasks by project');
        return res.json();
    },
    createTask: async (taskData: any) => {
        const res = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData),
        });
        if (!res.ok) throw new Error('Failed to create task');
        return res.json();
    },
    updateTask: async (id: string, taskData: any) => {
        const res = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData),
        });
        if (!res.ok) throw new Error('Failed to update task');
        return res.json();
    },
    updateTaskStatus: async (id: string, status: string, evidence?: string | File) => {
        const formData = new FormData();
        formData.append('status', status);
        if (evidence) {
            if (typeof evidence === 'string') {
                formData.append('evidence_url', evidence);
            } else {
                formData.append('evidence', evidence);
            }
        }

        const res = await fetch(`${API_URL}/tasks/${id}/status`, {
            method: 'PATCH',
            // headers: { 'Content-Type': 'multipart/form-data' }, // Fetch automatically sets content-type for FormData
            body: formData,
        });
        if (!res.ok) throw new Error('Failed to update task status');
        return res.json();
    },
    updateTaskPriority: async (id: string, new_priority_score: number, reason: string) => {
        const res = await fetch(`${API_URL}/tasks/${id}/priority`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_priority_score, reason }),
        });
        if (!res.ok) throw new Error('Failed to update task priority');
        return res.json();
    },
    deleteTask: async (id: string) => {
        const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete task');
        return res.json();
    },
    getTaskDependencies: async (id: string) => {
        const res = await fetch(`${API_URL}/tasks/${id}/dependencies?t=${Date.now()}`);
        if (!res.ok) throw new Error('Failed to fetch task dependencies');
        return res.json();
    },
    updateTaskDependencies: async (id: string, dependencies: { depends_on: string[], enables: string[] }) => {
        const res = await fetch(`${API_URL}/tasks/${id}/dependencies`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dependencies),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to update task dependencies');
        }
        return res.json();
    },

    // Interactions
    getInteractions: async () => {
        const res = await fetch(`${API_URL}/interactions`);
        if (!res.ok) throw new Error('Failed to fetch interactions');
        return res.json();
    },
    createInteraction: async (data: any) => {
        const res = await fetch(`${API_URL}/interactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create interaction');
        return res.json();
    },
    deleteInteraction: async (id: string) => {
        const res = await fetch(`${API_URL}/interactions/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete interaction');
        return res.json();
    },

    // Projects
    getProjects: async () => {
        const res = await fetch(`${API_URL}/projects`);
        if (!res.ok) throw new Error('Failed to fetch projects');
        return res.json();
    },
    getProjectsByObjective: async (objectiveId: string) => {
        const res = await fetch(`${API_URL}/projects/objective/${objectiveId}`);
        if (!res.ok) throw new Error('Failed to fetch projects for objective');
        return res.json();
    },
    createProject: async (data: any) => {
        console.log('[api.createProject] Sending data:', data);
        const res = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        console.log('[api.createProject] Response status:', res.status);
        if (!res.ok) {
            const errorText = await res.text();
            console.error('[api.createProject] Error response:', errorText);
            throw new Error(`Failed to create project: ${errorText}`);
        }
        const result = await res.json();
        console.log('[api.createProject] Success result:', result);
        return result;
    },
    updateProject: async (id: string, data: any) => {
        const res = await fetch(`${API_URL}/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update project');
        return res.json();
    },
    deleteProject: async (id: string) => {
        const res = await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete project');
        return res.json();
    },

    // Assignees
    getAssignees: async () => {
        const res = await fetch(`${API_URL}/assignees`);
        if (!res.ok) throw new Error('Failed to fetch assignees');
        return res.json();
    },
    getOrCreateAssignee: async (name: string) => {
        const res = await fetch(`${API_URL}/assignees/get-or-create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error('Failed to get/create assignee');
        return res.json();
    },

    // Settings
    getProjectSettings: async () => {
        const res = await fetch(`${API_URL}/settings`);
        if (!res.ok) throw new Error('Failed to fetch project settings');
        return res.json();
    },
    updateProjectSettings: async (settings: { project_prefix: string }) => {
        const res = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
        });
        if (!res.ok) throw new Error('Failed to update project settings');
        return res.json();
    }
};
