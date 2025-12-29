import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TaskCard } from '../components/TaskCard';
import { Calendar } from 'lucide-react';

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

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <Calendar /> Execution Mode
                    </h1>
                    <p className="text-muted">Focus on completing high-impact tasks for Week {selectedWeek}.</p>
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
                <div className="tasks-grid">
                    {tasks.length === 0 ? (
                        <p className="text-muted">No tasks scheduled for this week.</p>
                    ) : (
                        tasks.map(task => (
                            <TaskCard key={task.id} task={task} onUpdate={handleUpdate} />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default Execution;
