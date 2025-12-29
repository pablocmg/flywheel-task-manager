import React, { useState } from 'react';
import { api } from '../services/api';
import { CheckCircle, Circle, Clock, ExternalLink, Upload, FileText } from 'lucide-react';

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
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleStatusChange = async (newStatus: string) => {
        // User Story 3.1: Block closure if no evidence (Url or File)
        if (newStatus === 'Done' && !evidenceUrl && !selectedFile) {
            alert('Please provide evidence (URL or File) to mark as Done.');
            return;
        }

        setLoading(true);
        try {
            // If file is selected, pass that. If not, pass URL string.
            const evidence = selectedFile ? selectedFile : evidenceUrl;
            await api.updateTaskStatus(task.id, newStatus, evidence);
            onUpdate();
        } catch (err) {
            console.error(err);
            alert('Failed to update task');
        }
        setLoading(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            // Clear URL if file is selected to avoid confusion, or keep both? 
            // API logic prefers one 'evidence' field often, but our API handles string|File.
            // Let's rely on selectedFile precedence if both exist in my logic above.
        }
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-sm)', flexWrap: 'wrap' }}>
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
                    <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center', minWidth: '300px' }}>
                        {/* URL Input */}
                        <input
                            placeholder="Evidence URL..."
                            value={evidenceUrl}
                            onChange={(e) => setEvidenceUrl(e.target.value)}
                            disabled={!!selectedFile}
                            style={{
                                flex: 1,
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                borderBottom: '1px solid var(--text-muted)',
                                color: 'white',
                                padding: '4px'
                            }}
                        />

                        {/* File Upload */}
                        <label className="btn-icon" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Upload size={16} />
                            <input type="file" onChange={handleFileChange} style={{ display: 'none' }} />
                        </label>

                        {selectedFile && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FileText size={14} /> {selectedFile.name}
                                <button onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>×</button>
                            </span>
                        )}

                        {task.evidence_url && !selectedFile && (
                            <a href={task.evidence_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)' }}>
                                <ExternalLink size={16} />
                            </a>
                        )}
                    </div>
                ) : <div style={{ flex: 1 }}></div>}
            </div>

            {task.status === 'Waiting' && (
                <div style={{ fontSize: '0.85rem', color: 'var(--warning)', fontStyle: 'italic' }}>
                    * This task is waiting on dependencies from other nodes.
                </div>
            )}
        </div>
    );
};
