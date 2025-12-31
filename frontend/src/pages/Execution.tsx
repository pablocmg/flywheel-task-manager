import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { TaskCard } from '../components/TaskCard';
import { TaskEditModal } from '../components/TaskEditModal';
import { Calendar, AlertCircle } from 'lucide-react';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent, DropAnimation } from '@dnd-kit/core';
import {
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
    status: string;
    weight: number;
    priority_score: number;
    evidence_url?: string;
    week_number?: number;
    objective_title?: string;
    impacted_node_count?: number;
    impacted_nodes?: string[];
    project_name?: string;
    target_date?: string;
}

const COLUMNS = [
    { id: 'Backlog', title: 'Backlog' },
    { id: 'Todo', title: 'Por Iniciar' },
    { id: 'Doing', title: 'En Progreso' },
    { id: 'Waiting', title: 'Bloqueado' },
    { id: 'Done', title: 'Terminada' }
];

// Sortable Item Component
function SortableTaskItem({ task, nodeColors, onEdit }: { task: Task; nodeColors: Record<string, string>; onEdit: (t: Task) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id, data: { type: 'Task', task } });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <TaskCard task={task} onUpdate={() => { }} nodeColors={nodeColors} onEdit={onEdit} />
        </div>
    );
}

// Column Component
function KanbanColumn({ id, title, tasks, nodeColors, onEdit }: { id: string; title: string; tasks: Task[]; nodeColors: Record<string, string>; onEdit: (t: Task) => void }) {
    const { setNodeRef } = useSortable({ id: id, data: { type: 'Column', id } });

    return (
        <div
            ref={setNodeRef}
            style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                width: '300px',
                minWidth: '300px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                maxHeight: 'calc(100vh - 200px)',
            }}
        >
            <div style={{
                padding: 'var(--space-md)',
                borderBottom: '1px solid var(--glass-border)',
                fontWeight: 'bold',
                color: 'var(--primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                {title}
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                    {tasks.length}
                </span>
            </div>

            <div style={{ flex: 1, padding: '8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map(task => (
                        <SortableTaskItem key={task.id} task={task} nodeColors={nodeColors} onEdit={onEdit} />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}

const Execution: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [nodeColors, setNodeColors] = useState<Record<string, string>>({});
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [allProjects, setAllProjects] = useState<string[]>([]);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null); // State for Edit Modal

    // Reprioritization State
    const [showReprioritizeModal, setShowReprioritizeModal] = useState(false);
    const [reason, setReason] = useState('');
    const [reorderParams, setReorderParams] = useState<{ taskId: string, newIndex: number, columnId: string } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        loadNodesAndTasks();
    }, []);

    const loadNodesAndTasks = async () => {
        try {
            const nodesData = await api.getNodes();
            const colorMap: Record<string, string> = {};
            nodesData.forEach((n: any) => colorMap[n.id] = n.color);
            setNodeColors(colorMap);

            const data = await api.getAllTasks();
            // Default sort by priority_score desc
            data.sort((a: Task, b: Task) => b.priority_score - a.priority_score);
            setTasks(data);

            const projects = Array.from(new Set(data.map((t: Task) => t.project_name).filter(Boolean))) as string[];
            setAllProjects(projects);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdate = () => {
        loadNodesAndTasks();
    };

    // Derived state for columns
    const columns = useMemo(() => {
        const cols: Record<string, Task[]> = {
            Backlog: [],
            Todo: [],
            Doing: [],
            Waiting: [],
            Done: []
        };

        // Filter by project if selected
        const visibleTasks = selectedProject === 'all'
            ? tasks
            : tasks.filter(t => t.project_name === selectedProject);

        visibleTasks.forEach(task => {
            let statusKey = task.status;
            if (statusKey === 'Blocked') statusKey = 'Waiting';
            if (!cols[statusKey]) {
                if (statusKey === 'Todo') statusKey = 'Todo';
                else if (statusKey === 'Doing') statusKey = 'Doing';
                else if (statusKey === 'Done') statusKey = 'Done';
                else statusKey = 'Backlog';
            }

            if (cols[statusKey]) {
                cols[statusKey].push(task);
            }
        });

        return cols;
    }, [tasks, selectedProject]);

    // DnD Handlers
    const onDragStart = (event: DragStartEvent) => {
        if (event.active.data.current?.type === 'Task') {
            setActiveTask(event.active.data.current.task);
        }
    };

    const onDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveTask = active.data.current?.type === 'Task';
        if (!isActiveTask) return;
    };

    const onDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeTask = tasks.find(t => t.id === activeId);
        if (!activeTask) return;

        // 1. Determine destination column and index
        let newStatus = activeTask.status;

        if (over.data.current?.type === 'Column') {
            newStatus = over.id as string;
        } else if (over.data.current?.type === 'Task') {
            const overTask = tasks.find(t => t.id === overId);
            if (overTask) {
                newStatus = overTask.status;
            }
        }

        // Check if Status Changed
        if (activeTask.status !== newStatus) {
            // Optimistic update
            setTasks(prev => {
                return prev.map(t => {
                    if (t.id === activeId) return { ...t, status: newStatus };
                    return t;
                });
            });

            try {
                // Call API
                await api.updateTaskStatus(activeId, newStatus);
                console.log(`Updated status of ${activeId} to ${newStatus}`);
            } catch (err) {
                console.error("Failed to update status", err);
                handleUpdate(); // revert
            }
        }

        // Check if Reordered (Priority Change)
        if (activeId !== overId) {
            if (activeTask.status === newStatus) {
                const currentColumnTasks = columns[newStatus];
                const oldIndex = currentColumnTasks.findIndex(t => t.id === activeId);
                const targetIndex = currentColumnTasks.findIndex(t => t.id === overId);

                if (oldIndex !== targetIndex) {
                    // Trigger Reorder Modal
                    setReorderParams({ taskId: activeId, newIndex: targetIndex, columnId: newStatus });
                    setShowReprioritizeModal(true);
                }
            }
        }
    };

    const confirmReprioritization = async () => {
        if (!reorderParams || !reason) return;

        try {
            const task = tasks.find(t => t.id === reorderParams.taskId);
            await api.updateTaskPriority(reorderParams.taskId, task?.priority_score || 0, reason);

            setShowReprioritizeModal(false);
            setReason('');
            setReorderParams(null);
            handleUpdate(); // Refresh from server to restore sort order (since we didn't really change score comfortably)
            alert('Cambio de prioridad registrado. (Nota: El reordenamiento manual exacto requiere ajuste de puntajes en backend, por ahora se ha registrado el evento).');
        } catch (e) {
            console.error(e);
        }
    };

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    return (
        <div style={{ padding: '0 20px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', marginTop: '20px' }}>
                <div>
                    <h1 className="title-gradient" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <Calendar /> Tablero de Ejecución
                    </h1>
                    <p className="text-muted">Gestión visual de tareas. Arrastra para cambiar estado o repriorizar (requiere motivo).</p>
                </div>
                <div style={{ display: 'flex', gap: '20px' }}>

                    {allProjects.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
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
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
            >
                <div style={{
                    display: 'flex',
                    gap: '16px',
                    overflowX: 'auto',
                    paddingBottom: '20px',
                    height: '100%'
                }}>
                    {COLUMNS.map(col => (
                        <KanbanColumn
                            key={col.id}
                            id={col.id}
                            title={col.title}
                            tasks={columns[col.id as keyof typeof columns] || []}
                            nodeColors={nodeColors}
                            onEdit={setEditingTask}
                        />
                    ))}
                </div>

                <DragOverlay dropAnimation={dropAnimation}>
                    {activeTask ? (
                        <div style={{ transform: 'rotate(3deg)' }}>
                            <TaskCard task={activeTask} onUpdate={() => { }} nodeColors={nodeColors} onEdit={() => { }} />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Edit Modal */}
            <TaskEditModal
                isOpen={!!editingTask}
                task={editingTask}
                onClose={() => setEditingTask(null)}
                onUpdate={handleUpdate}
                projects={allProjects}
            />

            {showReprioritizeModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ width: '400px', padding: 'var(--space-lg)', background: 'var(--bg-panel)' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
                            <AlertCircle size={20} color="var(--warning)" />
                            Registro de Repriorización
                        </h3>
                        <p>Estás cambiando el orden de prioridad. Por favor indica el motivo.</p>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Motivo del cambio..."
                            style={{ width: '100%', height: '80px', margin: '10px 0', background: 'var(--bg-app)', color: 'white', border: '1px solid var(--text-muted)' }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setShowReprioritizeModal(false); setReorderParams(null); }} style={{ background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-secondary)', padding: '8px 16px', cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={confirmReprioritization} disabled={!reason} style={{ background: reason ? 'var(--primary)' : 'gray', color: 'white', border: 'none', padding: '8px 16px', cursor: 'pointer' }}>Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Execution;
