import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { TaskCard } from '../components/TaskCard';
import { TaskEditModal } from '../components/TaskEditModal';
import { Calendar } from 'lucide-react';
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

type SwimlaneMode = 'none' | 'nodes' | 'projects';

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
    project_id?: string;
    project_name?: string;
    target_date?: string;
    node_id?: string;
    node_name?: string;
    node_color?: string;
}

interface SwimlaneData {
    id: string;
    name: string;
    color?: string;
    columns: Record<string, Task[]>;
}

const COLUMNS = [
    { id: 'Backlog', title: 'Backlog' },
    { id: 'Todo', title: 'Por Iniciar' },
    { id: 'Doing', title: 'En Progreso' },
    { id: 'Waiting', title: 'Bloqueado' },
    { id: 'Done', title: 'Terminada' }
];

// Sortable Item Component
function SortableTaskItem({
    task,
    nodeColors,
    onEdit,
    swimlaneId,
    index
}: {
    task: Task;
    nodeColors: Record<string, string>;
    onEdit: (t: Task) => void;
    swimlaneId?: string;
    index?: number;
}) {
    const itemId = swimlaneId ? `${swimlaneId}-${task.id}` : task.id;
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: itemId, data: { type: 'Task', task, swimlaneId } });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <TaskCard task={task} index={index} onUpdate={() => { }} nodeColors={nodeColors} onEdit={onEdit} />
        </div>
    );
}

// Swimlane Row Component
function SwimlaneRow({
    swimlane,
    nodeColors,
    onEdit,
    mode
}: {
    swimlane: SwimlaneData;
    nodeColors: Record<string, string>;
    onEdit: (t: Task) => void;
    mode: 'nodes' | 'projects';
}) {
    return (
        <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--glass-border)',
            minHeight: '200px'
        }}>
            {/* Swimlane Header */}
            <div style={{
                width: '200px',
                minWidth: '200px',
                padding: 'var(--space-md)',
                background: 'var(--glass-bg)',
                borderRight: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                position: 'sticky',
                left: 0,
                zIndex: 10
            }}>
                {mode === 'nodes' && swimlane.color && (
                    <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: swimlane.color,
                        flexShrink: 0
                    }} />
                )}
                <span style={{
                    fontWeight: 'bold',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                }}>
                    {swimlane.name}
                </span>
            </div>

            {/* Columns */}
            <div style={{
                display: 'flex',
                flex: 1,
                gap: '16px',
                padding: '8px'
            }}>
                {COLUMNS.map(col => (
                    <div
                        key={col.id}
                        style={{
                            flex: 1,
                            minWidth: '250px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}
                    >
                        <SortableContext
                            items={swimlane.columns[col.id].map(t => `${swimlane.id}-${t.id}`)}
                            strategy={verticalListSortingStrategy}
                        >
                            {swimlane.columns[col.id].map((task, idx) => (
                                <SortableTaskItem
                                    key={`${swimlane.id}-${task.id}`}
                                    task={task}
                                    index={idx}
                                    nodeColors={nodeColors}
                                    onEdit={onEdit}
                                    swimlaneId={swimlane.id}
                                />
                            ))}
                        </SortableContext>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Column Component (for flat view)
function KanbanColumn({ id, title, tasks, nodeColors, onEdit }: { id: string; title: string; tasks: Task[]; nodeColors: Record<string, string>; onEdit: (t: Task) => void }) {
    const { setNodeRef } = useSortable({ id: id, data: { type: 'Column', id } });

    return (
        <div style={{ display: 'flex', gap: '8px', height: '100%', maxHeight: 'calc(100vh - 200px)' }}>
            {/* Priority Indicator - Only show on first column */}
            {id === 'Backlog' && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    paddingRight: '8px',
                    color: 'rgba(255,255,255,0.3)',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    letterSpacing: '2px',
                    textTransform: 'uppercase'
                }}>
                    <div style={{
                        fontSize: '1.5rem',
                        color: 'rgba(255,255,255,0.4)',
                        lineHeight: 1
                    }}>↑</div>
                    <div style={{
                        width: '2px',
                        height: '60px',
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), rgba(255,255,255,0.1))',
                        borderRadius: '1px'
                    }}></div>
                    <div style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)'
                    }}>Prioridad</div>
                </div>
            )}

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
                        {tasks.map((task, idx) => (
                            <SortableTaskItem key={task.id} task={task} index={idx} nodeColors={nodeColors} onEdit={onEdit} />
                        ))}
                    </SortableContext>
                </div>
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
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [swimlaneMode, setSwimlaneMode] = useState<SwimlaneMode>('none');


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

    // Swimlane data grouping
    const swimlaneData = useMemo(() => {
        if (swimlaneMode === 'none') return null;

        const groupKey = swimlaneMode === 'nodes' ? 'node_id' : 'project_id';
        const groupName = swimlaneMode === 'nodes' ? 'node_name' : 'project_name';
        const groupColor = swimlaneMode === 'nodes' ? 'node_color' : undefined;

        const grouped = new Map<string, SwimlaneData>();

        // Filter tasks by selected project if applicable
        const visibleTasks = selectedProject === 'all'
            ? tasks
            : tasks.filter(t => t.project_name === selectedProject);

        visibleTasks.forEach(task => {
            const groupId = task[groupKey as keyof Task] as string;
            const name = task[groupName as keyof Task] as string;
            const color = groupColor ? task[groupColor as keyof Task] as string : undefined;

            if (!groupId || !name) return;

            if (!grouped.has(groupId)) {
                grouped.set(groupId, {
                    id: groupId,
                    name: name,
                    color: color,
                    columns: {
                        Backlog: [],
                        Todo: [],
                        Doing: [],
                        Waiting: [],
                        Done: []
                    }
                });
            }

            const swimlane = grouped.get(groupId)!;
            let statusKey = task.status;
            if (statusKey === 'Blocked') statusKey = 'Waiting';

            if (swimlane.columns[statusKey]) {
                swimlane.columns[statusKey].push(task);
            }
        });

        return Array.from(grouped.values());
    }, [tasks, swimlaneMode, selectedProject]);

    // Derived state for columns (flat view)
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

        const activeData = active.data.current;
        const overData = over.data.current;

        // In swimlane mode, prevent cross-swimlane drops
        if (swimlaneMode !== 'none') {
            if (activeData?.swimlaneId && overData?.swimlaneId && activeData.swimlaneId !== overData.swimlaneId) {
                return; // Prevent cross-swimlane drops
            }
        }

        const activeId = typeof active.id === 'string' ? active.id : String(active.id);
        const overId = typeof over.id === 'string' ? over.id : String(over.id);

        // Extract actual task ID (remove swimlane prefix if present)
        const actualTaskId = activeId.includes('-') ? activeId.split('-').pop()! : activeId;
        const activeTask = tasks.find(t => t.id === actualTaskId);
        if (!activeTask) return;

        // 1. Determine destination column and index
        let newStatus = activeTask.status;

        if (over.data.current?.type === 'Column') {
            newStatus = over.id as string;
        } else if (over.data.current?.type === 'Task') {
            const overTaskId = overId.includes('-') ? overId.split('-').pop()! : overId;
            const overTask = tasks.find(t => t.id === overTaskId);
            if (overTask) {
                newStatus = overTask.status;
            }
        }

        // Check if Status Changed
        if (activeTask.status !== newStatus) {
            // Optimistic update
            setTasks(prev => {
                return prev.map(t => {
                    if (t.id === actualTaskId) return { ...t, status: newStatus };
                    return t;
                });
            });

            try {
                // Call API
                await api.updateTaskStatus(actualTaskId, newStatus);
                console.log(`Updated status of ${actualTaskId} to ${newStatus}`);
            } catch (err) {
                console.error("Failed to update status", err);
                handleUpdate(); // revert
            }
        }

        // Check if Reordered (Priority Change)
        if (activeId !== overId) {
            if (activeTask.status === newStatus) {
                const currentColumnTasks = swimlaneMode === 'none'
                    ? columns[newStatus]
                    : swimlaneData?.find(s => s.id === activeData?.swimlaneId)?.columns[newStatus] || [];

                const oldIndex = currentColumnTasks.findIndex(t => t.id === actualTaskId);
                const targetTaskId = overId.includes('-') ? overId.split('-').pop()! : overId;
                const targetIndex = currentColumnTasks.findIndex(t => t.id === targetTaskId);

                if (oldIndex !== targetIndex && oldIndex !== -1 && targetIndex !== -1) {
                    // Logic to calculate new priority
                    // We need the array of tasks in the *destination* state (after move).
                    // Or we can infer from current state:
                    // If moving down (old < target), we want to be *below* target.
                    // If moving up (old > target), we want to be *above* target.

                    // Actually, let's look at the neighbors in the *sorted* list.
                    // dnd-kit gives us the `over` element. 
                    // If we drop OVER a task, it usually inserts BEFORE it in sortable context?
                    // Let's rely on standard reorder logic: 
                    // We need to find the new neighbors.

                    // Let's create a temp array of the tasks in that column to simulate the move.
                    const taskList = [...currentColumnTasks];
                    const [movedItem] = taskList.splice(oldIndex, 1);
                    taskList.splice(targetIndex, 0, movedItem);

                    // Now `taskList` has the new order. Find neighbors of `movedItem`.
                    const newIndex = targetIndex; // It's at targetIndex now.

                    const prevTask = newIndex > 0 ? taskList[newIndex - 1] : null;
                    const nextTask = newIndex < taskList.length - 1 ? taskList[newIndex + 1] : null;

                    let newScore = 0;

                    if (!prevTask && !nextTask) {
                        // Only item? Keep same or default?
                        newScore = activeTask.priority_score;
                    } else if (!prevTask && nextTask) {
                        // At top
                        newScore = nextTask.priority_score + 10;
                    } else if (prevTask && !nextTask) {
                        // At bottom
                        newScore = prevTask.priority_score - 10;
                    } else if (prevTask && nextTask) {
                        // In between
                        newScore = (prevTask.priority_score + nextTask.priority_score) / 2;
                    }

                    console.log(`Auto Reprioritize: ${activeTask.title} -> New Score: ${newScore}`);

                    // Optimistic Update
                    setTasks(prev => prev.map(t =>
                        t.id === actualTaskId ? { ...t, priority_score: newScore } : t
                    ).sort((a, b) => b.priority_score - a.priority_score)); // Re-sort to reflect change visually? 
                    // Note: Sorting might make it jump if we don't handle it carefully, but it's correct data-wise.

                    // Call API
                    api.updateTaskPriority(actualTaskId, newScore, "Auto-Drag-Drop")
                        .then(() => {
                            // Maybe silent success or toast
                        })
                        .catch(err => {
                            console.error("Failed to update priority", err);
                            handleUpdate(); // Revert on error
                        });
                }
            }
        }
    };

    const confirmReprioritization = async () => {
        // Deprecated Modal Logic
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

    const cycleSwimlaneMode = () => {
        const modes: SwimlaneMode[] = ['none', 'nodes', 'projects'];
        const currentIndex = modes.indexOf(swimlaneMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        setSwimlaneMode(modes[nextIndex]);
    };

    return (
        <div style={{ padding: '0 20px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', marginTop: '20px' }}>
                <div>
                    <h1 className="title-gradient" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <Calendar /> Tablero de Ejecución
                    </h1>
                    <p className="text-muted">Gestión visual de tareas. Arrastra para cambiar estado o repriorizar.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Swimlane Mode Toggle */}
                    <button
                        onClick={cycleSwimlaneMode}
                        style={{
                            padding: '8px 16px',
                            background: swimlaneMode !== 'none' ? 'var(--primary)' : 'var(--glass-bg)',
                            color: 'white',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: swimlaneMode !== 'none' ? 'bold' : 'normal'
                        }}
                    >
                        {swimlaneMode === 'none' && '📋 Vista Plana'}
                        {swimlaneMode === 'nodes' && '🎯 Swimlanes por Nodos'}
                        {swimlaneMode === 'projects' && '📁 Swimlanes por Proyectos'}
                    </button>

                    {allProjects.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <select
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                style={{ padding: '8px', background: 'var(--bg-app)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)' }}
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
                {swimlaneMode === 'none' ? (
                    // Flat Kanban View
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
                ) : (
                    // Swimlane View
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        {/* Sticky Column Headers */}
                        <div style={{
                            display: 'flex',
                            position: 'sticky',
                            top: 0,
                            zIndex: 20,
                            background: 'var(--bg-app)',
                            borderBottom: '2px solid var(--primary)',
                            paddingBottom: '8px'
                        }}>
                            <div style={{ width: '200px', minWidth: '200px', padding: 'var(--space-md)' }}>
                                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                                    {swimlaneMode === 'nodes' ? 'Nodos' : 'Proyectos'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flex: 1, gap: '16px', padding: '8px' }}>
                                {COLUMNS.map(col => (
                                    <div key={col.id} style={{ flex: 1, minWidth: '250px', fontWeight: 'bold', color: 'var(--primary)', textAlign: 'center' }}>
                                        {col.title}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Swimlane Rows */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {swimlaneData && swimlaneData.length > 0 ? (
                                swimlaneData.map(swimlane => (
                                    <SwimlaneRow
                                        key={swimlane.id}
                                        swimlane={swimlane}
                                        nodeColors={nodeColors}
                                        onEdit={setEditingTask}
                                        mode={swimlaneMode as 'nodes' | 'projects'}
                                    />
                                ))
                            ) : (
                                <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No hay tareas para mostrar en esta vista
                                </div>
                            )}
                        </div>
                    </div>
                )}

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
        </div>
    );
};

export default Execution;
