import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FlywheelNode } from '../components/FlywheelNode';
import { Plus } from 'lucide-react';

interface Node {
    id: string;
    name: string;
    description: string;
    color: string;
}

const NodesConfig: React.FC = () => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newNode, setNewNode] = useState({ name: '', description: '', color: '#8b5cf6' });

    useEffect(() => {
        loadNodes();
    }, []);

    const loadNodes = async () => {
        try {
            const data = await api.getNodes();
            setNodes(data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleCreateNode = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createNode(newNode);
            setShowAdd(false);
            setNewNode({ name: '', description: '', color: '#8b5cf6' });
            loadNodes();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteNode = async (id: string) => {
        if (confirm('Delete this node? All associated OKRs and Tasks will be deleted.')) {
            try {
                await api.deleteNode(id);
                loadNodes();
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h1>Nodes & OKR Configuration</h1>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    style={{
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                    }}
                >
                    <Plus size={18} /> Add Node
                </button>
            </div>

            {showAdd && (
                <div className="glass-panel" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                    <h3>New Flywheel Node</h3>
                    <form onSubmit={handleCreateNode} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <input
                            placeholder="Node Name"
                            value={newNode.name}
                            onChange={e => setNewNode({ ...newNode, name: e.target.value })}
                            style={{ padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--text-muted)', color: 'white' }}
                        />
                        <textarea
                            placeholder="Description"
                            value={newNode.description}
                            onChange={e => setNewNode({ ...newNode, description: e.target.value })}
                            style={{ padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--text-muted)', color: 'white', minHeight: '60px' }}
                        />
                        <input
                            type="color"
                            value={newNode.color}
                            onChange={e => setNewNode({ ...newNode, color: e.target.value })}
                            style={{ width: '100%', height: '40px' }}
                        />
                        <button type="submit" style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '10px', cursor: 'pointer' }}>Create Node</button>
                    </form>
                </div>
            )}

            {loading ? <p>Loading nodes...</p> : (
                <div className="nodes-list">
                    {nodes.map(node => (
                        <FlywheelNode
                            key={node.id}
                            node={node}
                            onUpdate={() => alert('Update logic to be implemented')}
                            onDelete={() => handleDeleteNode(node.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default NodesConfig;
