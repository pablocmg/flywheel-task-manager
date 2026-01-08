import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, Calendar } from 'lucide-react';

interface TaskEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: any; // Using any for flexibility or reuse Task interface
    onUpdate: () => void;
    projects: string[]; // List of project names or full objects if needed
}

// Full Detail Card Modal
export const TaskEditModal: React.FC<TaskEditModalProps> = ({ isOpen, onClose, task, onUpdate, projects }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: '',
        priority_score: 0,
        objective_id: '',
        target_date: '',
        evidence_url: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title || '',
                description: task.description || '',
                status: task.status || 'Backlog',
                priority_score: task.priority_score || 0,
                objective_id: task.objective_id || '',
                target_date: task.target_date ? task.target_date.split('T')[0] : '',
                evidence_url: task.evidence_url || ''
            });
        }
    }, [task]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.updateTask(task.id, formData);

            // If status changed here, we should ensure consistency
            if (task.status !== formData.status) {
                await api.updateTaskStatus(task.id, formData.status);
            }

            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating task:', error);
            alert('Error al actualizar tarea');
        }
        setLoading(false);
    };

    if (!isOpen || !task) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', // Darker backdrop
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="glass-panel" style={{
                width: '800px', // Wider modal
                maxWidth: '90vw',
                height: '80vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-panel)',
                position: 'relative',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: 'var(--space-md)',
                    borderBottom: '1px solid var(--glass-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            {/* Project Badge */}
                            {task.project_name && (
                                <span style={{ background: 'rgba(96, 165, 250, 0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                    {task.project_name}
                                </span>
                            )}
                            {/* Objective Label */}
                            {task.objective_title && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}>
                                    • {task.objective_title}
                                </span>
                            )}
                        </div>
                        <input
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                outline: 'none'
                            }}
                            placeholder="Título de la tarea"
                            required
                        />
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Body - Grid Layout */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                    {/* Main Content (Left) */}
                    <div style={{ flex: 2, padding: 'var(--space-lg)', borderRight: '1px solid var(--glass-border)', overflowY: 'auto' }}>
                        <form id="taskForm" onSubmit={handleSubmit}>
                            <h4 style={{ color: 'var(--text-secondary)', marginTop: 0 }}>Descripción</h4>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                style={{
                                    width: '100%', minHeight: '200px',
                                    background: 'rgba(255,255,255,0.05)', border: 'none',
                                    color: 'var(--text-primary)', borderRadius: '8px', padding: '12px',
                                    fontSize: '1rem', lineHeight: '1.5',
                                    resize: 'vertical'
                                }}
                                placeholder="Describe la tarea detalladamente..."
                            />

                            <div style={{ marginTop: '20px' }}>
                                <h4 style={{ color: 'var(--text-secondary)' }}>Evidencia</h4>
                                <input
                                    value={formData.evidence_url}
                                    onChange={e => setFormData({ ...formData, evidence_url: e.target.value })}
                                    placeholder="URL de evidencia (Notion, Drive, etc.)"
                                    style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px' }}
                                />
                            </div>
                        </form>
                    </div>

                    {/* Sidebar (Right) */}
                    <div style={{ flex: 1, padding: 'var(--space-lg)', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>

                        {/* Status */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Estado</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                style={{
                                    width: '100%', padding: '10px',
                                    background: 'var(--bg-card)', color: 'white',
                                    border: '1px solid var(--border-color)', borderRadius: '6px'
                                }}
                            >
                                <option value="Backlog">Backlog</option>
                                <option value="Todo">Por Iniciar</option>
                                <option value="Doing">En Progreso</option>
                                <option value="Waiting">Bloqueado / Esperando</option>
                                <option value="Done">Terminada</option>
                            </select>
                        </div>

                        {/* Date */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Fecha Objetivo</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="date"
                                    value={formData.target_date}
                                    onChange={e => setFormData({ ...formData, target_date: e.target.value })}
                                    style={{ width: '100%', padding: '10px', paddingLeft: '34px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px' }}
                                />
                                <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                            </div>
                        </div>

                        {/* Priority - Read Only Visual or Advanced Edit */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Puntaje de Prioridad</label>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-light)' }}>
                                {Number(formData.priority_score).toFixed(1)}
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Calculado automáticamente</p>
                        </div>

                        {/* Metadata */}
                        <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <p>Creación: {new Date(task.created_at || Date.now()).toLocaleDateString()}</p>
                            {task.node_name && <p>Nodo: <span style={{ color: task.node_color || 'white' }}>{task.node_name}</span></p>}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button
                                onClick={onClose}
                                style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => document.getElementById('taskForm')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
                                disabled={loading}
                                style={{ flex: 1, padding: '10px', background: 'var(--primary)', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                {loading ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
