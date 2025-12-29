const API_URL = 'http://localhost:3000/api';

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
    createTask: async (data: any) => {
        const res = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create task');
        return res.json();
    },
    updateTaskStatus: async (id: string, status: string, evidence_url?: string) => {
        const res = await fetch(`${API_URL}/tasks/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, evidence_url }),
        });
        if (!res.ok) throw new Error('Failed to update task status');
        return res.json();
    }
};
