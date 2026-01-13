import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, Calendar } from 'lucide-react';

interface TaskEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: any; // Using any for flexibility or reuse Task interface
    onUpdate: () => void;

}

// Full Detail Card Modal
export const TaskEditModal: React.FC<TaskEditModalProps> = ({ isOpen, onClose, task, onUpdate }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: '',
        priority_score: 0,
        objective_id: '',
        target_date: '',
        evidence_url: '',
        complexity: '' as string,
        is_waiting_third_party: false,
    });
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [allTasks, setAllTasks] = useState<any[]>([]);
    const [dependsOn, setDependsOn] = useState<string[]>([]);
    const [enables, setEnables] = useState<string[]>([]);
    const [editingDependsOn, setEditingDependsOn] = useState(false);
    const [editingEnables, setEditingEnables] = useState(false);
    const [projects, setProjects] = useState<{ id: string, name: string }[]>([]);

    // Dependency editor state
    const [selectedProjectForDeps, setSelectedProjectForDeps] = useState('');
    const [selectedProjectForEnables, setSelectedProjectForEnables] = useState('');
    const [searchDeps, setSearchDeps] = useState('');
    const [searchEnables, setSearchEnables] = useState('');
    const [areDependenciesLoading, setAreDependenciesLoading] = useState(false);

    // Assignee state
    const [assignees, setAssignees] = useState<{ id: string, name: string }[]>([]);
    const [assigneeName, setAssigneeName] = useState('');
    const [assigneeId, setAssigneeId] = useState<string | null>(null);

    // Delete state
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title || '',
                description: task.description || '',
                status: task.status || 'Backlog',
                priority_score: task.priority_score || 0,
                objective_id: task.objective_id || '',
                target_date: task.target_date ? task.target_date.split('T')[0] : '',
                evidence_url: task.evidence_url || '',
                complexity: task.complexity || '',
                is_waiting_third_party: task.is_waiting_third_party || false
            });

            // Set default project for dependency editors
            setSelectedProjectForDeps(task.project_id || '');
            setSelectedProjectForEnables(task.project_id || '');

            // Load all tasks and dependencies
            const loadData = async () => {
                setAreDependenciesLoading(true);
                try {
                    const tasks = await api.getAllTasks();
                    setAllTasks(tasks.filter((t: any) => t.id !== task.id)); // Exclude current task

                    const deps = await api.getTaskDependencies(task.id);
                    setDependsOn(deps.depends_on.map((d: any) => d.id));

                    setEnables(deps.enables.map((e: any) => e.id));

                    const projectsData = await api.getProjects();
                    setProjects(projectsData.sort((a: any, b: any) => a.name.localeCompare(b.name)));

                    // Load assignees
                    const assigneesData = await api.getAssignees();
                    setAssignees(assigneesData);

                    // Set current assignee
                    if (task.assignee_id) {
                        setAssigneeId(task.assignee_id);
                        setAssigneeName(task.assignee_name || '');
                    } else {
                        setAssigneeId(null);
                        setAssigneeName('');
                    }
                } catch (error) {
                    console.error('Error loading dependencies:', error);
                } finally {
                    setAreDependenciesLoading(false);
                }
            };
            loadData();
        }
    }, [task]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setErrorMessage(null);

        // Validate circular dependencies
        const circularDeps = dependsOn.filter(id => enables.includes(id));
        if (circularDeps.length > 0) {
            setErrorMessage('Error: No puedes tener dependencias circulares. Una tarea no puede depender de y habilitar a la misma tarea.');
            return;
        }

        setLoading(true);
        try {
            // Handle assignee
            let finalAssigneeId = assigneeId;
            if (assigneeName.trim()) {
                // Get or create assignee
                const assigneeResult = await api.getOrCreateAssignee(assigneeName.trim());
                finalAssigneeId = assigneeResult.id;
            } else {
                finalAssigneeId = null;
            }

            await api.updateTask(task.id, { ...formData, assignee_id: finalAssigneeId });

            // If status changed here, we should ensure consistency
            if (task.status !== formData.status) {
                await api.updateTaskStatus(task.id, formData.status);
            }

            // Update dependencies
            await api.updateTaskDependencies(task.id, {
                depends_on: dependsOn,
                enables: enables
            });

            onUpdate();
            onClose();
        } catch (error: any) {
            console.error('Error updating task:', error);
            setErrorMessage(`Error al actualizar tarea: ${error.message || 'Error desconocido'}`);
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar esta tarea? Esta acción no se puede deshacer.')) {
            return;
        }

        setIsDeleting(true);
        try {
            await api.deleteTask(task.id);
            onUpdate();
            onClose();
        } catch (error: any) {
            console.error('Error deleting task:', error);
            setErrorMessage(`Error al eliminar tarea: ${error.message || 'Error desconocido'}`);
        }
        setIsDeleting(false);
    };

    if (!isOpen || !task) return null;



    // Filter tasks for dependency editor
    // Filter tasks for dependency editor
    const getFilteredTasks = (selectedProjectId: string, searchTerm: string) => {
        return allTasks.filter((t: any) => {
            const matchesProject = !selectedProjectId || t.project_id === selectedProjectId;
            const matchesSearch = !searchTerm || t.title.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesProject && matchesSearch;
        });
    };

    // Render dependency editor modal
    const renderDependencyEditor = (type: 'depends_on' | 'enables') => {
        const isDependsOn = type === 'depends_on';
        const selectedIds = isDependsOn ? dependsOn : enables;
        const setSelectedIds = isDependsOn ? setDependsOn : setEnables;
        const selectedProject = isDependsOn ? selectedProjectForDeps : selectedProjectForEnables;
        const setSelectedProject = isDependsOn ? setSelectedProjectForDeps : setSelectedProjectForEnables;
        const searchTerm = isDependsOn ? searchDeps : searchEnables;
        const setSearchTerm = isDependsOn ? setSearchDeps : setSearchEnables;
        const isEditing = isDependsOn ? editingDependsOn : editingEnables;
        const setIsEditing = isDependsOn ? setEditingDependsOn : setEditingEnables;

        if (!isEditing) return null;

        const filteredTasks = getFilteredTasks(selectedProject, searchTerm);
        const selectedTasks = allTasks.filter(t => selectedIds.includes(t.id));

        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.95)',
                zIndex: 2000,
                display: 'flex',
                flexDirection: 'column',
                padding: '40px'
            }}>
                {/* Header */}
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'white' }}>
                        {isDependsOn ? 'Seleccionar Dependencias' : 'Seleccionar Tareas Habilitadas'}
                    </h2>
                    <button
                        onClick={() => setIsEditing(false)}
                        style={{
                            padding: '8px 16px',
                            background: 'var(--primary)',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Listo
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>
                    {/* Left panel: Project selector and task list */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Project selector */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 600 }}>Proyecto</label>
                            <select
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            >
                                <option value="">Todos los proyectos</option>
                                {projects.map((project: { id: string, name: string }) => (
                                    <option key={project.id} value={project.id}>{project.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Search */}
                        <div>
                            <input
                                type="text"
                                placeholder="Buscar tareas..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>

                        {/* Task list */}
                        <div style={{
                            flex: 1,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '16px',
                            overflowY: 'auto'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {filteredTasks.map((t: any) => {
                                    const isSelected = selectedIds.includes(t.id);
                                    const isDisabled = (isDependsOn ? enables : dependsOn).includes(t.id);

                                    return (
                                        <div
                                            key={t.id}
                                            title={isDisabled
                                                ? (isDependsOn
                                                    ? "Esta tarea ya fue agregada como habilitada por la actual"
                                                    : "Esta tarea ya fue agregada como dependencia de la actual")
                                                : ""}
                                            onClick={() => {
                                                if (isDisabled) return;
                                                if (isSelected) {
                                                    setSelectedIds(selectedIds.filter(id => id !== t.id));
                                                } else {
                                                    setSelectedIds([...selectedIds, t.id]);
                                                }
                                            }}
                                            style={{
                                                padding: '12px',
                                                background: isSelected
                                                    ? 'var(--primary)'
                                                    : isDisabled
                                                        ? 'rgba(255,255,255,0.05)'
                                                        : 'var(--bg-panel)',
                                                border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                                                borderRadius: '6px',
                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.2s',
                                                color: isSelected
                                                    ? 'white'
                                                    : isDisabled
                                                        ? 'var(--text-muted)'
                                                        : 'var(--text-secondary)',
                                                opacity: isDisabled ? 0.6 : 1
                                            }}
                                        >
                                            <div style={{ fontWeight: isSelected ? 'bold' : 'normal', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>{t.title}</span>
                                                {isDisabled && <span style={{ fontSize: '0.7em', fontStyle: 'italic' }}>{isDependsOn ? '(Habilitada)' : '(Dependencia)'}</span>}
                                            </div>
                                            {t.description && (
                                                <div style={{ fontSize: '0.85rem', marginTop: '4px', opacity: 0.8 }}>
                                                    {t.description.substring(0, 100)}{t.description.length > 100 ? '...' : ''}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {filteredTasks.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        No se encontraron tareas
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right panel: Selected tasks */}
                    <div style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Seleccionadas ({selectedTasks.length})</h3>
                        </div>
                        <div style={{
                            flex: 1,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '16px',
                            overflowY: 'auto'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {selectedTasks.map((t: any) => (
                                    <div
                                        key={t.id}
                                        style={{
                                            padding: '12px',
                                            background: 'var(--bg-panel)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            gap: '8px'
                                        }}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                                [{t.project_name}]
                                            </div>
                                            <div style={{ color: 'var(--text-secondary)' }}>{t.title}</div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedIds(selectedIds.filter(id => id !== t.id))}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--text-muted)',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                fontSize: '1.2rem'
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                {selectedTasks.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        No hay tareas seleccionadas
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {renderDependencyEditor('depends_on')}
            {renderDependencyEditor('enables')}

            <div className="modal-overlay" style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.8)', // Darker backdrop
                display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
            }}>
                <div className="glass-panel" style={{
                    width: '1000px',
                    maxWidth: '95vw',
                    height: '88vh',
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
                        <div style={{ flex: 1, padding: 'var(--space-lg)', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', maxHeight: '100%' }}>

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

                            {/* Waiting for Third Party Toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#F59E0B', fontSize: '0.9rem', fontWeight: 500 }}>Esperando a terceros</label>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tarea pausada por respuesta externa</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, is_waiting_third_party: !formData.is_waiting_third_party })}
                                    style={{
                                        width: '44px',
                                        height: '24px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: formData.is_waiting_third_party ? '#F59E0B' : 'rgba(255,255,255,0.2)',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        transition: 'background 0.2s ease'
                                    }}
                                >
                                    <div style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        background: 'white',
                                        position: 'absolute',
                                        top: '3px',
                                        left: formData.is_waiting_third_party ? '23px' : '3px',
                                        transition: 'left 0.2s ease'
                                    }} />
                                </button>
                            </div>

                            {/* Complexity */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Complejidad</label>
                                <select
                                    value={formData.complexity}
                                    onChange={e => setFormData({ ...formData, complexity: e.target.value })}
                                    style={{
                                        width: '100%', padding: '10px',
                                        background: 'var(--bg-card)', color: 'white',
                                        border: '1px solid var(--border-color)', borderRadius: '6px'
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

                            {/* Assignee */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Asignado a</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        list="assignees-datalist"
                                        value={assigneeName}
                                        onChange={(e) => {
                                            setAssigneeName(e.target.value);
                                            // Find matching assignee to set ID
                                            const matchingAssignee = assignees.find(a => a.name.toLowerCase() === e.target.value.toLowerCase());
                                            if (matchingAssignee) {
                                                setAssigneeId(matchingAssignee.id);
                                            } else {
                                                setAssigneeId(null);
                                            }
                                        }}
                                        placeholder="Escribe un nombre..."
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            paddingRight: assigneeName ? '40px' : '10px',
                                            background: 'var(--bg-input)',
                                            border: '1px solid var(--border-color)',
                                            color: 'white',
                                            borderRadius: '6px'
                                        }}
                                    />
                                    {assigneeName && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAssigneeName('');
                                                setAssigneeId(null);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                right: '8px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'rgba(255,255,255,0.1)',
                                                border: 'none',
                                                borderRadius: '4px',
                                                width: '24px',
                                                height: '24px',
                                                cursor: 'pointer',
                                                color: 'var(--text-muted)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '14px'
                                            }}
                                            title="Limpiar asignado"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                <datalist id="assignees-datalist">
                                    {assignees
                                        .filter(assignee => assignee.name.toLowerCase() !== assigneeName.toLowerCase())
                                        .map(assignee => (
                                            <option key={assignee.id} value={assignee.name} />
                                        ))}
                                </datalist>
                                {assigneeName && !assignees.find(a => a.name.toLowerCase() === assigneeName.toLowerCase()) && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '4px', fontStyle: 'italic' }}>
                                        ✨ Se creará "{assigneeName}"
                                    </div>
                                )}
                                {!assigneeName && assignees.length > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                                        💡 Escribe para ver sugerencias o crear uno nuevo
                                    </div>
                                )}
                            </div>


                            {/* Dependencies */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Depende de</label>
                                    <button
                                        type="button"
                                        onClick={() => setEditingDependsOn(true)}
                                        disabled={areDependenciesLoading}
                                        style={{
                                            padding: '6px 12px',
                                            background: 'var(--primary)',
                                            border: 'none',
                                            borderRadius: '4px',
                                            color: 'white',
                                            fontSize: '0.8rem',
                                            cursor: areDependenciesLoading ? 'not-allowed' : 'pointer',
                                            opacity: areDependenciesLoading ? 0.7 : 1
                                        }}
                                    >
                                        {dependsOn.length > 0 ? 'Editar' : 'Agregar'}
                                    </button>
                                </div>
                                <div style={{
                                    minHeight: '50px',
                                    padding: '10px',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: areDependenciesLoading ? 'center' : 'flex-start'
                                }}>
                                    {areDependenciesLoading ? (
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderTopColor: 'white',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                    ) : dependsOn.length > 0 ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {dependsOn.map(id => {
                                                const depTask = allTasks.find(t => t.id === id);
                                                return depTask ? (
                                                    <div key={id} style={{
                                                        padding: '4px 8px',
                                                        background: 'var(--bg-panel)',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8rem'
                                                    }}>
                                                        {depTask.title}
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>Ninguna</span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Habilita a</label>
                                    <button
                                        type="button"
                                        onClick={() => setEditingEnables(true)}
                                        disabled={areDependenciesLoading}
                                        style={{
                                            padding: '6px 12px',
                                            background: 'var(--primary)',
                                            border: 'none',
                                            borderRadius: '4px',
                                            color: 'white',
                                            fontSize: '0.8rem',
                                            cursor: areDependenciesLoading ? 'not-allowed' : 'pointer',
                                            opacity: areDependenciesLoading ? 0.7 : 1
                                        }}
                                    >
                                        {enables.length > 0 ? 'Editar' : 'Agregar'}
                                    </button>
                                </div>
                                <div style={{
                                    minHeight: '50px',
                                    padding: '10px',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: areDependenciesLoading ? 'center' : 'flex-start'
                                }}>
                                    {areDependenciesLoading ? (
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderTopColor: 'white',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                    ) : enables.length > 0 ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {enables.map(id => {
                                                const enableTask = allTasks.find(t => t.id === id);
                                                return enableTask ? (
                                                    <div key={id} style={{
                                                        padding: '4px 8px',
                                                        background: 'var(--bg-panel)',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8rem'
                                                    }}>
                                                        {enableTask.title}
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>Ninguna</span>
                                    )}
                                </div>
                            </div>



                            <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                <p>Creación: {new Date(task.created_at || Date.now()).toLocaleDateString()}</p>
                                {task.node_name && <p>Nodo: <span style={{ color: task.node_color || 'white' }}>{task.node_name}</span></p>}
                            </div>

                            {errorMessage && (
                                <div style={{
                                    color: '#ff4d4f',
                                    background: 'rgba(255, 77, 79, 0.1)',
                                    border: '1px solid #ff4d4f',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    marginTop: '16px',
                                    fontSize: '0.9rem'
                                }}>
                                    {errorMessage}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={isDeleting || loading}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: isDeleting ? '#ef4444' : 'var(--text-muted)',
                                        cursor: (isDeleting || loading) ? 'not-allowed' : 'pointer',
                                        fontSize: '0.85rem',
                                        opacity: (isDeleting || loading) ? 0.7 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '4px',
                                        transition: 'color 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isDeleting && !loading) {
                                            e.currentTarget.style.color = '#ef4444';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isDeleting && !loading) {
                                            e.currentTarget.style.color = 'var(--text-muted)';
                                        }
                                    }}
                                    title="Eliminar tarea permanentemente"
                                >
                                    {isDeleting && <span className="spinner" style={{
                                        width: '12px',
                                        height: '12px',
                                        border: '2px solid rgba(239, 68, 68, 0.3)',
                                        borderTopColor: '#ef4444',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }}></span>}
                                    {isDeleting ? 'Eliminando...' : 'Eliminar'}
                                </button>
                                <div style={{ flex: 1 }} />
                                <button
                                    onClick={onClose}
                                    style={{
                                        padding: '12px 24px',
                                        background: 'transparent',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-secondary)',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.95rem',
                                        minWidth: '100px'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleSubmit()}
                                    disabled={loading || isDeleting}
                                    style={{
                                        padding: '12px 24px',
                                        background: 'var(--primary)',
                                        border: 'none',
                                        color: 'white',
                                        borderRadius: '6px',
                                        cursor: (loading || isDeleting) ? 'not-allowed' : 'pointer',
                                        fontWeight: 'bold',
                                        opacity: (loading || isDeleting) ? 0.7 : 1,
                                        display: 'flex',
                                        fontSize: '0.95rem',
                                        minWidth: '100px',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {loading && <span className="spinner" style={{
                                        width: '16px',
                                        height: '16px',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: 'white',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }}></span>}
                                    {loading ? 'Guardando...' : 'Guardar'}
                                </button>
                                <style>{`
                                    @keyframes spin {
                                        to { transform: rotate(360deg); }
                                    }
                                `}</style>
                            </div>

                        </div>
                    </div>
                </div >
            </div >
        </>
    );
};
