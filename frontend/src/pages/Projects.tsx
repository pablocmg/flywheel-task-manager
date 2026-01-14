import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, FolderOpen, ChevronDown, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';
import ProjectFormModal from '../components/ProjectFormModal';
import TaskCreateModal from '../components/TaskCreateModal';

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
    target_date?: string;
}

interface Task {
    id: string;
    title: string;
    description: string;
    status: string;
    weight: number;
    week_number: number;
    project_id: string;
    objective_id?: string;
    objective_title?: string;
    target_date?: string;
    assignee_name?: string;
    complexity?: 'S' | 'M' | 'L' | 'XL' | 'XXL';
    is_waiting_third_party?: boolean;
    has_incomplete_dependencies?: boolean;
}

const Projects: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const [projectTasks, setProjectTasks] = useState<Record<string, Task[]>>({});
    const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);

    // Task creation/editing
    const [creatingTaskForProject, setCreatingTaskForProject] = useState<string | null>(null);
    const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);


    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [projectsData, nodesData] = await Promise.all([
                api.getProjects(),
                api.getNodes()
            ]);

            // Load objective groups for each node (preserve group structure)
            const nodesWithObjectives = await Promise.all(nodesData.map(async (n: Node) => {
                const objectiveGroups = await api.getObjectiveGroups(n.id);
                return { ...n, objectiveGroups };
            }));

            setProjects(projectsData);
            setNodes(nodesWithObjectives.filter((n: any) => n.is_active !== false));

            // Load tasks for all projects
            const tasksData: Record<string, Task[]> = {};
            await Promise.all(projectsData.map(async (project: Project) => {
                try {
                    const tasks = await api.getTasksByProject(project.id);
                    tasksData[project.id] = tasks;
                } catch (err) {
                    console.error(`Error loading tasks for project ${project.id}:`, err);
                    tasksData[project.id] = [];
                }
            }));
            setProjectTasks(tasksData);
        } catch (err) {
            console.error('Error loading data:', err);
        }
        setLoading(false);
    };

    const loadProjectTasks = async (projectId: string) => {
        try {
            console.log('[loadProjectTasks] Loading tasks for project:', projectId);
            const tasks = await api.getTasksByProject(projectId);
            console.log('[loadProjectTasks] Loaded tasks:', tasks);
            setProjectTasks(prev => ({ ...prev, [projectId]: tasks }));
        } catch (err) {
            console.error('[loadProjectTasks] Error loading project tasks:', err);
            setProjectTasks(prev => ({ ...prev, [projectId]: [] }));
        }
    };

    const toggleProjectExpansion = (projectId: string) => {
        const newExpanded = new Set(expandedProjects);
        if (newExpanded.has(projectId)) {
            newExpanded.delete(projectId);
        } else {
            newExpanded.add(projectId);
            loadProjectTasks(projectId);
        }
        setExpandedProjects(newExpanded);
    };

    const handleSaveProject = async (projectData: { name: string; description: string; objective_ids: string[]; target_date: string }) => {
        try {
            console.log('[handleSaveProject] Saving project with data:', projectData);
            if (editingProject) {
                await api.updateProject(editingProject.id, projectData);
                console.log('[handleSaveProject] Project updated successfully');
            } else {
                const result = await api.createProject(projectData);
                console.log('[handleSaveProject] Project created successfully:', result);
            }
            setEditingProject(null);
            loadData();
        } catch (err) {
            console.error('[handleSaveProject] Error saving project:', err);
            throw err; // Re-throw so the modal can handle it
        }
    };

    const handleDeleteProject = async () => {
        if (!confirmDelete) return;

        try {
            await api.deleteProject(confirmDelete.id);
            setConfirmDelete(null);
            loadData();
        } catch (err) {
            console.error('Error deleting project:', err);
            alert('Error al eliminar el proyecto');
        }
    };

    const getLinkedObjectivesText = (project: Project) => {
        if (!project.objective_ids || project.objective_ids.length === 0) return 'Sin objetivos';
        return `${project.objective_ids.length} objetivo${project.objective_ids.length > 1 ? 's' : ''}`;
    };

    const handleDeleteTask = async (taskId: string, projectId: string) => {
        console.log('[handleDeleteTask] Called with:', { taskId, projectId });
        setDeletingTaskId(taskId);
        try {
            console.log('[handleDeleteTask] Calling api.deleteTask...');
            await api.deleteTask(taskId);
            console.log('[handleDeleteTask] Task deleted successfully, reloading tasks...');
            loadProjectTasks(projectId);
        } catch (err) {
            console.error('[handleDeleteTask] Error deleting task:', err);
            alert('Error al eliminar la tarea');
        } finally {
            setDeletingTaskId(null);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: 'var(--space-lg)' }}>
                <p>Cargando proyectos...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: 'var(--space-lg)', paddingBottom: '100px' }}>
            {/* Header */}
            <div style={{ marginBottom: 'var(--space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FolderOpen size={32} color="var(--primary)" />
                        Gestión de Proyectos
                    </h1>
                    <p className="text-muted">Administra proyectos y sus tareas asociadas</p>
                </div>
                <button
                    onClick={() => { setEditingProject(null); setShowModal(true); }}
                    style={{
                        background: 'var(--primary)',
                        border: 'none',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 600,
                        fontSize: '0.95rem'
                    }}
                >
                    <Plus size={18} />
                    Nuevo Proyecto
                </button>
            </div>

            {/* Projects Grid */}
            {projects.length === 0 ? (
                <div className="glass-panel" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                    <FolderOpen size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ color: 'var(--text-secondary)' }}>No hay proyectos creados</h3>
                    <p className="text-muted">Crea tu primer proyecto para comenzar</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 'var(--space-lg)' }}>
                    {projects.map(project => (
                        <div key={project.id} className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
                            {/* Project Header */}
                            <div style={{ marginBottom: 'var(--space-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{project.name}</h3>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => { setEditingProject(project); setShowModal(true); }}
                                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem' }}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(project)}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                                {project.description && (
                                    <p style={{ margin: '8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        {project.description}
                                    </p>
                                )}
                                <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                    <div>📋 {getLinkedObjectivesText(project)}</div>
                                    {project.target_date && (
                                        <div style={{ color: 'var(--primary)' }}>🎯 Target: {project.target_date}</div>
                                    )}
                                </div>
                            </div>

                            {/* Tasks Section */}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 'var(--space-sm)' }}>
                                <div
                                    onClick={() => toggleProjectExpansion(project.id)}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '8px 0' }}
                                >
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        TAREAS ({projectTasks[project.id]?.length || 0})
                                    </span>
                                    {expandedProjects.has(project.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </div>

                                {expandedProjects.has(project.id) && (
                                    <div style={{ marginTop: '8px' }}>
                                        {/* Task List */}
                                        {projectTasks[project.id] && projectTasks[project.id].length > 0 && (
                                            <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {projectTasks[project.id].map(task => (
                                                    <div key={task.id} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>{task.title}</div>
                                                            {task.description && (
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{task.description}</div>
                                                            )}
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                                Objetivo asociado: {task.objective_title}
                                                            </div>
                                                            {task.target_date && (
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '2px' }}>
                                                                    🎯 Fecha fin: {new Date(task.target_date).toLocaleDateString()}
                                                                </div>
                                                            )}
                                                            {task.assignee_name && (
                                                                <div style={{ fontSize: '0.7rem', color: '#a78bfa', marginTop: '2px' }}>
                                                                    👤 Asignado a: {task.assignee_name}
                                                                </div>
                                                            )}
                                                            {task.complexity && (
                                                                <div style={{
                                                                    display: 'inline-block',
                                                                    marginTop: '4px',
                                                                    padding: '2px 8px',
                                                                    background: task.complexity === 'S' ? 'rgba(34, 197, 94, 0.2)' :
                                                                        task.complexity === 'M' ? 'rgba(59, 130, 246, 0.2)' :
                                                                            task.complexity === 'L' ? 'rgba(249, 115, 22, 0.2)' :
                                                                                task.complexity === 'XL' ? 'rgba(239, 68, 68, 0.2)' :
                                                                                    'rgba(220, 38, 38, 0.25)',
                                                                    borderRadius: '12px',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 600,
                                                                    color: task.complexity === 'S' ? '#22c55e' :
                                                                        task.complexity === 'M' ? '#3b82f6' :
                                                                            task.complexity === 'L' ? '#f97316' :
                                                                                task.complexity === 'XL' ? '#ef4444' :
                                                                                    '#dc2626'
                                                                }}>
                                                                    {task.complexity}
                                                                </div>
                                                            )}
                                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                                <button
                                                                    onClick={() => handleDeleteTask(task.id, project.id)}
                                                                    disabled={deletingTaskId === task.id}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        color: deletingTaskId === task.id ? 'rgba(239, 68, 68, 0.4)' : '#ef4444',
                                                                        cursor: deletingTaskId === task.id ? 'not-allowed' : 'pointer',
                                                                        padding: '4px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                    title="Eliminar tarea"
                                                                >
                                                                    {deletingTaskId === task.id ? (
                                                                        <span className="spinner" style={{
                                                                            width: '16px',
                                                                            height: '16px',
                                                                            border: '2px solid rgba(239, 68, 68, 0.3)',
                                                                            borderTop: '2px solid #ef4444',
                                                                            borderRadius: '50%',
                                                                            animation: 'spin 1s linear infinite'
                                                                        }}></span>
                                                                    ) : (
                                                                        <Trash2 size={16} />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {projectTasks[project.id]?.length === 0 && !creatingTaskForProject && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                                                Sin tareas
                                            </div>
                                        )}


                                        {/* New Task Button */}
                                        <button
                                            onClick={() => setCreatingTaskForProject(project.id)}
                                            style={{
                                                background: 'none',
                                                border: '1px dashed var(--border-color)',
                                                color: 'var(--primary)',
                                                cursor: 'pointer',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                width: '100%',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            + Nueva Tarea
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Project Form Modal */}
            <ProjectFormModal
                isOpen={showModal}
                onClose={() => { setShowModal(false); setEditingProject(null); }}
                project={editingProject}
                nodes={nodes}
                onSave={handleSaveProject}
            />

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001
                }}>
                    <div className="glass-panel" style={{ padding: 'var(--space-lg)', width: '450px', textAlign: 'center' }}>
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <AlertTriangle size={48} color="#ef4444" />
                        </div>
                        <h3 style={{ margin: '0 0 var(--space-sm) 0', color: '#ef4444' }}>⚠️ ADVERTENCIA</h3>
                        <p className="text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                            ¿Estás seguro de que quieres <strong>ELIMINAR</strong> el proyecto <strong>"{confirmDelete.name}"</strong>?
                        </p>
                        <p style={{ marginBottom: 'var(--space-md)', color: '#f87171', fontSize: '0.9rem' }}>
                            Esta acción es <strong>PERMANENTE</strong> y eliminará el proyecto y <strong>todas sus tareas asociadas</strong>.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setConfirmDelete(null)}
                                style={{
                                    padding: '10px 24px',
                                    background: 'transparent',
                                    border: '1px solid var(--text-muted)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius-md)'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteProject}
                                style={{
                                    padding: '10px 24px',
                                    background: '#ef4444',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 'bold'
                                }}
                            >
                                ELIMINAR PROYECTO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unified Task Creation Modal */}
            <TaskCreateModal
                isOpen={creatingTaskForProject !== null}
                onClose={() => setCreatingTaskForProject(null)}
                onTaskCreated={() => {
                    if (creatingTaskForProject) {
                        loadProjectTasks(creatingTaskForProject);
                    }
                    setCreatingTaskForProject(null);
                }}
                preSelectedProjectId={creatingTaskForProject || undefined}
                lockedProject={true}
            />
        </div>
    );
};

export default Projects;
