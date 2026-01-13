import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { TaskCard } from '../components/TaskCard';
import { TaskEditModal } from '../components/TaskEditModal';
import { Plus, X } from 'lucide-react';
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
    assignee_id?: string;
    assignee_name?: string;
    complexity?: 'S' | 'M' | 'L' | 'XL' | 'XXL';
    is_waiting_third_party?: boolean;
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
    swimlaneId
}: {
    task: Task;
    nodeColors: Record<string, string>;
    onEdit: (t: Task) => void;
    swimlaneId?: string;
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
            <TaskCard task={task} nodeColors={nodeColors} onEdit={onEdit} />
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
                            {swimlane.columns[col.id].map((task) => (
                                <SortableTaskItem
                                    key={`${swimlane.id}-${task.id}`}
                                    task={task}
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
                    fontSize: '1rem',
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
                    }}>- Prioridad + </div>
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
                        {tasks.map((task) => (
                            <SortableTaskItem key={task.id} task={task} nodeColors={nodeColors} onEdit={onEdit} />
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

    // Task creation state
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        project_id: '',
        objective_id: '',
        status: 'Backlog',
        complexity: '' as string
    });
    const [objectives, setObjectives] = useState<any[]>([]);
    const [isCreatingTask, setIsCreatingTask] = useState(false);

    // Assignee filter state
    const [assignees, setAssignees] = useState<{ id: string, name: string }[]>([]);
    const [selectedAssignee, setSelectedAssignee] = useState<string | null>('all');

    // Complexity filter state (multi-select)
    const [selectedComplexities, setSelectedComplexities] = useState<Set<string>>(new Set());


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

            // Extract unique objectives from tasks (tasks already have project_name and objective info)
            const objectivesMap = new Map();
            data.forEach((task: any) => {
                if (task.objective_id && !objectivesMap.has(task.objective_id)) {
                    objectivesMap.set(task.objective_id, {
                        id: task.objective_id,
                        description: task.objective_title,
                        project_name: task.project_name
                    });
                }
            });
            setObjectives(Array.from(objectivesMap.values()));

            // Initialize priority_score for tasks that don't have one
            // Assign scores from 1000 downwards based on current order
            const tasksWithScores = data.map((task: Task, index: number) => {
                const score = task.priority_score != null && !isNaN(Number(task.priority_score))
                    ? Number(task.priority_score)
                    : 1000 - index;

                return {
                    ...task,
                    priority_score: score
                };
            });

            console.log('Loaded tasks with initialized scores:', tasksWithScores.map((t: Task) => ({
                title: t.title,
                score: t.priority_score
            })));

            // Sort by priority_score desc
            tasksWithScores.sort((a: Task, b: Task) => b.priority_score - a.priority_score);
            setTasks(tasksWithScores);

            const projects = Array.from(new Set(data.map((t: Task) => t.project_name).filter(Boolean))) as string[];
            setAllProjects(projects);

            // Load assignees
            const assigneesData = await api.getAssignees();
            setAssignees(assigneesData);
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

        // Further filter by assignee
        const assigneeFiltered = selectedAssignee === 'all'
            ? visibleTasks
            : selectedAssignee === null
                ? visibleTasks.filter(t => !t.assignee_id)
                : visibleTasks.filter(t => t.assignee_id === selectedAssignee);

        // Further filter by complexity (multi-select)
        const filteredTasks = selectedComplexities.size === 0
            ? assigneeFiltered
            : assigneeFiltered.filter(t => {
                if (selectedComplexities.has('none')) {
                    return !t.complexity || selectedComplexities.has(t.complexity);
                }
                return t.complexity && selectedComplexities.has(t.complexity);
            });

        filteredTasks.forEach(task => {
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
    }, [tasks, swimlaneMode, selectedProject, selectedAssignee, selectedComplexities]);

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

        // Further filter by assignee
        const assigneeFiltered = selectedAssignee === 'all'
            ? visibleTasks
            : selectedAssignee === null
                ? visibleTasks.filter(t => !t.assignee_id)
                : visibleTasks.filter(t => t.assignee_id === selectedAssignee);

        // Further filter by complexity (multi-select)
        const filteredTasks = selectedComplexities.size === 0
            ? assigneeFiltered
            : assigneeFiltered.filter(t => {
                if (selectedComplexities.has('none')) {
                    return !t.complexity || selectedComplexities.has(t.complexity);
                }
                return t.complexity && selectedComplexities.has(t.complexity);
            });

        filteredTasks.forEach(task => {
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
    }, [tasks, selectedProject, selectedAssignee, selectedComplexities]);

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

        if (!over) {
            console.log('No over target');
            return;
        }

        const activeData = active.data.current;
        const overData = over.data.current;

        console.log('Drag End:', {
            activeId: active.id,
            overId: over.id,
            activeData,
            overData
        });

        // In swimlane mode, prevent cross-swimlane drops
        if (swimlaneMode !== 'none') {
            if (activeData?.swimlaneId && overData?.swimlaneId && activeData.swimlaneId !== overData.swimlaneId) {
                console.log('Prevented cross-swimlane drop');
                return; // Prevent cross-swimlane drops
            }
        }

        const activeId = typeof active.id === 'string' ? active.id : String(active.id);
        const overId = typeof over.id === 'string' ? over.id : String(over.id);

        // Extract actual task ID (remove swimlane prefix if present)
        // Swimlane IDs are in format: "swimlaneId-taskUUID"
        // We need to check if there's a swimlane prefix by looking at the activeData
        const actualTaskId = activeData?.swimlaneId
            ? activeId.substring(activeData.swimlaneId.length + 1) // Remove "swimlaneId-" prefix
            : activeId;

        console.log('Extracted task ID:', actualTaskId, 'from activeId:', activeId);

        const activeTask = tasks.find(t => t.id === actualTaskId);
        if (!activeTask) {
            console.log('Active task not found:', actualTaskId);
            return;
        }

        // 1. Determine destination column and index
        let newStatus = activeTask.status;

        if (over.data.current?.type === 'Column') {
            newStatus = over.id as string;
            console.log('Dropped on column:', newStatus);
        } else if (over.data.current?.type === 'Task') {
            const overTaskId = overData?.swimlaneId
                ? overId.substring(overData.swimlaneId.length + 1)
                : overId;
            const overTask = tasks.find(t => t.id === overTaskId);
            if (overTask) {
                newStatus = overTask.status;
                console.log('Dropped on task:', overTask.title, 'status:', newStatus);
            }
        }

        // Check if Status Changed
        if (activeTask.status !== newStatus) {
            console.log('Status changed from', activeTask.status, 'to', newStatus);
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
            console.log('Checking reorder: activeId !== overId');
            if (activeTask.status === newStatus) {
                console.log('Same status, calculating new priority');
                const currentColumnTasks = swimlaneMode === 'none'
                    ? columns[newStatus]
                    : swimlaneData?.find(s => s.id === activeData?.swimlaneId)?.columns[newStatus] || [];

                console.log('Current column tasks:', currentColumnTasks.length);

                const oldIndex = currentColumnTasks.findIndex(t => t.id === actualTaskId);
                const targetTaskId = overData?.swimlaneId
                    ? overId.substring(overData.swimlaneId.length + 1)
                    : overId;
                const targetIndex = currentColumnTasks.findIndex(t => t.id === targetTaskId);

                console.log('Indices:', { oldIndex, targetIndex });

                if (oldIndex !== targetIndex && oldIndex !== -1 && targetIndex !== -1) {
                    // Create a temp array to simulate the move
                    const taskList = [...currentColumnTasks];

                    console.log('TaskList before move:', taskList.map(t => ({
                        id: t.id,
                        title: t.title,
                        score: t.priority_score
                    })));

                    const [movedItem] = taskList.splice(oldIndex, 1);
                    taskList.splice(targetIndex, 0, movedItem);

                    console.log('TaskList after move:', taskList.map(t => ({
                        id: t.id,
                        title: t.title,
                        score: t.priority_score
                    })));

                    // Find neighbors in the NEW order
                    const newIndex = targetIndex;

                    console.log('Looking for neighbors at newIndex:', newIndex, 'taskList.length:', taskList.length);
                    console.log('Moved item:', movedItem.title, 'score:', movedItem.priority_score);

                    const prevTask = newIndex > 0 ? taskList[newIndex - 1] : null;
                    const nextTask = newIndex < taskList.length - 1 ? taskList[newIndex + 1] : null;

                    console.log('prevTask:', prevTask ? { title: prevTask.title, score: prevTask.priority_score } : null);
                    console.log('nextTask:', nextTask ? { title: nextTask.title, score: nextTask.priority_score } : null);

                    let newScore = 0;

                    if (!prevTask && !nextTask) {
                        // Only item in column
                        newScore = activeTask.priority_score;
                    } else if (!prevTask && nextTask) {
                        // At top - give it a higher score than the next task
                        newScore = nextTask.priority_score + 10;
                    } else if (prevTask && !nextTask) {
                        // At bottom - give it a lower score than the previous task
                        newScore = prevTask.priority_score - 10;
                    } else if (prevTask && nextTask) {
                        // In between - calculate average
                        const avg = (prevTask.priority_score + nextTask.priority_score) / 2;

                        // If the average equals one of the neighbors (happens when they're the same),
                        // we need to create space
                        if (avg === prevTask.priority_score || avg === nextTask.priority_score) {
                            // Recalculate scores for the entire column to create proper spacing
                            console.log('Scores are too close, recalculating entire column');

                            // Assign new scores with proper spacing (10 points apart)
                            const baseScore = 1000;
                            taskList.forEach((task, idx) => {
                                const calculatedScore = baseScore - (idx * 10);
                                if (task.id === actualTaskId) {
                                    newScore = calculatedScore;
                                }
                            });

                            // Update all tasks in this column with new scores
                            setTasks(prev => {
                                const updated = prev.map(t => {
                                    const taskInList = taskList.find(tl => tl.id === t.id);
                                    if (taskInList) {
                                        const idx = taskList.indexOf(taskInList);
                                        return { ...t, priority_score: baseScore - (idx * 10) };
                                    }
                                    return t;
                                });
                                return updated.sort((a, b) => b.priority_score - a.priority_score);
                            });

                            // Update all tasks in backend
                            taskList.forEach((task, idx) => {
                                const calculatedScore = baseScore - (idx * 10);
                                if (task.priority_score !== calculatedScore) {
                                    api.updateTaskPriority(task.id, calculatedScore, "Auto-Rebalance")
                                        .catch(err => console.error("Failed to update priority", err));
                                }
                            });

                            return; // Exit early since we already updated everything
                        } else {
                            newScore = avg;
                        }
                    }

                    console.log(`Auto Reprioritize: ${activeTask.title} -> New Score: ${newScore}`, {
                        prevScore: prevTask?.priority_score,
                        nextScore: nextTask?.priority_score
                    });

                    // Optimistic Update - Update the task's score and re-sort ALL tasks
                    setTasks(prev => {
                        const updated = prev.map(t =>
                            t.id === actualTaskId ? { ...t, priority_score: newScore } : t
                        );
                        // Sort by priority_score descending to maintain order
                        return updated.sort((a, b) => b.priority_score - a.priority_score);
                    });

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

    const handleCreateTask = async () => {
        if (!newTask.title.trim() || !newTask.project_id || !newTask.objective_id) {
            alert('Debes ingresar un título, seleccionar un proyecto y un objetivo');
            return;
        }

        setIsCreatingTask(true);
        try {
            await api.createTask({
                title: newTask.title,
                description: newTask.description,
                objective_id: newTask.objective_id,
                status: newTask.status,
                weight: 1,
                priority_score: 1000,
                complexity: newTask.complexity || null
            });
            setShowCreateTask(false);
            setNewTask({ title: '', description: '', project_id: '', objective_id: '', status: 'Backlog', complexity: '' });
            await loadNodesAndTasks();
        } catch (err) {
            console.error(err);
            alert('Error al crear la tarea');
        } finally {
            setIsCreatingTask(false);
        }
    };

    return (
        <div style={{ padding: '0 20px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* === UNIFIED TOOLBAR: Everything in ONE line === */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                gap: '12px',
                flexWrap: 'wrap'
            }}>
                {/* LEFT: Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={() => setShowCreateTask(true)}
                        style={{
                            padding: '6px 12px',
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 'bold',
                            fontSize: '0.85rem'
                        }}
                    >
                        <Plus size={16} />
                        Nueva Tarea
                    </button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vista:</span>
                    <button
                        onClick={cycleSwimlaneMode}
                        style={{
                            padding: '6px 12px',
                            background: swimlaneMode !== 'none' ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                            color: 'white',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: swimlaneMode !== 'none' ? '600' : '400'
                        }}
                    >
                        {swimlaneMode === 'none' && ' Plana'}
                        {swimlaneMode === 'nodes' && ' Nodos'}
                        {swimlaneMode === 'projects' && ' Proyectos'}
                    </button>
                </div>

                {/* RIGHT: All Filters inline */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Project Filter - Dropdown */}
                    {allProjects.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📁 Proyecto:</span>
                            <select
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                style={{
                                    padding: '5px 8px',
                                    background: 'var(--bg-card)',
                                    color: 'white',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    minWidth: '120px'
                                }}
                            >
                                <option value="all"> Todos</option>
                                {allProjects.map(project => (
                                    <option key={project} value={project}>{project}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Assignee Filter - Dropdown */}
                    {assignees.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>👤 Asignado:</span>
                            <select
                                value={selectedAssignee || 'all'}
                                onChange={(e) => setSelectedAssignee(e.target.value)}
                                style={{
                                    padding: '5px 8px',
                                    background: 'var(--bg-card)',
                                    color: 'white',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    minWidth: '100px'
                                }}
                            >
                                <option value="all"> Todos</option>
                                <option value="unassigned">Sin asignar</option>
                                {assignees.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Complexity Filter - Compact Chips */}
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '2px' }}>📐 Talla:</span>
                        <button
                            onClick={() => setSelectedComplexities(new Set())}
                            style={{
                                padding: '3px 8px',
                                background: selectedComplexities.size === 0 ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                                color: selectedComplexities.size === 0 ? 'white' : 'var(--text-muted)',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: selectedComplexities.size === 0 ? '600' : '400'
                            }}
                        >
                            All
                        </button>
                        {(['S', 'M', 'L', 'XL', 'XXL'] as const).map(size => {
                            const isSelected = selectedComplexities.has(size);
                            const colors: Record<string, string> = { S: '#22c55e', M: '#3b82f6', L: '#f97316', XL: '#ef4444', XXL: '#dc2626' };
                            return (
                                <button
                                    key={size}
                                    onClick={() => {
                                        const newSet = new Set(selectedComplexities);
                                        if (newSet.has(size)) newSet.delete(size);
                                        else newSet.add(size);
                                        setSelectedComplexities(newSet);
                                    }}
                                    style={{
                                        padding: '3px 8px',
                                        background: isSelected ? colors[size] : 'rgba(255,255,255,0.08)',
                                        color: isSelected ? 'white' : colors[size],
                                        border: 'none',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        fontWeight: isSelected ? '600' : '400'
                                    }}
                                >
                                    {size}
                                </button>
                            );
                        })}
                    </div>
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
                            <TaskCard task={activeTask} nodeColors={nodeColors} onEdit={() => { }} />
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
            />

            {/* Create Task Modal */}
            {showCreateTask && (
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
                        maxHeight: '80vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                            <h2 style={{ margin: 0 }}>Nueva Tarea</h2>
                            <button
                                onClick={() => {
                                    setShowCreateTask(false);
                                    setNewTask({ title: '', description: '', project_id: '', objective_id: '', status: 'Backlog', complexity: '' });
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Título *</label>
                                <input
                                    type="text"
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
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

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Descripción</label>
                                <textarea
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
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

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Proyecto *</label>
                                <select
                                    value={newTask.project_id}
                                    onChange={(e) => {
                                        const selectedProject = e.target.value;
                                        // Filter objectives for the selected project
                                        const filteredObjectives = objectives.filter(
                                            (obj: any) => obj.project_name === selectedProject
                                        );
                                        // Auto-select if only one objective
                                        const autoSelectedObjective = filteredObjectives.length === 1 ? filteredObjectives[0].id : '';
                                        setNewTask({ ...newTask, project_id: selectedProject, objective_id: autoSelectedObjective });
                                    }}
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
                                    <option value="">Selecciona un proyecto</option>
                                    {allProjects.map((project: string) => (
                                        <option key={project} value={project}>
                                            {project}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Objetivo *</label>
                                <select
                                    value={newTask.objective_id}
                                    onChange={(e) => setNewTask({ ...newTask, objective_id: e.target.value })}
                                    disabled={!newTask.project_id}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: 'var(--bg-app)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'white',
                                        fontSize: '0.95rem',
                                        opacity: !newTask.project_id ? 0.5 : 1,
                                        cursor: !newTask.project_id ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <option value="">Selecciona un objetivo</option>
                                    {objectives
                                        .filter((obj: any) => {
                                            // Filter objectives by selected project
                                            if (!newTask.project_id) return false;
                                            return obj.project_name === newTask.project_id;
                                        })
                                        .map((obj: any) => (
                                            <option key={obj.id} value={obj.id}>
                                                {obj.description}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Complexity Dropdown */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Complejidad</label>
                                <select
                                    value={newTask.complexity}
                                    onChange={(e) => setNewTask({ ...newTask, complexity: e.target.value })}
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

                            <div style={{ display: 'flex', gap: '12px', marginTop: 'var(--space-md)' }}>
                                <button
                                    onClick={handleCreateTask}
                                    disabled={isCreatingTask}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: isCreatingTask ? 'var(--text-muted)' : 'var(--primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: isCreatingTask ? 'not-allowed' : 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '1rem'
                                    }}
                                >
                                    {isCreatingTask ? 'Creando...' : 'Crear Tarea'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCreateTask(false);
                                        setNewTask({ title: '', description: '', project_id: '', objective_id: '', status: 'Backlog', complexity: '' });
                                    }}
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
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Execution;