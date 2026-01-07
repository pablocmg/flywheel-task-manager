import React, { useState, useEffect, useRef } from 'react';



interface Node {
    id: string;
    name: string;
    color: string;
    objectiveGroups?: { id: string; alias: string; objectives?: Objective[] }[];
}

interface Objective {
    id: string;
    description: string;
    type: 'annual' | 'quarterly';
    quarter: string | null;
}

interface Project {
    id?: string;
    name: string;
    description?: string;
    objective_ids?: string[];
    target_date?: string;
}

interface ProjectFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project | null;
    nodes: Node[];
    onSave: (projectData: { name: string; description: string; objective_ids: string[]; target_date: string }) => Promise<void>;
}

const ProjectFormModal: React.FC<ProjectFormModalProps> = ({ isOpen, onClose, project, nodes, onSave }) => {
    const [formData, setFormData] = useState({ name: '', description: '', objective_ids: [] as string[], target_date: '' });
    const [errors, setErrors] = useState({ name: false, objectives: false });
    const [targetMode, setTargetMode] = useState<'date' | 'quarter' | null>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (project) {
            setFormData({
                name: project.name,
                description: project.description || '',
                objective_ids: project.objective_ids || [],
                target_date: project.target_date || ''
            });
            // Determine mode based on existing target
            if (project.target_date) {
                if (['T1', 'T2', 'T3', 'T4'].includes(project.target_date)) {
                    setTargetMode('quarter');
                } else {
                    setTargetMode('date');
                }
            } else {
                setTargetMode(null);
            }
        } else {
            setFormData({ name: '', description: '', objective_ids: [], target_date: '' });
            setTargetMode(null);
        }
    }, [project, isOpen]);

    // Auto-open date picker when date mode is selected
    useEffect(() => {
        if (targetMode === 'date' && dateInputRef.current) {
            // Small delay to ensure the input is rendered
            setTimeout(() => {
                try {
                    dateInputRef.current?.showPicker();
                } catch (e) {
                    // showPicker() not supported, just focus
                    dateInputRef.current?.focus();
                }
            }, 100);
        }
    }, [targetMode]);

    const handleSubmit = async () => {
        // Validate
        const newErrors = {
            name: !formData.name.trim(),
            objectives: formData.objective_ids.length === 0
        };
        setErrors(newErrors);

        if (newErrors.name || newErrors.objectives) {
            return;
        }

        await onSave(formData);
        setErrors({ name: false, objectives: false });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-md)'
        }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', padding: 'var(--space-xl)', position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                    ✕
                </button>

                <h2 style={{ marginTop: 0 }}>{project ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Nombre del Proyecto *</label>
                        <input
                            placeholder="Nombre del Proyecto"
                            value={formData.name}
                            onChange={e => { setFormData({ ...formData, name: e.target.value }); setErrors({ ...errors, name: false }); }}
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-app)', border: errors.name ? '1px solid #ef4444' : '1px solid var(--border-color)', color: 'white', borderRadius: 'var(--radius-sm)' }}
                        />
                        {errors.name && (
                            <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>
                                ⚠️ El nombre del proyecto es obligatorio
                            </div>
                        )}
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Descripción</label>
                        <textarea
                            placeholder="Descripción del proyecto"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'white', borderRadius: 'var(--radius-sm)', minHeight: '80px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Target (Fecha o Quarter)</label>

                        {/* Mode Selector */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setTargetMode('date');
                                    if (['T1', 'T2', 'T3', 'T4'].includes(formData.target_date)) {
                                        setFormData({ ...formData, target_date: '' });
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    background: targetMode === 'date' ? 'var(--primary)' : 'transparent',
                                    border: '1px solid var(--border-color)',
                                    color: 'white',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                📅 Fecha
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setTargetMode('quarter');
                                    if (!['T1', 'T2', 'T3', 'T4'].includes(formData.target_date)) {
                                        setFormData({ ...formData, target_date: 'T1' });
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    background: targetMode === 'quarter' ? 'var(--primary)' : 'transparent',
                                    border: '1px solid var(--border-color)',
                                    color: 'white',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                📊 Trimestre
                            </button>
                        </div>

                        {/* Date Input */}
                        {targetMode === 'date' ? (
                            <input
                                ref={dateInputRef}
                                type="date"
                                value={formData.target_date}
                                onChange={e => setFormData({ ...formData, target_date: e.target.value })}
                                style={{ width: '100%', padding: '12px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'white', borderRadius: 'var(--radius-sm)' }}
                            />
                        ) : targetMode === 'quarter' ? (
                            /* Quarter Selector */
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                {['T1', 'T2', 'T3', 'T4'].map(quarter => (
                                    <button
                                        key={quarter}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, target_date: quarter })}
                                        style={{
                                            padding: '12px',
                                            background: formData.target_date === quarter ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                            border: formData.target_date === quarter ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                            color: 'white',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: formData.target_date === quarter ? 700 : 400,
                                            fontSize: '0.9rem',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {quarter}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            /* No selection yet */
                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Selecciona modo arriba: Fecha o Trimestre
                            </div>
                        )}
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Vincular a Objetivos (Mínimo 1) *</label>
                        <div style={{ maxHeight: '200px', overflow: 'auto', padding: '10px', background: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: errors.objectives ? '1px solid #ef4444' : '1px solid var(--border-color)' }}>
                            {nodes.length === 0 || nodes.every(n => !n.objectiveGroups || n.objectiveGroups.length === 0) ? (
                                <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--warning)', fontSize: '0.9rem' }}>
                                    ⚠️ No hay objetivos estratégicos creados.
                                </div>
                            ) : (
                                nodes.map(node => {
                                    // Skip nodes with no objective groups
                                    if (!node.objectiveGroups || node.objectiveGroups.length === 0) return null;

                                    return (
                                        <div key={node.id} style={{ marginBottom: '16px' }}>
                                            {/* Node Name */}
                                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: node.color, marginBottom: '8px' }}>{node.name}</div>

                                            {/* Objective Groups (Periods) */}
                                            {node.objectiveGroups.map(group => {
                                                // Skip groups with no objectives
                                                if (!group.objectives || group.objectives.length === 0) return null;

                                                return (
                                                    <div key={group.id} style={{ marginBottom: '10px', marginLeft: '12px' }}>
                                                        {/* Period Header (non-selectable) */}
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            📅 {group.alias}
                                                        </div>

                                                        {/* Objectives (selectable) */}
                                                        {group.objectives.map(obj => (
                                                            <label key={obj.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer', fontSize: '0.9rem', marginLeft: '8px' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.objective_ids.includes(obj.id)}
                                                                    onChange={e => {
                                                                        const ids = e.target.checked
                                                                            ? [...formData.objective_ids, obj.id]
                                                                            : formData.objective_ids.filter(id => id !== obj.id);
                                                                        setFormData({ ...formData, objective_ids: ids });
                                                                        setErrors({ ...errors, objectives: false });
                                                                    }}
                                                                />
                                                                {obj.type === 'annual' ? '🎯 ' : ''}{obj.description} {obj.quarter && `(${obj.quarter})`}
                                                            </label>
                                                        ))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        {errors.objectives && (
                            <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>
                                ⚠️ Debes vincular al menos un objetivo
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                        <button
                            onClick={onClose}
                            style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '12px 20px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600 }}
                        >
                            {project ? 'Actualizar Proyecto' : 'Crear Proyecto'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectFormModal;
