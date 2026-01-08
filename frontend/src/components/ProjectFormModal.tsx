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
    const [errors, setErrors] = useState({ name: false, objectives: false, target_date: false });
    const [isLoading, setIsLoading] = useState(false);
    const dateInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (project) {
            setFormData({
                name: project.name,
                description: project.description || '',
                objective_ids: project.objective_ids || [],
                target_date: project.target_date || ''
            });
        } else {
            setFormData({ name: '', description: '', objective_ids: [], target_date: '' });
        }
    }, [project, isOpen]);

    // Helper function to navigate to a specific quarter
    const navigateToQuarter = (quarter: number) => {
        const currentYear = new Date().getFullYear();
        const quarterStartMonth = (quarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
        const lastDayOfQuarter = new Date(currentYear, quarterStartMonth + 3, 0);
        const formattedDate = lastDayOfQuarter.toISOString().split('T')[0];
        setFormData({ ...formData, target_date: formattedDate });
        setErrors({ ...errors, target_date: false });
    };

    const handleSubmit = async () => {
        // Prevent double submission
        if (isLoading) return;

        // Validate
        const newErrors = {
            name: !formData.name.trim(),
            objectives: formData.objective_ids.length === 0,
            target_date: !formData.target_date.trim()
        };
        setErrors(newErrors);

        if (newErrors.name || newErrors.objectives || newErrors.target_date) {
            return;
        }

        try {
            setIsLoading(true);
            await onSave(formData);
            setErrors({ name: false, objectives: false, target_date: false });
            onClose();
        } catch (error) {
            console.error('Error saving project:', error);
            alert('Error al guardar el proyecto. Por favor, intenta nuevamente.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
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
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Fecha Target *</label>

                            {/* Quarter Navigation Buttons */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => navigateToQuarter(1)}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                        color: '#60a5fa',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 600
                                    }}
                                >
                                    T1
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigateToQuarter(2)}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                        color: '#60a5fa',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 600
                                    }}
                                >
                                    T2
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigateToQuarter(3)}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                        color: '#60a5fa',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 600
                                    }}
                                >
                                    T3
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigateToQuarter(4)}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                        color: '#60a5fa',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 600
                                    }}
                                >
                                    T4
                                </button>
                            </div>

                            {/* Date Input */}
                            <input
                                ref={dateInputRef}
                                type="date"
                                value={formData.target_date}
                                onChange={e => {
                                    setFormData({ ...formData, target_date: e.target.value });
                                    setErrors({ ...errors, target_date: false });
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'var(--bg-app)',
                                    border: errors.target_date ? '1px solid #ef4444' : '1px solid var(--border-color)',
                                    color: 'white',
                                    borderRadius: 'var(--radius-sm)'
                                }}
                            />
                            {errors.target_date && (
                                <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>
                                    ⚠️ La fecha target es obligatoria
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
                                disabled={isLoading}
                                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '12px 20px', borderRadius: 'var(--radius-md)', cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: isLoading ? 0.5 : 1 }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 'var(--radius-md)', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: isLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {isLoading && (
                                    <span style={{
                                        width: '16px',
                                        height: '16px',
                                        border: '2px solid white',
                                        borderTopColor: 'transparent',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                        display: 'inline-block'
                                    }} />
                                )}
                                {isLoading
                                    ? (project ? 'Actualizando...' : 'Creando...')
                                    : (project ? 'Actualizar Proyecto' : 'Crear Proyecto')
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProjectFormModal;
