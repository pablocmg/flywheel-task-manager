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
}

// Sortable Item Component
function SortableTaskItem(props: { task: Task; onUpdate: () => void }) {
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
            <TaskCard task={props.task} onUpdate={props.onUpdate} />
        </div>
    );
}

const Execution: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
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

    const loadTasks = async () => {
        // setLoading(true); // Don't block render on load for debugging
        try {
            const data = await api.getTasksByWeek(selectedWeek);
            // Sort by priority_score
            data.sort((a: Task, b: Task) => b.priority_score - a.priority_score);
            setTasks(data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadTasks();
    }, [selectedWeek]);

    const handleUpdate = () => {
        loadTasks();
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
            await api.updateTaskPriority(dragResult.activeId, reason);
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

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <div>
                    <h1 className="title-gradient" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <Calendar /> Execution Mode
                    </h1>
                    <p className="text-muted">Focus on completing high-impact tasks for Week {selectedWeek}. Drag to reprioritize.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <label>Week:</label>
                    <input
                        type="number"
                        value={selectedWeek}
                        onChange={(e) => setSelectedWeek(Number(e.target.value))}
                        style={{ padding: '8px', width: '80px', background: 'var(--bg-app)', color: 'white', border: '1px solid var(--glass-border)' }}
                    />
                </div>
            </div>

            {loading ? <p>Loading prioritized tasks...</p> : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={tasks.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="tasks-grid">
                            {tasks.length === 0 ? (
                                <p className="text-muted">No tasks scheduled for this week.</p>
                            ) : (
                                tasks.map(task => (
                                    <SortableTaskItem key={task.id} task={task} onUpdate={handleUpdate} />
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
                            Reprioritization Log
                        </h3>
                        <p>You are changing the strategic priority order. Please state the reason for Audit Log.</p>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Reason for change..."
                            style={{ width: '100%', height: '80px', margin: '10px 0', background: 'var(--bg-app)', color: 'white', border: '1px solid var(--text-muted)' }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={cancelDrag} style={{ background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-secondary)', padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={confirmReprioritization} disabled={!reason} style={{ background: reason ? 'var(--primary)' : 'gray', color: 'white', border: 'none', padding: '8px 16px', cursor: 'pointer' }}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Execution;
