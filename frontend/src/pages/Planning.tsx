import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ChevronDown, ChevronRight, Plus, Calendar, CheckSquare, Target, TrendingUp, Trash } from 'lucide-react';

interface KeyResult {
    id: string;
    description: string;
    target_value: number;
    current_value: number;
}

interface Objective {
    id: string;
    description: string;
    type: 'annual' | 'quarterly';
    quarter: string | null;
    year: number;
    key_results: KeyResult[];
    tasks?: Task[];
}

interface Task {
    id: string;
    title: string;
    description: string;
    status: string;
    weight: number;
    week_number: number;
    project_id?: string;
}

interface Project {
    id: string;
    name: string;
    description?: string;
}

interface Node {
    id: string;
    name: string;
    color: string;
    objectives?: Objective[];
}

const Planning: React.FC = () => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // KR Management
    const [showAddKR, setShowAddKR] = useState<string | null>(null); // objective ID
    const [newKR, setNewKR] = useState({ description: '', target_value: 100 });

    // Objective editing
    const [editingObjId, setEditingObjId] = useState<string | null>(null);
    const [editingObjDesc, setEditingObjDesc] = useState('');

    // Project Management
    const [showProjectsModal, setShowProjectsModal] = useState(false);
    const [editingProject, setEditingProject] = useState<any>(null);
    const [newProjectData, setNewProjectData] = useState({ name: '', description: '', objective_ids: [] as string[] });

    // Task Creation
    const [newTaskObjId, setNewTaskObjId] = useState<string | null>(null);
    const [newTaskProjects, setNewTaskProjects] = useState<Project[]>([]);
    const [newTask, setNewTask] = useState<{ title: string, description: string, weight: number, week_number: number, impacted_node_ids: string[], project_id: string }>({
        title: '',
        description: '',
        weight: 3,
        week_number: getCurrentWeek(),
        impacted_node_ids: [],
        project_id: ''
    });

    function getCurrentWeek() {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (newTaskObjId) {
            loadProjectsForObjective(newTaskObjId);
        } else {
            setNewTaskProjects([]);
        }
    }, [newTaskObjId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [nodesData, projectsData] = await Promise.all([
                api.getNodes(),
                api.getProjects()
            ]);
            setAllProjects(projectsData);

            // Load objectives and tasks for each node
            const nodesWithObjs = await Promise.all(nodesData.map(async (n: Node) => {
                const objs = await api.getObjectives(n.id);
                const objsWithTasks = await Promise.all(objs.map(async (o: Objective) => {
                    const tasks = await api.getTasksByObjective(o.id);
                    return { ...o, tasks };
                }));
                return { ...n, objectives: objsWithTasks };
            }));

            setNodes(nodesWithObjs.filter((n: any) => n.is_active !== false)); // Filter active nodes
            if (nodesWithObjs.length > 0 && !selectedNodeId) {
                setSelectedNodeId(nodesWithObjs[0].id);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const loadProjectsForObjective = async (objId: string) => {
        try {
            const projects = await api.getProjectsByObjective(objId);
            setNewTaskProjects(projects);
        } catch (err) {
            console.error('Error loading projects for objective:', err);
        }
    };

    const handleUpdateObjective = async (objId: string, newDesc: string) => {
        if (!selectedNodeId) return;
        try {
            const obj = nodes.find(n => n.id === selectedNodeId)?.objectives?.find(o => o.id === objId);
            if (!obj) return;
            await api.updateObjective(objId, { ...obj, description: newDesc });
            setEditingObjId(null);
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddKR = async (objId: string) => {
        if (!newKR.description) return;
        try {
            await api.createKeyResult({ ...newKR, objective_id: objId });
            setShowAddKR(null);
            setNewKR({ description: '', target_value: 100 });
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteKR = async (krId: string) => {
        if (confirm('¿Eliminar este resultado clave?')) {
            try {
                await api.deleteKeyResult(krId);
                loadData();
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskObjId) return;
        try {
            await api.createTask({
                ...newTask,
                objective_id: newTaskObjId,
                assignee_id: null
            });
            setNewTaskObjId(null);
            setNewTask({ title: '', description: '', weight: 3, week_number: getCurrentWeek(), impacted_node_ids: [], project_id: '' });
            loadData();
        } catch (err) {
            console.error(err);
            alert('Error al crear la tarea');
        }
    };

    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    const annualObj = selectedNode?.objectives?.find(o => o.type === 'annual');
    const quarterlyObjs = selectedNode?.objectives?.filter(o => o.type === 'quarterly').sort((a, b) => (a.quarter || '').localeCompare(b.quarter || ''));

    const renderObjectiveCard = (obj: Objective, title: string, color: string) => {
        const progress = obj.key_results?.length > 0
            ? Math.round((obj.key_results.reduce((sum, kr) => sum + (kr.current_value / kr.target_value), 0) / obj.key_results.length) * 100)
            : 0;

        return (
            <div key={obj.id} className="glass-panel" style={{ padding: 'var(--space-md)', borderLeft: `4px solid ${color}` }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', color: color, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                            {title}
                        </div>
                        {editingObjId === obj.id ? (
                            <input
                                autoFocus
                                value={editingObjDesc}
                                onChange={e => setEditingObjDesc(e.target.value)}
                                onBlur={() => handleUpdateObjective(obj.id, editingObjDesc)}
                                onKeyDown={e => e.key === 'Enter' && handleUpdateObjective(obj.id, editingObjDesc)}
                                style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-app)', border: '1px solid var(--primary)', color: 'white', borderRadius: '4px', fontSize: '0.95rem', fontWeight: 500 }}
                            />
                        ) : (
                            <h3
                                onClick={() => { setEditingObjId(obj.id); setEditingObjDesc(obj.description); }}
                                style={{ margin: 0, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500 }}
                            >
                                {obj.description}
                            </h3>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{progress}%</div>
                        <button
                            onClick={() => setShowAddKR(showAddKR === obj.id ? null : obj.id)}
                            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}
                        >
                            <Plus size={14} style={{ marginRight: '2px' }} /> KR
                        </button>
                    </div>
                </div>

                {/* Key Results */}
                <div style={{ paddingLeft: '8px', borderLeft: '2px solid rgba(255,255,255,0.1)', marginBottom: 'var(--space-sm)' }}>
                    {obj.key_results?.map(kr => (
                        <div key={kr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                <TrendingUp size={12} color={color} />
                                <span>{kr.description}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({kr.current_value}/{kr.target_value})</span>
                            </div>
                            <button
                                onClick={() => handleDeleteKR(kr.id)}
                                style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.4)', cursor: 'pointer', padding: '2px' }}
                                onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                                onMouseOut={e => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.4)'}
                            >
                                <Trash size={12} />
                            </button>
                        </div>
                    ))}

                    {obj.key_results?.length === 0 && !showAddKR && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                            Sin resultados clave
                        </div>
                    )}

                    {showAddKR === obj.id && (
                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                            <input
                                placeholder="Nuevo KR"
                                value={newKR.description}
                                onChange={e => setNewKR({ ...newKR, description: e.target.value })}
                                style={{ flex: 1, padding: '4px 8px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.8rem', borderRadius: '4px' }}
                            />
                            <input
                                type="number"
                                placeholder="100"
                                value={newKR.target_value}
                                onChange={e => setNewKR({ ...newKR, target_value: Number(e.target.value) })}
                                style={{ width: '60px', padding: '4px 8px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.8rem', borderRadius: '4px' }}
                            />
                            <button
                                onClick={() => handleAddKR(obj.id)}
                                style={{ padding: '4px 12px', background: 'var(--primary)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.8rem', borderRadius: '4px' }}
                            >
                                OK
                            </button>
                        </div>
                    )}
                </div>

                {/* Tasks Section */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 'var(--space-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TAREAS ({obj.tasks?.length || 0})</span>
                        <button
                            onClick={() => setNewTaskObjId(newTaskObjId === obj.id ? null : obj.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                        >
                            <Plus size={14} /> Nueva
                        </button>
                    </div>

                    {newTaskObjId === obj.id && (
                        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', marginBottom: '10px' }}>
                            <form onSubmit={handleCreateTask}>
                                <input
                                    placeholder="Título de Tarea"
                                    value={newTask.title}
                                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                    style={{ width: '100%', marginBottom: '8px', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--text-muted)', color: 'white' }}
                                    autoFocus
                                />
                                <input
                                    placeholder="Descripción"
                                    value={newTask.description}
                                    onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                    style={{ width: '100%', marginBottom: '8px', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--text-muted)', color: 'white' }}
                                />

                                <div style={{ marginBottom: '8px' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Proyecto:</label>
                                    <select
                                        value={newTask.project_id}
                                        onChange={e => setNewTask({ ...newTask, project_id: e.target.value })}
                                        style={{ width: '100%', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'white' }}
                                    >
                                        <option value="">Sin Proyecto</option>
                                        {newTaskProjects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        placeholder="Semana #"
                                        type="number"
                                        value={newTask.week_number}
                                        onChange={e => setNewTask({ ...newTask, week_number: parseInt(e.target.value) })}
                                        style={{ width: '80px', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--text-muted)', color: 'white' }}
                                    />
                                    <input
                                        placeholder="Peso (1-5)"
                                        type="number"
                                        max={5} min={1}
                                        value={newTask.weight}
                                        onChange={e => setNewTask({ ...newTask, weight: parseInt(e.target.value) })}
                                        style={{ width: '80px', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--text-muted)', color: 'white' }}
                                    />
                                    <button type="submit" style={{ flex: 1, background: 'var(--success)', color: 'white', border: 'none', cursor: 'pointer' }}>Guardar</button>
                                    <button type="button" onClick={() => setNewTaskObjId(null)} style={{ background: 'gray', color: 'white', border: 'none', padding: '0 10px', cursor: 'pointer' }}>✕</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {obj.tasks?.slice(0, 3).map(task => (
                            <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                    <CheckSquare size={12} color={task.status === 'Done' ? 'var(--success)' : 'var(--text-muted)'} />
                                    <span style={{ fontSize: '0.8rem', textDecoration: task.status === 'Done' ? 'line-through' : 'none', color: task.status === 'Done' ? 'var(--text-muted)' : 'white' }}>{task.title}</span>
                                </div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>S{task.week_number}</span>
                            </div>
                        ))}
                        {(obj.tasks?.length || 0) > 3 && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '4px 8px' }}>
                                +{(obj.tasks?.length || 0) - 3} más...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: 'var(--space-lg)', paddingBottom: '100px' }}>
            <div style={{ marginBottom: 'var(--space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Planificación Estratégica</h1>
                    <p className="text-muted">Gestiona objetivos, resultados clave y proyectos por nodo.</p>
                </div>
                <button
                    onClick={() => setShowProjectsModal(true)}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-color)',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 600,
                        transition: 'all 0.2s ease'
                    }}
                >
                    📂 Gestionar Proyectos
                </button>
            </div>

            {loading ? <p>Cargando...</p> : (
                <>
                    {/* Node Selector */}
                    {nodes.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-lg)' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Seleccionar Nodo:</label>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                                {nodes.map(node => (
                                    <button
                                        key={node.id}
                                        onClick={() => setSelectedNodeId(node.id)}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: 'var(--radius-md)',
                                            border: selectedNodeId === node.id ? `2px solid ${node.color}` : '1px solid var(--border-color)',
                                            background: selectedNodeId === node.id ? `${node.color}22` : 'transparent',
                                            color: selectedNodeId === node.id ? node.color : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontWeight: selectedNodeId === node.id ? 600 : 400,
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {node.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedNode && (
                        <div>
                            {/* Annual Objective */}
                            {annualObj && (
                                <div style={{ marginBottom: 'var(--space-xl)' }}>
                                    <h2 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Target size={24} color={selectedNode.color} />
                                        Objetivo Anual {annualObj.year}
                                    </h2>
                                    {renderObjectiveCard(annualObj, `Anual ${annualObj.year}`, selectedNode.color)}
                                </div>
                            )}

                            {/* Quarterly Objectives */}
                            {quarterlyObjs && quarterlyObjs.length > 0 && (
                                <div>
                                    <h2 style={{ marginBottom: 'var(--space-md)' }}>Objetivos Trimestrales</h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--space-md)' }}>
                                        {quarterlyObjs.map(q => renderObjectiveCard(q, q.quarter || 'Quarter', selectedNode.color))}
                                    </div>
                                </div>
                            )}

                            {!annualObj && (!quarterlyObjs || quarterlyObjs.length === 0) && (
                                <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                                    <p>Este nodo aún no tiene objetivos configurados.</p>
                                    <p style={{ fontSize: '0.9rem' }}>Ve a "Config Nodos" para definir tus OKRs.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Project Management Modal (same as before) */}
            {showProjectsModal && (
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
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto', padding: 'var(--space-xl)', position: 'relative' }}>
                        <button
                            onClick={() => { setShowProjectsModal(false); setEditingProject(null); }}
                            style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            ✕ Cerrar
                        </button>

                        <h2 style={{ marginTop: 0 }}>📂 Gestión de Proyectos Globales</h2>

                        {/* New/Edit Project Form */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-xl)', border: '1px solid var(--border-color)' }}>
                            <h3 style={{ marginTop: 0 }}>{editingProject ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <input
                                    placeholder="Nombre del Proyecto"
                                    value={newProjectData.name}
                                    onChange={e => setNewProjectData({ ...newProjectData, name: e.target.value })}
                                    style={{ padding: '12px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'white', borderRadius: 'var(--radius-sm)' }}
                                />
                                <textarea
                                    placeholder="Descripción"
                                    value={newProjectData.description}
                                    onChange={e => setNewProjectData({ ...newProjectData, description: e.target.value })}
                                    style={{ padding: '12px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'white', borderRadius: 'var(--radius-sm)', minHeight: '80px' }}
                                />

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Vincular a Objetivos (Mínimo 1):</label>
                                    <div style={{ maxHeight: '200px', overflow: 'auto', padding: '10px', background: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                        {nodes.length === 0 || nodes.every(n => !n.objectives || n.objectives.length === 0) ? (
                                            <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--warning)', fontSize: '0.9rem' }}>
                                                ⚠️ No hay objetivos estratégicos creados. Crea al menos uno antes de gestionar proyectos.
                                            </div>
                                        ) : (
                                            nodes.map(node => (
                                                <div key={node.id} style={{ marginBottom: '10px' }}>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: node.color, marginBottom: '4px' }}>{node.name}</div>
                                                    {node.objectives?.map(obj => (
                                                        <label key={obj.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer', fontSize: '0.9rem' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={newProjectData.objective_ids.includes(obj.id)}
                                                                onChange={e => {
                                                                    const ids = e.target.checked
                                                                        ? [...newProjectData.objective_ids, obj.id]
                                                                        : newProjectData.objective_ids.filter(id => id !== obj.id);
                                                                    setNewProjectData({ ...newProjectData, objective_ids: ids });
                                                                }}
                                                            />
                                                            {obj.type === 'annual' ? '🎯 ' : ''}{obj.description} {obj.quarter && `(${obj.quarter})`}
                                                        </label>
                                                    ))}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                                    <button
                                        onClick={async () => {
                                            if (!newProjectData.name || newProjectData.objective_ids.length === 0) {
                                                alert('El nombre y al menos un objetivo son obligatorios.');
                                                return;
                                            }
                                            try {
                                                if (editingProject) {
                                                    await api.updateProject(editingProject.id, newProjectData);
                                                } else {
                                                    await api.createProject(newProjectData);
                                                }
                                                setNewProjectData({ name: '', description: '', objective_ids: [] });
                                                setEditingProject(null);
                                                loadData();
                                            } catch (err) {
                                                console.error(err);
                                            }
                                        }}
                                        style={{ flex: 1, background: 'var(--success)', color: 'white', border: 'none', padding: '12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        {editingProject ? 'Actualizar' : 'Crear Proyecto'}
                                    </button>
                                    {editingProject && (
                                        <button
                                            onClick={() => { setEditingProject(null); setNewProjectData({ name: '', description: '', objective_ids: [] }); }}
                                            style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '12px 20px', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Existing Projects List */}
                        <div>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>Proyectos Existentes</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                {allProjects.map(p => (
                                    <div key={p.id} style={{ padding: 'var(--space-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(p as any).objective_ids?.length || 0} objetivos vinculados</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button
                                                onClick={() => {
                                                    setEditingProject(p);
                                                    setNewProjectData({
                                                        name: p.name,
                                                        description: (p as any).description || '',
                                                        objective_ids: (p as any).objective_ids || []
                                                    });
                                                }}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem' }}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (window.confirm('¿Eliminar proyecto?')) {
                                                        await api.deleteProject(p.id);
                                                        loadData();
                                                    }
                                                }}
                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Planning;
