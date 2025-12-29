import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TaskCard } from '../components/TaskCard';
import { Calendar, AlertCircle } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

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

const Execution: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    // Reprioritization Modal State
    const [showModal, setShowModal] = useState(false);
    const [dragResult, setDragResult] = useState<DropResult | null>(null);
    const [reason, setReason] = useState('');

    // Calculate current week number (ISO week date)
    const getWeekNumber = (d: Date) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return weekNo;
    };
    const currentWeek = getWeekNumber(new Date());
    const [selectedWeek, setSelectedWeek] = useState(currentWeek);

    useEffect(() => {
        loadTasks();
    }, [selectedWeek]);

    const loadTasks = async () => {
        setLoading(true);
        try {
            const data = await api.getTasksByWeek(selectedWeek);
            setTasks(data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleUpdate = () => {
        loadTasks(); // Reload to re-sort or update
    };

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) {
            return;
        }

        if (result.destination.index === result.source.index) {
            return;
        }

        // Store result and open modal to ask for reason
        setDragResult(result);
        setReason('');
        setShowModal(true);
    };

    const confirmReprioritization = async () => {
        if (!dragResult || !reason.trim()) {
            alert('A reason is required to change priority.');
            return;
        }

        const sourceIndex = dragResult.source.index;
        const destinationIndex = dragResult.destination!.index;

        // Optimistic Update
        const newTasks = Array.from(tasks);
        const [movedTask] = newTasks.splice(sourceIndex, 1);
        newTasks.splice(destinationIndex, 0, movedTask);

        // Calculate the new priority score based on neighbors
        // If moved to top: score = topTask.score + 1
        // If moved to bottom: score = bottomTask.score - 1
        // If between: score = (prev.score + next.score) / 2

        let newScore = movedTask.priority_score;
        const prevTask = newTasks[destinationIndex - 1];
        const nextTask = newTasks[destinationIndex + 1];

        if (!prevTask && nextTask) {
            newScore = typeof nextTask.priority_score === 'number' ? nextTask.priority_score + 10 : 100;
        } else if (prevTask && !nextTask) {
            newScore = typeof prevTask.priority_score === 'number' ? prevTask.priority_score - 10 : 0;
        } else if (prevTask && nextTask) {
            newScore = (Number(prevTask.priority_score) + Number(nextTask.priority_score)) / 2;
        } else {
            // Only one task? No change needed really or set default
        }

        movedTask.priority_score = newScore;
        setTasks(newTasks);
        setShowModal(false);

        try {
            await api.updateTaskPriority(movedTask.id, newScore, reason);
        } catch (err) {
            console.error(err);
            alert('Failed to update priority on server.');
            loadTasks(); // Revert
        }
    };

    const cancelDrag = () => {
        setShowModal(false);
        setDragResult(null);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
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
                        style={{ padding: '8px', width: '80px' }}
                    />
                </div>
            </div>

            {loading ? <p>Loading prioritized tasks...</p> : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="tasks-list">
                        {(provided) => (
                            <div
                                className="tasks-grid"
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                            >
                                {tasks.length === 0 ? (
                                    <p className="text-muted">No tasks scheduled for this week.</p>
                                ) : (
                                    tasks.map((task, index) => (
                                        <Draggable key={task.id} draggableId={task.id} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                >
                                                    <TaskCard task={task} onUpdate={handleUpdate} />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))
                                )}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            )}

            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ width: '400px', padding: 'var(--space-lg)', background: 'var(--bg-panel)' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
                            <AlertCircle size={20} color="var(--warning)" />
                            Reprioritization Log
                        </h3>
                        <p>You are changing the strategic priority order. Please capture the reason for this change.</p>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason for change..."
                            style={{ width: '100%', height: '80px', marginBottom: '16px', padding: '8px', background: 'var(--bg-app)', color: 'white', border: '1px solid var(--glass-border)' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button onClick={cancelDrag} style={{ background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-secondary)', padding: '8px 16px', cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button onClick={confirmReprioritization} style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '8px 16px', cursor: 'pointer' }}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Execution;
