import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, Save, Trash, ArrowRight, ArrowLeft, Link2 } from 'lucide-react';

interface Node {
    id: string;
    name: string;
    description: string;
    color: string;
    is_central?: boolean;
    is_active?: boolean;
    generates_revenue?: boolean;
}

interface Interaction {
    id: string;
    source_node_id: string;
    target_node_id: string;
    label: string;
    type: 'one-way' | 'mutual';
}

interface NodeEditorProps {
    node: Node;
    allNodes: Node[];
    onSave: () => void;
    onClose: () => void;
    onDelete: (node: Node) => void;
}

export const NodeEditor: React.FC<NodeEditorProps> = ({ node, allNodes, onSave, onClose, onDelete }) => {
    const [editedNode, setEditedNode] = useState<Node>({ ...node });
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'relationships'>('general');

    // For each other node, track sends and receives independently
    const [nodeRelationships, setNodeRelationships] = useState<Record<string, {
        sends: boolean;
        sendsLabel: string;
        receives: boolean;
        receivesLabel: string;
    }>>({});

    useEffect(() => {
        loadInteractions();
    }, []);

    const loadInteractions = async () => {
        setLoading(true);
        try {
            const data = await api.getInteractions();
            setInteractions(data);

            // Build relationships map from existing interactions
            const relMap: typeof nodeRelationships = {};

            // Initialize all other nodes with no relationships
            allNodes.filter(n => n.id !== node.id && n.is_active !== false).forEach(n => {
                relMap[n.id] = { sends: false, sendsLabel: '', receives: false, receivesLabel: '' };
            });

            // Fill in existing relationships
            data.forEach((inter: Interaction) => {
                if (inter.source_node_id === node.id && relMap[inter.target_node_id]) {
                    // This node SENDS to the target
                    relMap[inter.target_node_id].sends = true;
                    relMap[inter.target_node_id].sendsLabel = inter.label;
                } else if (inter.target_node_id === node.id && relMap[inter.source_node_id]) {
                    // This node RECEIVES from the source
                    relMap[inter.source_node_id].receives = true;
                    relMap[inter.source_node_id].receivesLabel = inter.label;
                }
            });

            setNodeRelationships(relMap);
        } catch (err) {
            console.error('Error loading interactions:', err);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Save node properties
            await api.updateNode(editedNode.id, editedNode);

            // 2. Save relationships - delete existing and create new ones
            // First, delete all interactions related to this node
            const existingInteractions = interactions.filter(
                i => i.source_node_id === node.id || i.target_node_id === node.id
            );

            for (const inter of existingInteractions) {
                await api.deleteInteraction(inter.id);
            }

            // Then create new interactions based on current state
            for (const [targetNodeId, rel] of Object.entries(nodeRelationships)) {
                // Create "sends" interaction
                if (rel.sends && rel.sendsLabel.trim()) {
                    await api.createInteraction({
                        source_node_id: node.id,
                        target_node_id: targetNodeId,
                        label: rel.sendsLabel,
                        type: 'one-way'
                    });
                }
                // Create "receives" interaction
                if (rel.receives && rel.receivesLabel.trim()) {
                    await api.createInteraction({
                        source_node_id: targetNodeId,
                        target_node_id: node.id,
                        label: rel.receivesLabel,
                        type: 'one-way'
                    });
                }
            }

            onSave();
        } catch (err) {
            console.error('Error saving node:', err);
            alert('Error al guardar');
        }
        setSaving(false);
    };

    const otherNodes = allNodes.filter(n => n.id !== node.id && n.is_active !== false);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--bg-app)',
            zIndex: 2000,
            overflow: 'auto',
            padding: 'var(--space-xl)',
            color: 'white'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-xl)',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: 'var(--space-md)'
            }}>
                <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: editedNode.color
                    }}></div>
                    Configurar Nodo
                </h1>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '8px'
                    }}
                >
                    <X size={24} />
                </button>
            </div>

            {/* Tabs Navigation */}
            <div style={{
                maxWidth: '900px',
                margin: '0 auto var(--space-xl) auto',
                display: 'flex',
                gap: 'var(--space-md)',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '2px'
            }}>
                <button
                    onClick={() => setActiveTab('general')}
                    style={{
                        padding: '12px 24px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'general' ? '3px solid var(--primary)' : '3px solid transparent',
                        color: activeTab === 'general' ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'general' ? 600 : 400,
                        fontSize: '1rem',
                        transition: 'all 0.2s ease'
                    }}
                >
                    Información General
                </button>
                <button
                    onClick={() => setActiveTab('relationships')}
                    style={{
                        padding: '12px 24px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'relationships' ? '3px solid var(--primary)' : '3px solid transparent',
                        color: activeTab === 'relationships' ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'relationships' ? 600 : 400,
                        fontSize: '1rem',
                        transition: 'all 0.2s ease'
                    }}
                >
                    Relaciones (Edges)
                </button>
            </div>

            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {activeTab === 'general' && (
                    <>
                        {/* Section 1: Basic Info */}
                        <section className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                            <h2 style={{ marginTop: 0, marginBottom: 'var(--space-md)', fontSize: '1.2rem' }}>📋 Información Básica</h2>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nombre</label>
                                    <input
                                        value={editedNode.name}
                                        onChange={e => setEditedNode({ ...editedNode, name: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'white',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Color</label>
                                    <input
                                        type="color"
                                        value={editedNode.color}
                                        onChange={e => setEditedNode({ ...editedNode, color: e.target.value })}
                                        style={{
                                            width: '100%',
                                            height: '46px',
                                            borderRadius: 'var(--radius-md)',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginTop: 'var(--space-md)' }}>
                                <label style={{ display: 'block', marginBottom: '4px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Descripción</label>
                                <textarea
                                    value={editedNode.description}
                                    onChange={e => setEditedNode({ ...editedNode, description: e.target.value })}
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'white',
                                        fontSize: '1rem',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-lg)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={editedNode.is_central || false}
                                        onChange={e => setEditedNode({ ...editedNode, is_central: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span>🎯 Es Nodo Central (Motor)</span>
                                </label>
                            </div>
                        </section>

                        {/* Section 2: Revenue */}
                        <section className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                            <h2 style={{ marginTop: 0, marginBottom: 'var(--space-md)', fontSize: '1.2rem' }}>💰 Generación de Ingresos</h2>

                            <div
                                onClick={() => setEditedNode({ ...editedNode, generates_revenue: !editedNode.generates_revenue })}
                                style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', padding: '8px 0' }}
                            >
                                {/* Toggle Switch */}
                                <div style={{
                                    width: '56px',
                                    height: '30px',
                                    borderRadius: '15px',
                                    background: editedNode.generates_revenue
                                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                        : 'rgba(100, 116, 139, 0.3)',
                                    border: editedNode.generates_revenue ? '2px solid #10b981' : '2px solid rgba(100, 116, 139, 0.5)',
                                    position: 'relative',
                                    transition: 'all 0.3s ease',
                                    boxShadow: editedNode.generates_revenue ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: '3px',
                                        left: editedNode.generates_revenue ? '28px' : '3px',
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        background: editedNode.generates_revenue ? 'white' : 'rgba(148, 163, 184, 0.8)',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}></div>
                                </div>
                                <span style={{ fontSize: '1rem', color: editedNode.generates_revenue ? 'var(--success)' : 'var(--text-secondary)' }}>
                                    {editedNode.generates_revenue ?
                                        '✅ Este nodo genera ingresos directos' :
                                        'Este nodo no genera ingresos directos'}
                                </span>
                            </div>
                        </section>
                    </>
                )}

                {activeTab === 'relationships' && (
                    <>
                        {/* Section 3: Relationships */}
                        <section className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                            <h2 style={{ marginTop: 0, marginBottom: 'var(--space-md)', fontSize: '1.2rem' }}>
                                <Link2 size={20} style={{ marginRight: '8px' }} />
                                Relaciones con Otros Nodos
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>
                                Define qué envía o recibe este nodo de los demás nodos del ecosistema.
                            </p>

                            {loading ? (
                                <p>Cargando relaciones...</p>
                            ) : otherNodes.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>No hay otros nodos activos para configurar relaciones.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                    {otherNodes.map(otherNode => {
                                        const rel = nodeRelationships[otherNode.id] || { sends: false, sendsLabel: '', receives: false, receivesLabel: '' };
                                        const isCentral = otherNode.is_central;
                                        const hasAnyRelation = rel.sends || rel.receives;

                                        return (
                                            <div
                                                key={otherNode.id}
                                                style={{
                                                    padding: 'var(--space-md)',
                                                    background: hasAnyRelation ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-card)',
                                                    border: `1px solid ${hasAnyRelation ? 'var(--primary)' : 'var(--border-color)'}`,
                                                    borderRadius: 'var(--radius-md)',
                                                    borderLeft: `4px solid ${otherNode.color}`
                                                }}
                                            >
                                                <div style={{ fontWeight: 500, marginBottom: 'var(--space-sm)' }}>
                                                    {isCentral && '🎯 '}{otherNode.name}
                                                </div>

                                                {/* SENDS row */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '100px', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={rel.sends}
                                                            onChange={e => setNodeRelationships({
                                                                ...nodeRelationships,
                                                                [otherNode.id]: { ...rel, sends: e.target.checked }
                                                            })}
                                                            style={{ width: '16px', height: '16px' }}
                                                        />
                                                        <ArrowRight size={14} style={{ color: 'var(--success)' }} />
                                                        <span style={{ fontSize: '0.85rem' }}>Envía</span>
                                                    </label>
                                                    {rel.sends && (
                                                        <input
                                                            placeholder="¿Qué envía a este nodo?"
                                                            value={rel.sendsLabel}
                                                            onChange={e => setNodeRelationships({
                                                                ...nodeRelationships,
                                                                [otherNode.id]: { ...rel, sendsLabel: e.target.value }
                                                            })}
                                                            style={{
                                                                flex: 1,
                                                                padding: '6px 10px',
                                                                background: 'var(--bg-app)',
                                                                border: '1px solid var(--border-color)',
                                                                borderRadius: 'var(--radius-sm)',
                                                                color: 'white',
                                                                fontSize: '0.85rem'
                                                            }}
                                                        />
                                                    )}
                                                </div>

                                                {/* RECEIVES row */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '100px', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={rel.receives}
                                                            onChange={e => setNodeRelationships({
                                                                ...nodeRelationships,
                                                                [otherNode.id]: { ...rel, receives: e.target.checked }
                                                            })}
                                                            style={{ width: '16px', height: '16px' }}
                                                        />
                                                        <ArrowLeft size={14} style={{ color: 'var(--warning)' }} />
                                                        <span style={{ fontSize: '0.85rem' }}>Recibe</span>
                                                    </label>
                                                    {rel.receives && (
                                                        <input
                                                            placeholder="¿Qué recibe de este nodo?"
                                                            value={rel.receivesLabel}
                                                            onChange={e => setNodeRelationships({
                                                                ...nodeRelationships,
                                                                [otherNode.id]: { ...rel, receivesLabel: e.target.value }
                                                            })}
                                                            style={{
                                                                flex: 1,
                                                                padding: '6px 10px',
                                                                background: 'var(--bg-app)',
                                                                border: '1px solid var(--border-color)',
                                                                borderRadius: 'var(--radius-sm)',
                                                                color: 'white',
                                                                fontSize: '0.85rem'
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </>
                )}

                {/* Action Buttons */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    paddingTop: 'var(--space-lg)',
                    borderTop: '1px solid var(--border-color)'
                }}>
                    {/* Delete - Less prominent, text link style */}
                    <button
                        onClick={() => onDelete(editedNode)}
                        style={{
                            padding: '8px 12px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.85rem',
                            opacity: 0.7,
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={e => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.color = '#ef4444';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.opacity = '0.7';
                            e.currentTarget.style.color = 'var(--text-muted)';
                        }}
                    >
                        <Trash size={16} /> Eliminar Nodo
                    </button>

                    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                        {/* Cancel - Secondary */}
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            Cancelar
                        </button>
                        {/* Save - Primary, most prominent */}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                padding: '14px 40px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                border: 'none',
                                color: 'white',
                                borderRadius: 'var(--radius-md)',
                                cursor: saving ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: 700,
                                fontSize: '1rem',
                                opacity: saving ? 0.7 : 1,
                                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Save size={20} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
