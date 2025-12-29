import React, { useState } from 'react';
import { api } from '../services/api';
import { CheckCircle, Circle, Clock, ExternalLink } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    description: string;
    status: 'Todo' | 'Doing' | 'Waiting' | 'Done';
    weight: number;
    priority_score: number;
    evidence_url?: string;
}

interface TaskCardProps {
    task: Task;
    onUpdate: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [evidenceUrl, setEvidenceUrl] = useState(task.evidence_url || '');

    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === 'Done' && !evidenceUrl) {
            alert('Please provide an evidence URL to mark as Done.');
            return;
        }

        setLoading(true);
        try {
            await api.updateTaskStatus(task.id, newStatus, evidenceUrl);
            onUpdate();
        } catch (err) {
            console.error(err);
            alert('Failed to update task');
        }
        setLoading(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Done': return 'var(--success)';
            case 'Doing': return 'var(--warning)';
            case 'Waiting': return 'var(--text-muted)';
            default: return 'var(--text-secondary)';
        }
    };

    return (
        <div className="glass-panel" style={{
            marginBottom: 'var(--space-md)',
            padding: 'var(--space-md)',
            borderLeft: `4px solid ${getStatusColor(task.status)}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{task.title}</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{task.description}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary-light)' }}>
                        {Number(task.priority_score || 0).toFixed(1)}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>Priority Score</small>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
                <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={loading}
                    style={{
                        background: 'var(--bg-card)',
                        color: 'white',
                        border: '1px solid var(--text-muted)',
                        padding: '4px 8px',
                        borderRadius: '4px'
                    }}
                >
                    <option value="Todo">Todo</option>
                    <option value="Doing">Doing</option>
                    <option value="Waiting">Waiting</option>
                    <option value="Done">Done</option>
                </select>

                {task.status === 'Done' || task.status === 'Doing' ? (
                    <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                        <input
                            placeholder="Evidence URL (Required for Done)"
                            value={evidenceUrl}
                            onChange={(e) => setEvidenceUrl(e.target.value)}
                            style={{
                                flex: 1,
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                borderBottom: '1px solid var(--text-muted)',
                                color: 'white',
                                padding: '4px'
                            }}
                        />
                        {task.evidence_url && (
                            <a href={task.evidence_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)' }}>
                                <ExternalLink size={16} />
                            </a>
                        )}
                    </div>
                ) : <div style={{ flex: 1 }}></div>}
            </div>
        </div>
    );
};
