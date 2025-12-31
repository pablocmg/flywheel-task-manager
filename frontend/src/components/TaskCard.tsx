import React, { useState } from 'react';
import { api } from '../services/api';
import { Circle, Clock, ExternalLink, Upload, FileText } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    description: string;
    status: 'Todo' | 'Doing' | 'Waiting' | 'Done';
    weight: number;
    priority_score: number;
    evidence_url?: string;
    objective_title?: string;
    impacted_node_count?: number;
    impacted_nodes?: string[]; // Array of Node IDs
    project_name?: string;
}

interface TaskCardProps {
    task: Task;
    onUpdate: () => void;
    nodeColors?: Record<string, string>; // Map ID -> Color
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate, nodeColors }) => {
    const [loading, setLoading] = useState(false);
    const [evidenceUrl, setEvidenceUrl] = useState(task.evidence_url || '');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleStatusChange = async (newStatus: string) => {
        // User Story 3.1: Block closure if no evidence (Url or File)
        if (newStatus === 'Done' && !evidenceUrl && !selectedFile) {
            alert('Por favor proporciona evidencia (URL o Archivo) para marcar como Hecho.');
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
            alert('Error al actualizar la tarea');
        }
        setLoading(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Done': return 'var(--state-success)';
            case 'Doing': return 'var(--state-warning)';
            case 'Waiting': return 'var(--state-neutral)';
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
            {/* Objective Breadcrumb */}
            {task.objective_title && (
                <div style={{
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)' }}></span>
                    {task.objective_title}
                    {task.project_name && (
                        <>
                            <span style={{ margin: '0 4px' }}>•</span>
                            <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{task.project_name}</span>
                        </>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{task.title}</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{task.description}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary-light)' }}>
                        {Number(task.priority_score || 0).toFixed(1)}
                    </div>
                </div>
            </div>

            {/* Badges & Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-sm)', flexWrap: 'wrap' }}>
                <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={loading}
                    style={{
                        background: 'var(--bg-card)',
                        color: 'white',
                        border: '1px solid var(--glass-border)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.9rem'
                    }}
                >
                    <option value="Todo">Pendiente</option>
                    <option value="Doing">En Progreso</option>
                    <option value="Waiting">Esperando</option>
                    <option value="Done">Hecho</option>
                </select>

                {/* Visual Indicators */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    {/* Dependency Badge */}
                    {task.impacted_node_count && task.impacted_node_count > 0 ? (
                        <div title={`${task.impacted_node_count} dependencias aguas abajo`} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--node-amber)', fontSize: '0.8rem' }}>
                            <div style={{ position: 'relative' }}>
                                <Circle size={14} />
                                <span style={{ position: 'absolute', top: '-6px', right: '-6px', fontSize: '0.6rem', fontWeight: 'bold' }}>{task.impacted_node_count}</span>
                            </div>
                            <small>Impacto</small>
                        </div>
                    ) : null}

                    {/* Bridge Links (Nodes Impacted) */}
                    {task.impacted_nodes && nodeColors && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {task.impacted_nodes.map(nodeId => (
                                <div key={nodeId} title="Impacta Nodo" style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: nodeColors[nodeId] || 'gray',
                                    boxShadow: `0 0 5px ${nodeColors[nodeId] || 'gray'}`
                                }}></div>
                            ))}
                        </div>
                    )}
                </div>

                {task.status === 'Done' || task.status === 'Doing' ? (
                    <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center', minWidth: '300px', marginLeft: 'auto' }}>
                        {/* URL Input */}
                        <input
                            placeholder="URL de evidencia..."
                            value={evidenceUrl}
                            onChange={(e) => setEvidenceUrl(e.target.value)}
                            disabled={!!selectedFile}
                            style={{
                                flex: 1,
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                borderBottom: '1px solid var(--text-muted)',
                                color: 'white',
                                padding: '4px',
                                fontSize: '0.9rem'
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
                <div style={{ fontSize: '0.85rem', color: 'var(--state-warning)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} /> Esperando dependencias de otros nodos.
                </div>
            )}
        </div>
    );
};
