import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ChevronDown, ChevronRight, Plus, Calendar, CheckSquare } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    description: string;
    status: string;
    weight: number;
    week_number: number;
}

interface Objective {
    id: string;
    description: string;
    target_value: number;
    current_value: number;
    tasks?: Task[];
}

interface Node {
    id: string;
    name: string;
    color: string;
    objectives?: Objective[];
}

const Planning: React.FC = () => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());

    // Task Creation State
    const [newTaskObjId, setNewTaskObjId] = useState<string | null>(null);
    const [newTask, setNewTask] = useState<{ title: string, description: string, weight: number, week_number: number, impacted_node_ids: string[] }>({ title: '', description: '', weight: 3, week_number: getCurrentWeek(), impacted_node_ids: [] });

    function getCurrentWeek() {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const nodesData = await api.getNodes();
            // Load objectives for each node
            const nodesWithObjs = await Promise.all(nodesData.map(async (n: Node) => {
                const objs = await api.getObjectives(n.id);
                // Load tasks for each objective
                const objsWithTasks = await Promise.all(objs.map(async (o: Objective) => {
                    const tasks = await api.getTasksByObjective(o.id);
                    return { ...o, tasks };
                }));
                return { ...n, objectives: objsWithTasks };
            }));
            setNodes(nodesWithObjs);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const toggleNode = (id: string) => {
        const next = new Set(expandedNodes);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedNodes(next);
    };

    const toggleObjective = (id: string) => {
        const next = new Set(expandedObjectives);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedObjectives(next);
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskObjId) return;
        try {
            await api.createTask({
                ...newTask,
                objective_id: newTaskObjId,
                assignee_id: null // TODO: Add auth
            });
            setNewTaskObjId(null);
            setNewTask({ title: '', description: '', weight: 3, week_number: getCurrentWeek() });
            loadData(); // Reload to show new task
        } catch (err) {
            console.error(err);
            alert('Failed to create task');
        }
    };

    return (
        <div style={{ paddingBottom: '100px' }}>
            <div style={{ marginBottom: 'var(--space-lg)' }}>
                <h1>Strategic Planning</h1>
                <p className="text-muted">Break down Strategic Objectives into Operational Tasks.</p>
            </div>

            {loading ? <p>Loading hierarchy...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {nodes.map(node => (
                        <div key={node.id} className="glass-panel" style={{ borderLeft: `4px solid ${node.color}` }}>
                            <div
                                onClick={() => toggleNode(node.id)}
                                style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', cursor: 'pointer' }}
                            >
                                {expandedNodes.has(node.id) ? <ChevronDown /> : <ChevronRight />}
                                <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{node.name}</span>
                                <span className="text-muted" style={{ fontSize: '0.9rem' }}>({node.objectives?.length || 0} OKRs)</span>
                            </div>

                            {expandedNodes.has(node.id) && (
                                <div style={{ padding: '0 var(--space-md) var(--space-md) var(--space-xl)' }}>
                                    {node.objectives?.length === 0 && <p className="text-muted">No Objectives defined.</p>}
                                    {node.objectives?.map(obj => (
                                        <div key={obj.id} style={{ marginBottom: 'var(--space-md)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: 'var(--space-sm)' }}>
                                            <div
                                                onClick={() => toggleObjective(obj.id)}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: '8px' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {expandedObjectives.has(obj.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    <span>{obj.description}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setNewTaskObjId(obj.id); }}
                                                    style={{ background: 'var(--primary)', border: 'none', color: 'white', borderRadius: '4px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                >
                                                    <Plus size={14} /> Add Task
                                                </button>
                                            </div>

                                            {/* New Task Form */}
                                            {newTaskObjId === obj.id && (
                                                <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', marginBottom: '10px' }}>
                                                    <form onSubmit={handleCreateTask}>
                                                        <input
                                                            placeholder="Task Title"
                                                            value={newTask.title}
                                                            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                                            style={{ width: '100%', marginBottom: '8px', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--text-muted)', color: 'white' }}
                                                            autoFocus
                                                        />
                                                        <input
                                                            placeholder="Description"
                                                            value={newTask.description}
                                                            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                                            style={{ width: '100%', marginBottom: '8px', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--text-muted)', color: 'white' }}
                                                        />

                                                        {/* User Story 2.1: Enablers / Impacted Nodes */}
                                                        <div style={{ marginBottom: '8px' }}>
                                                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Enables / Impacts other nodes:</label>
                                                            <select
                                                                multiple
                                                                value={newTask.impacted_node_ids}
                                                                onChange={e => setNewTask({ ...newTask, impacted_node_ids: Array.from(e.target.selectedOptions, option => option.value) })}
                                                                style={{ width: '100%', height: '60px', padding: '4px', background: 'var(--bg-app)', border: '1px solid var(--text-muted)', color: 'white' }}
                                                            >
                                                                {nodes.filter(n => n.id !== node.id).map(n => (
                                                                    <option key={n.id} value={n.id}>{n.name}</option>
                                                                ))}
                                                            </select>
                                                            <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hold Ctrl/Cmd to select multiple</small>
                                                        </div>

                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <input
                                                                placeholder="Week #"
                                                                type="number"
                                                                value={newTask.week_number}
                                                                onChange={e => setNewTask({ ...newTask, week_number: parseInt(e.target.value) })}
                                                                style={{ width: '80px', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--text-muted)', color: 'white' }}
                                                            />
                                                            <input
                                                                placeholder="Weight (1-5)"
                                                                type="number"
                                                                max={5} min={1}
                                                                value={newTask.weight}
                                                                onChange={e => setNewTask({ ...newTask, weight: parseInt(e.target.value) })}
                                                                style={{ width: '80px', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--text-muted)', color: 'white' }}
                                                            />
                                                            <button type="submit" style={{ flex: 1, background: 'var(--success)', color: 'white', border: 'none', cursor: 'pointer' }}>Save Task</button>
                                                            <button type="button" onClick={() => setNewTaskObjId(null)} style={{ background: 'gray', color: 'white', border: 'none', padding: '0 10px', cursor: 'pointer' }}>Cancel</button>
                                                        </div>
                                                    </form>
                                                </div>
                                            )}

                                            {/* Tasks List */}
                                            {expandedObjectives.has(obj.id) && (
                                                <div style={{ paddingLeft: '24px' }}>
                                                    {obj.tasks?.length === 0 && <span className="text-muted" style={{ fontSize: '0.9rem' }}>No tasks planned.</span>}
                                                    {obj.tasks?.map(task => (
                                                        <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <CheckSquare size={14} color={task.status === 'Done' ? 'var(--success)' : 'var(--text-muted)'} />
                                                                <span style={{ textDecoration: task.status === 'Done' ? 'line-through' : 'none', color: task.status === 'Done' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{task.title}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> Week {task.week_number}</span>
                                                                <span>Weight: {task.weight}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Planning;
