import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TaskCard } from '../components/TaskCard';
import { Calendar, AlertCircle } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Task {
    id: string;
    title: string;
    description: string;
    status: 'Todo' | 'Doing' | 'Waiting' | 'Done';
    weight: number;
    priority_score: number;
    evidence_url?: string;
    week_number: number;
    objective_title?: string;
    impacted_node_count?: number;
    impacted_nodes?: string[];
    project_name?: string;
}

// Sortable Item Component
function SortableTaskItem(props: { task: Task; onUpdate: () => void; nodeColors: Record<string, string> }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: props.task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        marginBottom: '8px'
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <TaskCard task={props.task} onUpdate={props.onUpdate} nodeColors={props.nodeColors} />
        </div>
    );
}

const Execution: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [nodeColors, setNodeColors] = useState<Record<string, string>>({});
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [allProjects, setAllProjects] = useState<string[]>([]);

    // Calculate current week
    const getWeekNumber = (d: Date) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return weekNo;
    };
    const currentWeek = getWeekNumber(new Date());
    const [selectedWeek, setSelectedWeek] = useState(currentWeek);

    // Reprioritization State
    const [showModal, setShowModal] = useState(false);
    const [reason, setReason] = useState('');
    const [dragResult, setDragResult] = useState<{ activeId: string, overId: string } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        loadNodesAndTasks();
    }, [selectedWeek]);

    const loadNodesAndTasks = async () => {
        setLoading(true);
        try {
            // Fetch Nodes for color mapping
            const nodesData = await api.getNodes();
            const colorMap: Record<string, string> = {};
            nodesData.forEach((n: any) => {
                colorMap[n.id] = n.color;
            });
            setNodeColors(colorMap);

            const data = await api.getTasksByWeek(selectedWeek);
            // Sort by priority_score
            data.sort((a: Task, b: Task) => b.priority_score - a.priority_score);
            setTasks(data);

            // Extract unique project names for filter
            const projects = Array.from(new Set(data.map((t: Task) => t.project_name).filter(Boolean))) as string[];
            setAllProjects(projects);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleUpdate = () => {
        loadNodesAndTasks();
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setDragResult({
                activeId: active.id as string,
                overId: over?.id as string
            });
            setShowModal(true);
        }
    };

    const confirmReprioritization = async () => {
        if (!dragResult || !reason) return;

        // 1. Optimistic Update
        setTasks((items) => {
            const oldIndex = items.findIndex(i => i.id === dragResult.activeId);
            const newIndex = items.findIndex(i => i.id === dragResult.overId);
            return arrayMove(items, oldIndex, newIndex);
        });

        // 2. Call API (Log Audit) - In real app, we also update priority scores to persist order.
        // For this MVP, we just log the reason.
        try {
            const task = tasks.find(t => t.id === dragResult.activeId);
            await api.updateTaskPriority(dragResult.activeId, task?.priority_score || 0, reason);
        } catch (e) {
            console.error("Failed to log priority change", e);
            // Revert or alert?
        }

        setShowModal(false);
        setReason('');
        setDragResult(null);
    };

    const cancelDrag = () => {
        setShowModal(false);
        setDragResult(null);
        setReason('');
    };

    const filteredTasks = selectedProject === 'all'
        ? tasks
        : tasks.filter(t => t.project_name === selectedProject);

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <div>
                    <h1 className="title-gradient" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <Calendar /> Modo Ejecución
                    </h1>
                    <p className="text-muted">Concéntrate en completar tareas de alto impacto para la Semana {selectedWeek}. Arrastra para repriorizar.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <label>Semana:</label>
                    <input
                        type="number"
                        value={selectedWeek}
                        onChange={(e) => setSelectedWeek(Number(e.target.value))}
                        style={{ padding: '8px', width: '80px', background: 'var(--bg-app)', color: 'white', border: '1px solid var(--glass-border)' }}
                    />
                </div>
                {allProjects.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <label>Proyecto:</label>
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            style={{ padding: '8px', background: 'var(--bg-app)', color: 'white', border: '1px solid var(--glass-border)' }}
                        >
                            <option value="all">Todos los proyectos</option>
                            {allProjects.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {loading ? <p>Cargando tareas priorizadas...</p> : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={filteredTasks.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="tasks-grid">
                            {filteredTasks.length === 0 ? (
                                <p className="text-muted">No hay tareas que coincidan con los filtros.</p>
                            ) : (
                                filteredTasks.map(task => (
                                    <SortableTaskItem key={task.id} task={task} onUpdate={handleUpdate} nodeColors={nodeColors} />
                                ))
                            )}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {showModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ width: '400px', padding: 'var(--space-lg)', background: 'var(--bg-panel)' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
                            <AlertCircle size={20} color="var(--warning)" />
                            Registro de Repriorización
                        </h3>
                        <p>Estás cambiando el orden de prioridad estratégica. Por favor indica el motivo para el Registro de Auditoría.</p>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Motivo del cambio..."
                            style={{ width: '100%', height: '80px', margin: '10px 0', background: 'var(--bg-app)', color: 'white', border: '1px solid var(--text-muted)' }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={cancelDrag} style={{ background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-secondary)', padding: '8px 16px', cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={confirmReprioritization} disabled={!reason} style={{ background: reason ? 'var(--primary)' : 'gray', color: 'white', border: 'none', padding: '8px 16px', cursor: 'pointer' }}>Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Execution;
