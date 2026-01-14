import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X } from 'lucide-react';

interface Node {
    id: string;
    name: string;
    color: string;
    objectiveGroups?: { id: string; alias: string; objectives: Objective[] }[];
}

interface Objective {
    id: string;
    description: string;
    type: 'annual' | 'quarterly';
    quarter: string | null;
}

interface Project {
    id: string;
    name: string;
    description?: string;
    objective_ids?: string[];
}

interface TaskCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskCreated: () => void;
    preSelectedProjectId?: string;
    lockedProject?: boolean;
}

const LAST_PROJECT_KEY = 'flywheel_last_project_id';

const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
    isOpen,
    onClose,
    onTaskCreated,
    preSelectedProjectId,
    lockedProject = false
}) => {
    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [projectId, setProjectId] = useState('');
    const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<string[]>([]);
    const [complexity, setComplexity] = useState('');

    // Data state
    const [projects, setProjects] = useState<Project[]>([]);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    // Load projects and nodes on mount
    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    // Set project from preSelected or localStorage
    useEffect(() => {
        if (isOpen && projects.length > 0) {
            if (preSelectedProjectId) {
                setProjectId(preSelectedProjectId);
            } else {
                const lastProject = localStorage.getItem(LAST_PROJECT_KEY);
                if (lastProject && projects.some(p => p.id === lastProject)) {
                    setProjectId(lastProject);
                }
            }
        }
    }, [isOpen, preSelectedProjectId, projects]);

    // Clear selected objectives when project changes
    useEffect(() => {
        setSelectedObjectiveIds([]);
    }, [projectId]);

    const loadData = async () => {
        setDataLoading(true);
        try {
            const [projectsData, nodesData] = await Promise.all([
                api.getProjects(),
                api.getNodes()
            ]);

            // Load objective groups for each node
            const nodesWithObjectives = await Promise.all(nodesData.map(async (n: Node) => {
                const objectiveGroups = await api.getObjectiveGroups(n.id);
                return { ...n, objectiveGroups };
            }));

            setProjects(projectsData);
            setNodes(nodesWithObjectives.filter((n: any) => n.is_active !== false));
        } catch (err) {
            console.error('Error loading data:', err);
        }
        setDataLoading(false);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!title.trim() || !projectId || selectedObjectiveIds.length === 0) {
            return;
        }

        setLoading(true);
        try {
            await api.createTask({
                title: title.trim(),
                description: description.trim(),
                objective_id: selectedObjectiveIds[0], // Primary objective
                status: 'Backlog',
                weight: 1,
                priority_score: 1000,
                complexity: complexity || null
            });

            // Save to localStorage
            localStorage.setItem(LAST_PROJECT_KEY, projectId);

            // Reset form
            setTitle('');
            setDescription('');
            setSelectedObjectiveIds([]);
            setComplexity('');
            if (!lockedProject) {
                setProjectId('');
            }

            onTaskCreated();
            onClose();
        } catch (err) {
            console.error('Error creating task:', err);
            alert('Error al crear la tarea');
        } finally {
            setLoading(false);
        }
    };

    const toggleObjective = (objectiveId: string) => {
        setSelectedObjectiveIds(prev =>
            prev.includes(objectiveId)
                ? prev.filter(id => id !== objectiveId)
                : [...prev, objectiveId]
        );
    };

    const getProjectObjectives = (): Objective[] => {
        const project = projects.find(p => p.id === projectId);
        if (!project || !project.objective_ids) return [];

        const allObjectives: Objective[] = [];
        nodes.forEach(node => {
            if (node.objectiveGroups) {
                node.objectiveGroups.forEach(group => {
                    if (group.objectives) {
                        group.objectives.forEach(obj => {
                            if (project.objective_ids?.includes(obj.id)) {
                                allObjectives.push(obj);
                            }
                        });
                    }
                });
            }
        });
        return allObjectives;
    };

    const getObjectivesByNode = () => {
        const projectObjectives = getProjectObjectives();
        const grouped: { node: Node; objectives: Objective[] }[] = [];

        nodes.forEach(node => {
            const nodeObjectives = projectObjectives.filter(obj => {
                return node.objectiveGroups?.some(group =>
                    group.objectives?.some(o => o.id === obj.id)
                );
            });

            if (nodeObjectives.length > 0) {
                grouped.push({ node, objectives: nodeObjectives });
            }
        });

        return grouped;
    };

    const isFormValid = () => {
        return title.trim() && projectId && selectedObjectiveIds.length > 0;
    };

    const getMissingFields = () => {
        const missing: string[] = [];
        if (!title.trim()) missing.push('Título');
        if (!projectId) missing.push('Proyecto');
        if (selectedObjectiveIds.length === 0) missing.push('Objetivo');
        return missing;
    };

    if (!isOpen) return null;

    const selectedProject = projects.find(p => p.id === projectId);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="glass-panel" style={{
                width: '90%',
                maxWidth: '600px',
                padding: 'var(--space-lg)',
                maxHeight: '85vh',
                overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                    <h2 style={{ margin: 0 }}>Nueva Tarea</h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {dataLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        Cargando...
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            {/* Title */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Título *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Título de la tarea"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: 'var(--bg-app)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'white',
                                        fontSize: '1rem'
                                    }}
                                    autoFocus
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Descripción
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Descripción de la tarea"
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: 'var(--bg-app)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'white',
                                        fontSize: '0.95rem',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            {/* Project */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Proyecto *
                                </label>
                                <select
                                    value={projectId}
                                    onChange={(e) => setProjectId(e.target.value)}
                                    disabled={lockedProject}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: 'var(--bg-app)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'white',
                                        fontSize: '0.95rem',
                                        opacity: lockedProject ? 0.7 : 1,
                                        cursor: lockedProject ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <option value="">Selecciona un proyecto</option>
                                    {projects.map((project: Project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Objectives */}
                            {projectId && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        Objetivos Vinculados *
                                    </label>
                                    <div style={{
                                        maxHeight: '200px',
                                        overflow: 'auto',
                                        padding: '12px',
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        {getObjectivesByNode().map(({ node, objectives }) => (
                                            <div key={node.id} style={{ marginBottom: '12px' }}>
                                                <div style={{
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    color: node.color,
                                                    marginBottom: '6px'
                                                }}>
                                                    {node.name}
                                                </div>
                                                {objectives.map(obj => (
                                                    <label
                                                        key={obj.id}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            padding: '4px 0',
                                                            cursor: 'pointer',
                                                            fontSize: '0.85rem',
                                                            marginLeft: '12px'
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedObjectiveIds.includes(obj.id)}
                                                            onChange={() => toggleObjective(obj.id)}
                                                        />
                                                        <span style={{
                                                            color: selectedProject?.objective_ids?.includes(obj.id) ? '#60a5fa' : 'white'
                                                        }}>
                                                            {obj.type === 'annual' ? '🎯 ' : ''}
                                                            {obj.description}
                                                            {obj.quarter && ` (${obj.quarter})`}
                                                            {selectedProject?.objective_ids?.includes(obj.id) && (
                                                                <span style={{ marginLeft: '6px', fontSize: '0.75rem', opacity: 0.7 }}>
                                                                    (del proyecto)
                                                                </span>
                                                            )}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        ))}
                                        {getObjectivesByNode().length === 0 && (
                                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                                No hay objetivos vinculados a este proyecto
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Complexity */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Complejidad
                                </label>
                                <select
                                    value={complexity}
                                    onChange={(e) => setComplexity(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: 'var(--bg-app)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'white',
                                        fontSize: '0.95rem'
                                    }}
                                >
                                    <option value="">Sin definir</option>
                                    <option value="S">S - Pequeña</option>
                                    <option value="M">M - Mediana</option>
                                    <option value="L">L - Grande</option>
                                    <option value="XL">XL - Muy Grande</option>
                                    <option value="XXL">XXL - Enorme</option>
                                </select>
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: 'var(--space-md)' }}>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    style={{
                                        padding: '12px 24px',
                                        background: 'transparent',
                                        color: 'var(--text-muted)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '1rem'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !isFormValid()}
                                    title={
                                        !isFormValid()
                                            ? `Faltan completar: ${getMissingFields().join(', ')}`
                                            : 'Crear tarea'
                                    }
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: (loading || !isFormValid()) ? 'var(--text-muted)' : 'var(--primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: (loading || !isFormValid()) ? 'not-allowed' : 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '1rem',
                                        opacity: !isFormValid() ? 0.6 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {loading && (
                                        <span className="spinner" style={{
                                            width: '16px',
                                            height: '16px',
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderTopColor: 'white',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }}></span>
                                    )}
                                    {loading ? 'Creando...' : 'Crear Tarea'}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default TaskCreateModal;
