import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FlywheelNode } from '../components/FlywheelNode';
import { NodeEditor } from '../components/NodeEditor';
import { Plus, AlertTriangle } from 'lucide-react';

interface Node {
    id: string;
    name: string;
    description: string;
    color: string;
    is_central?: boolean;
    is_active?: boolean;
}

const NodesConfig: React.FC = () => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editingNode, setEditingNode] = useState<Node | null>(null);
    const [newNode, setNewNode] = useState({ name: '', description: '', color: '#8b5cf6', is_central: false, is_active: true });
    const [confirmDeactivate, setConfirmDeactivate] = useState<Node | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ node: Node, step: 1 | 2 } | null>(null);

    useEffect(() => {
        loadNodes();
    }, []);

    const loadNodes = async () => {
        try {
            const data = await api.getNodes();
            // Sort: Central node first, then by creation
            const sorted = data.sort((a: any, b: any) => {
                if (a.is_central && !b.is_central) return -1;
                if (!a.is_central && b.is_central) return 1;
                return 0;
            });
            setNodes(sorted);
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
            setNewNode({ name: '', description: '', color: '#8b5cf6', is_central: false, is_active: true });
            loadNodes();
        } catch (err) {
            console.error(err);
        }
    };

    // Unused handleUpdateNode removed

    const handleDeleteNode = async (id: string) => {
        try {
            await api.deleteNode(id);
            loadNodes();
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleActive = async (node: Node) => {
        const isCurrentlyActive = node.is_active !== false;
        if (isCurrentlyActive) {
            // Show custom confirmation modal
            setConfirmDeactivate(node);
            return;
        }
        // Reactivating - no confirmation needed
        try {
            await api.updateNode(node.id, { ...node, is_active: true });
            loadNodes();
        } catch (err) {
            console.error('Error reactivating node:', err);
        }
    };

    const executeDeactivate = async () => {
        if (!confirmDeactivate) return;
        try {
            await api.updateNode(confirmDeactivate.id, { ...confirmDeactivate, is_active: false });
            loadNodes();
        } catch (err) {
            console.error('Error deactivating node:', err);
        }
        setConfirmDeactivate(null);
    };

    const startEditing = (node: Node) => {
        setEditingNode({ ...node });
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h1>Configuración de Nodos y OKRs</h1>
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
                    <Plus size={18} /> Agregar Nodo
                </button>
            </div>

            {showAdd && (
                <div className="glass-panel" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                    <h3>Nuevo Nodo</h3>
                    <form onSubmit={handleCreateNode} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <input
                            placeholder="Nombre del Nodo"
                            value={newNode.name}
                            onChange={e => setNewNode({ ...newNode, name: e.target.value })}
                            style={{ padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--text-muted)', color: 'white' }}
                        />
                        <textarea
                            placeholder="Descripción"
                            value={newNode.description}
                            onChange={e => setNewNode({ ...newNode, description: e.target.value })}
                            style={{ padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--text-muted)', color: 'white', minHeight: '60px' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <input
                                type="color"
                                value={newNode.color}
                                onChange={e => setNewNode({ ...newNode, color: e.target.value })}
                                style={{ width: '60px', height: '40px' }}
                            />
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={newNode.is_active}
                                    onChange={e => setNewNode({ ...newNode, is_active: e.target.checked })}
                                />
                                Activo
                            </label>
                        </div>
                        <button type="submit" style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '10px', cursor: 'pointer' }}>Crear Nodo</button>
                    </form>
                </div>
            )}

            {loading ? <p>Loading nodes...</p> : (
                <div className="nodes-list">
                    {nodes.map(node => (
                        <FlywheelNode
                            key={node.id}
                            node={node}
                            onUpdate={() => startEditing(node)}
                            onToggleActive={() => handleToggleActive(node)}
                        />
                    ))}
                </div>
            )}

            {/* Full-Screen Node Editor */}
            {editingNode && (
                <NodeEditor
                    node={editingNode}
                    allNodes={nodes}
                    onSave={() => {
                        setEditingNode(null);
                        loadNodes();
                    }}
                    onClose={() => setEditingNode(null)}
                    onDelete={(node) => {
                        setConfirmDelete({ node, step: 1 });
                        setEditingNode(null);
                    }}
                />
            )}

            {/* Deactivation Confirmation Modal */}
            {confirmDeactivate && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001
                }}>
                    <div className="glass-panel" style={{ padding: 'var(--space-lg)', width: '400px', textAlign: 'center' }}>
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <AlertTriangle size={48} color="#f59e0b" />
                        </div>
                        <h3 style={{ margin: '0 0 var(--space-sm) 0' }}>¿Desactivar Nodo?</h3>
                        <p className="text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                            El nodo <strong>"{confirmDeactivate.name}"</strong> se ocultará del mapa del ecosistema.
                            Sus OKRs y tareas se mantendrán intactos.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setConfirmDeactivate(null)}
                                style={{
                                    padding: '10px 24px',
                                    background: 'transparent',
                                    border: '1px solid var(--text-muted)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius-md)'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={executeDeactivate}
                                style={{
                                    padding: '10px 24px',
                                    background: '#f59e0b',
                                    border: 'none',
                                    color: 'black',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 'bold'
                                }}
                            >
                                Sí, Desactivar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001
                }}>
                    <div className="glass-panel" style={{ padding: 'var(--space-lg)', width: '450px', textAlign: 'center' }}>
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <AlertTriangle size={48} color="#ef4444" />
                        </div>
                        {confirmDelete.step === 1 ? (
                            <>
                                <h3 style={{ margin: '0 0 var(--space-sm) 0', color: '#ef4444' }}>⚠️ ADVERTENCIA</h3>
                                <p className="text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                                    ¿Estás seguro de que quieres <strong>ELIMINAR</strong> el nodo <strong>"{confirmDelete.node.name}"</strong>?
                                </p>
                                <p style={{ marginBottom: 'var(--space-md)', color: '#f87171', fontSize: '0.9rem' }}>
                                    Esta acción es <strong>PERMANENTE</strong> y eliminará todos los OKRs, Tareas y dependencias asociadas.
                                </p>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                    <button
                                        onClick={() => setConfirmDelete(null)}
                                        style={{
                                            padding: '10px 24px',
                                            background: 'transparent',
                                            border: '1px solid var(--text-muted)',
                                            color: 'white',
                                            cursor: 'pointer',
                                            borderRadius: 'var(--radius-md)'
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => setConfirmDelete({ ...confirmDelete, step: 2 })}
                                        style={{
                                            padding: '10px 24px',
                                            background: 'rgba(239, 68, 68, 0.2)',
                                            border: '1px solid #ef4444',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            borderRadius: 'var(--radius-md)',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Sí, Continuar
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 style={{ margin: '0 0 var(--space-sm) 0', color: '#ef4444' }}>🔥 CONFIRMACIÓN FINAL</h3>
                                <p style={{ marginBottom: 'var(--space-md)', color: '#fca5a5' }}>
                                    Esto <strong>NO SE PUEDE DESHACER</strong>. El nodo y toda su información se perderán para siempre.
                                </p>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                    <button
                                        onClick={() => setConfirmDelete(null)}
                                        style={{
                                            padding: '10px 24px',
                                            background: 'transparent',
                                            border: '1px solid var(--text-muted)',
                                            color: 'white',
                                            cursor: 'pointer',
                                            borderRadius: 'var(--radius-md)'
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleDeleteNode(confirmDelete.node.id);
                                            setConfirmDelete(null);
                                        }}
                                        style={{
                                            padding: '10px 24px',
                                            background: '#ef4444',
                                            border: 'none',
                                            color: 'white',
                                            cursor: 'pointer',
                                            borderRadius: 'var(--radius-md)',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        ELIMINAR PERMANENTEMENTE
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NodesConfig;

