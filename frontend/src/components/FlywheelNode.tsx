import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ChevronDown, ChevronRight, Plus, Trash, Edit } from 'lucide-react';

interface Objective {
    id: string;
    description: string;
    target_value: number;
    current_value: number;
    quarter: string;
    year: number;
}

interface NodeProps {
    node: {
        id: string;
        name: string;
        description: string;
        color: string;
    };
    onUpdate: () => void;
    onDelete: () => void;
}

export const FlywheelNode: React.FC<NodeProps> = ({ node, onUpdate, onDelete }) => {
    const [expanded, setExpanded] = useState(false);
    const [objectives, setObjectives] = useState<Objective[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddObj, setShowAddObj] = useState(false);
    const [newObj, setNewObj] = useState({ description: '', target_value: 100, quarter: 'Q1', year: 2025 });

    useEffect(() => {
        if (expanded) {
            loadObjectives();
        }
    }, [expanded]);

    const loadObjectives = async () => {
        setLoading(true);
        try {
            const data = await api.getObjectives(node.id);
            setObjectives(data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleAddObjective = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createObjective({ ...newObj, node_id: node.id });
            setShowAddObj(false);
            loadObjectives();
            setNewObj({ description: '', target_value: 100, quarter: 'Q1', year: 2025 });
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteObjective = async (id: string) => {
        if (confirm('Delete this objective?')) {
            try {
                await api.deleteObjective(id);
                loadObjectives();
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div className="glass-panel" style={{ marginBottom: 'var(--space-md)', borderLeft: `4px solid ${node.color || 'var(--primary)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
                    {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    <div>
                        <h3 style={{ margin: 0 }}>{node.name}</h3>
                        <small className="text-muted">{node.description}</small>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button className="btn-icon" onClick={onUpdate}><Edit size={16} /></button>
                    <button className="btn-icon" onClick={onDelete}><Trash size={16} /></button>
                </div>
            </div>

            {expanded && (
                <div style={{ padding: '0 var(--space-md) var(--space-md) var(--space-xl)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                        <h4 style={{ margin: 0 }}>Strategic Objectives (OKRs)</h4>
                        <button onClick={() => setShowAddObj(!showAddObj)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Plus size={16} /> Add OKR
                        </button>
                    </div>

                    {showAddObj && (
                        <form onSubmit={handleAddObjective} style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm)', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                            <input
                                placeholder="Description"
                                value={newObj.description}
                                onChange={e => setNewObj({ ...newObj, description: e.target.value })}
                                style={{ width: '100%', marginBottom: '8px', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--text-muted)', color: 'white' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input type="number" value={newObj.target_value} onChange={e => setNewObj({ ...newObj, target_value: Number(e.target.value) })} placeholder="Target" style={{ width: '80px', padding: '8px' }} />
                                <input value={newObj.quarter} onChange={e => setNewObj({ ...newObj, quarter: e.target.value })} placeholder="Q1" style={{ width: '60px', padding: '8px' }} />
                                <button type="submit" style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}>Save</button>
                            </div>
                        </form>
                    )}

                    {loading ? <p>Loading OKRs...</p> : (
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {objectives.map(obj => (
                                <li key={obj.id} style={{ marginBottom: '8px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <span>{obj.description}</span>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            Target: {obj.target_value} | Current: {obj.current_value} | {obj.quarter} {obj.year}
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteObjective(obj.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                                        <Trash size={14} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};
