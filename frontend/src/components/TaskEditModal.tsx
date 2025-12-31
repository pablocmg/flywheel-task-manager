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

export const TaskEditModal: React.FC<TaskEditModalProps> = ({ isOpen, onClose, task, onUpdate }) => {
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
            // If status changed via form, we might need updateTaskStatus too, but general updateTask endpoint usually handles basics. 
            // However, status update often has specific logic (evidence). 
            // In Execution board, status is handled by column. This modal is for "attributes".
            // Let's assume updateTask endpoint handles these fields.
            // If user wants to change status here, we should probably use updateTaskStatus if separate?
            // For now let's stick to title/desc/date/objective.

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
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }}>
            <div className="glass-panel" style={{
                width: '500px',
                padding: 'var(--space-lg)',
                background: 'var(--bg-panel)',
                position: 'relative',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                    }}
                >
                    <X size={20} />
                </button>

                <h2 className="title-gradient" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ✏️ Editar Tarea
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Título</label>
                        <input
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px' }}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Descripción</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            style={{ width: '100%', height: '100px', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Fecha Objetivo</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="date"
                                    value={formData.target_date}
                                    onChange={e => setFormData({ ...formData, target_date: e.target.value })}
                                    style={{ width: '100%', padding: '10px', paddingLeft: '34px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px' }}
                                    onClick={(e) => {
                                        try { (e.target as HTMLInputElement).showPicker(); } catch (e) { }
                                    }}
                                />
                                <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                            </div>
                        </div>

                        {/* Future: Project/Objective Selectors could go here if we fetch lists */}
                    </div>

                    {/* Hidden/Advanced Attributes can go here if requested, e.g. Priority Score override, or Status dropdown */}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '6px', cursor: 'pointer' }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{ padding: '8px 16px', background: 'var(--primary)', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer' }}
                        >
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
