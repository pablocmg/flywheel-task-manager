import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Plus, TrendingUp, Trash, Pencil, AlertTriangle, Check, X, Copy, Trash2 } from 'lucide-react';

interface KeyResult {
    id: string;
    objective_id: string;
    description: string;
    target_value: number;
    current_value: number;
}

interface Objective {
    id: string;
    group_id: string;
    description: string;
    key_results: KeyResult[];
}

interface ObjectiveGroup {
    id: string;
    node_id: string;
    alias: string;
    target_date?: string;
    objectives: Objective[];
}

interface Node {
    id: string;
    name: string;
    color: string;
}

const Planning: React.FC = () => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [objectiveGroups, setObjectiveGroups] = useState<ObjectiveGroup[]>([]);

    // Group management
    const [creatingGroup, setCreatingGroup] = useState(false);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [newGroup, setNewGroup] = useState({ alias: '', target_date: '' });
    const [editingGroupAliasId, setEditingGroupAliasId] = useState<string | null>(null);
    const [editingGroupDateId, setEditingGroupDateId] = useState<string | null>(null);
    const [editingGroupAlias, setEditingGroupAlias] = useState('');
    const [editingGroupDate, setEditingGroupDate] = useState<string | null>(null);
    const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<ObjectiveGroup | null>(null);
    const [confirmReplicateGroup, setConfirmReplicateGroup] = useState<ObjectiveGroup | null>(null);
    const [confirmDeleteAllGroups, setConfirmDeleteAllGroups] = useState(false);
    const [confirmReplicateAllGroups, setConfirmReplicateAllGroups] = useState(false);
    const dateInputRef = useRef<HTMLInputElement>(null);

    // Objective management
    const [creatingObjectiveForGroup, setCreatingObjectiveForGroup] = useState<string | null>(null);
    const [newObjective, setNewObjective] = useState({ description: '' });
    const [editingObjId, setEditingObjId] = useState<string | null>(null);
    const [editingObjDesc, setEditingObjDesc] = useState('');
    const [confirmDeleteObjective, setConfirmDeleteObjective] = useState<Objective | null>(null);

    // KR management
    const [showAddKR, setShowAddKR] = useState<string | null>(null);
    const [newKR, setNewKR] = useState({ description: '', target_value: 100 });
    const [krError, setKrError] = useState<string | null>(null);
    const [editingKrId, setEditingKrId] = useState<string | null>(null);
    const [editingKrDesc, setEditingKrDesc] = useState('');

    useEffect(() => {
        loadNodes();
    }, []);

    useEffect(() => {
        if (selectedNodeId) {
            loadObjectiveGroups();
        }
    }, [selectedNodeId]);

    const loadNodes = async () => {
        setLoading(true);
        try {
            const nodesData = await api.getNodes();
            const activeNodes = nodesData.filter((n: any) => n.is_active !== false);
            setNodes(activeNodes);
            if (activeNodes.length > 0 && !selectedNodeId) {
                setSelectedNodeId(activeNodes[0].id);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const loadObjectiveGroups = async () => {
        if (!selectedNodeId) return;
        try {
            const groups = await api.getObjectiveGroups(selectedNodeId);
            setObjectiveGroups(groups);
        } catch (err) {
            console.error(err);
        }
    };

    // Group handlers
    const handleCreateGroup = async () => {
        if (!selectedNodeId || !newGroup.alias.trim()) {
            alert('Debes ingresar un alias para el grupo');
            return;
        }

        if (!newGroup.target_date) {
            alert('Debes seleccionar una fecha objetivo para el grupo');
            return;
        }

        setIsCreatingGroup(true);
        try {
            await api.createObjectiveGroup({
                node_id: selectedNodeId,
                alias: newGroup.alias,
                target_date: newGroup.target_date
            });
            setCreatingGroup(false);
            setNewGroup({ alias: '', target_date: '' });
            await loadObjectiveGroups();
        } catch (err) {
            console.error(err);
            alert('Error al crear el grupo de objetivos');
        } finally {
            setIsCreatingGroup(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!confirmDeleteGroup) return;

        try {
            await api.deleteObjectiveGroup(confirmDeleteGroup.id);
            setConfirmDeleteGroup(null);
            loadObjectiveGroups();
        } catch (err) {
            console.error(err);
            alert('Error al eliminar el grupo');
        }
    };

    const handleReplicateGroup = async () => {
        if (!confirmReplicateGroup) return;

        try {
            const result = await api.replicateObjectiveGroup(confirmReplicateGroup.id);
            setConfirmReplicateGroup(null);
            alert(`Grupo replicado exitosamente a ${result.createdGroups.length} nodo(s)`);
        } catch (err) {
            console.error(err);
            alert('Error al replicar el grupo');
        }
    };

    const handleDeleteAllGroups = async () => {
        if (!selectedNodeId) return;

        try {
            const result = await api.deleteAllObjectiveGroupsByNode(selectedNodeId);
            setConfirmDeleteAllGroups(false);
            loadObjectiveGroups();
            alert(`Se eliminaron ${result.deletedCount} grupo(s) de objetivos exitosamente`);
        } catch (err) {
            console.error(err);
            alert('Error al eliminar todos los grupos');
        }
    };

    const handleReplicateAllGroups = async () => {
        if (!selectedNodeId) return;

        try {
            const result = await api.replicateAllObjectiveGroupsFromNode(selectedNodeId);
            setConfirmReplicateAllGroups(false);
            alert(`Se replicaron ${objectiveGroups.length} grupo(s) a todos los demás nodos exitosamente (${result.totalCreated} grupos creados en total)`);
        } catch (err) {
            console.error(err);
            alert('Error al replicar todos los grupos');
        }
    };

    // Objective handlers
    const handleCreateObjective = async (groupId: string) => {
        if (!newObjective.description.trim()) {
            alert('Debes ingresar una descripción para el objetivo');
            return;
        }

        try {
            await api.createObjective({
                group_id: groupId,
                description: newObjective.description
            });
            setCreatingObjectiveForGroup(null);
            setNewObjective({ description: '' });
            loadObjectiveGroups();
        } catch (err) {
            console.error(err);
            alert('Error al crear el objetivo');
        }
    };

    const handleUpdateObjective = async (objId: string, newDesc: string) => {
        try {
            const group = objectiveGroups.find(g => g.objectives.some(o => o.id === objId));
            const obj = group?.objectives.find(o => o.id === objId);
            if (!obj) return;

            await api.updateObjective(objId, { ...obj, description: newDesc });
            setEditingObjId(null);
            loadObjectiveGroups();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteObjective = async () => {
        if (!confirmDeleteObjective) return;

        try {
            await api.deleteObjective(confirmDeleteObjective.id);
            setConfirmDeleteObjective(null);
            loadObjectiveGroups();
        } catch (err) {
            console.error(err);
            alert('Error al eliminar el objetivo');
        }
    };

    // KR handlers
    const handleAddKR = async (objId: string) => {
        if (!newKR.description.trim()) return;

        // Check for duplicates
        const group = objectiveGroups.find(g => g.objectives.some(o => o.id === objId));
        const obj = group?.objectives.find(o => o.id === objId);
        const isDuplicate = obj?.key_results?.some(
            kr => kr.description.trim().toLowerCase() === newKR.description.trim().toLowerCase()
        );

        if (isDuplicate) {
            setKrError('Ya existe un KR con ese nombre');
            return;
        }

        setKrError(null);

        try {
            await api.createKeyResult({ ...newKR, objective_id: objId });
            setShowAddKR(null);
            setNewKR({ description: '', target_value: 100 });
            loadObjectiveGroups();
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Error al crear el resultado clave');
        }
    };

    const handleDeleteKR = async (krId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        try {
            await api.deleteKeyResult(krId);
            loadObjectiveGroups();
        } catch (err) {
            console.error(err);
            alert('Error al eliminar el resultado clave');
        }
    };

    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    return (
        <div style={{ padding: 'var(--space-lg)', paddingBottom: '100px' }}>
            <div style={{ marginBottom: 'var(--space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Planificación Estratégica</h1>
                    <p className="text-muted">Gestiona grupos de objetivos, objetivos individuales y resultados clave por nodo.</p>
                </div>
            </div>

            {loading ? <p>Cargando...</p> : (
                <>
                    {/* Node Selector */}
                    {nodes.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-lg)' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Seleccionar Nodo:</label>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                                {nodes.map(node => (
                                    <button
                                        key={node.id}
                                        onClick={() => setSelectedNodeId(node.id)}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: 'var(--radius-md)',
                                            border: selectedNodeId === node.id ? `2px solid ${node.color}` : `1px solid ${node.color}`,
                                            background: selectedNodeId === node.id ? `${node.color}33` : `${node.color}15`,
                                            color: selectedNodeId === node.id ? 'white' : node.color,
                                            cursor: 'pointer',
                                            fontWeight: selectedNodeId === node.id ? 700 : 500,
                                            transition: 'all 0.2s ease',
                                            boxShadow: selectedNodeId === node.id ? `0 0 15px ${node.color}40` : 'none'
                                        }}
                                    >
                                        {node.name}
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginTop: '12px' }}>
                                {selectedNodeId && objectiveGroups.length > 0 && (
                                    <>
                                        <button
                                            onClick={() => setConfirmReplicateAllGroups(true)}
                                            style={{
                                                padding: '10px 20px',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--cobalt)',
                                                background: 'var(--cobalt)15',
                                                color: 'var(--cobalt)',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                transition: 'all 0.2s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'var(--cobalt)';
                                                e.currentTarget.style.color = 'white';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'var(--cobalt)15';
                                                e.currentTarget.style.color = 'var(--cobalt)';
                                            }}
                                        >
                                            <Copy size={18} />
                                            Copiar Todos los Grupos a los demás Nodos
                                        </button>
                                        <button
                                            onClick={() => setConfirmDeleteAllGroups(true)}
                                            style={{
                                                padding: '10px 20px',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--danger)',
                                                background: 'var(--danger)15',
                                                color: 'var(--danger)',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                transition: 'all 0.2s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'var(--danger)';
                                                e.currentTarget.style.color = 'white';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'var(--danger)15';
                                                e.currentTarget.style.color = 'var(--danger)';
                                            }}
                                        >
                                            <Trash2 size={18} />
                                            Borrar Todos los Grupos de este Nodo
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {selectedNode && (
                        <div>
                            {/* Objective Groups */}
                            {objectiveGroups.map(group => (
                                <div key={group.id} className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)', borderLeft: `4px solid ${selectedNode.color}` }}>
                                    {/* Group Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                                        <div style={{ flex: 1 }}>
                                            {editingGroupAliasId === group.id ? (
                                                <input
                                                    autoFocus
                                                    value={editingGroupAlias}
                                                    onChange={e => setEditingGroupAlias(e.target.value)}
                                                    onBlur={async () => {
                                                        if (editingGroupAlias.trim() && editingGroupAlias !== group.alias) {
                                                            await api.updateObjectiveGroup(group.id, { alias: editingGroupAlias, target_date: group.target_date });
                                                            loadObjectiveGroups();
                                                        }
                                                        setEditingGroupAliasId(null);
                                                    }}
                                                    onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                                    style={{ width: '100%', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--primary)', color: 'white', borderRadius: '4px', fontSize: '1.1rem', fontWeight: 600 }}
                                                />
                                            ) : (
                                                <h2
                                                    onClick={() => { setEditingGroupAliasId(group.id); setEditingGroupAlias(group.alias); }}
                                                    style={{ margin: 0, cursor: 'pointer', fontSize: '1.1rem', fontWeight: 600 }}
                                                >
                                                    {group.alias}
                                                </h2>
                                            )}
                                            {editingGroupDateId === group.id ? (
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                                    <input
                                                        ref={dateInputRef}
                                                        type="date"
                                                        autoFocus
                                                        value={editingGroupDate ? editingGroupDate.split('T')[0] : ''}
                                                        onChange={(e) => {
                                                            setEditingGroupDate(e.target.value);
                                                        }}
                                                        onKeyDown={async (e) => {
                                                            if (e.key === 'Escape') {
                                                                setEditingGroupDateId(null);
                                                                setEditingGroupDate(null);
                                                            } else if (e.key === 'Enter') {
                                                                // Save on Enter
                                                                if (editingGroupDate) {
                                                                    await api.updateObjectiveGroup(group.id, { alias: group.alias, target_date: editingGroupDate });
                                                                    loadObjectiveGroups();
                                                                }
                                                                setEditingGroupDateId(null);
                                                                setEditingGroupDate(null);
                                                            }
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                (e.target as HTMLInputElement).showPicker();
                                                            } catch (err) {
                                                                console.warn('showPicker not supported');
                                                            }
                                                        }}
                                                        style={{ fontSize: '0.85rem', color: 'var(--primary)', background: 'var(--bg-app)', border: '1px solid var(--primary)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', flex: 1 }}
                                                    />
                                                    <button
                                                        onClick={async () => {
                                                            if (editingGroupDate) {
                                                                await api.updateObjectiveGroup(group.id, { alias: group.alias, target_date: editingGroupDate });
                                                                loadObjectiveGroups();
                                                            }
                                                            setEditingGroupDateId(null);
                                                            setEditingGroupDate(null);
                                                        }}
                                                        style={{ padding: '4px 8px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        title="Guardar fecha"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingGroupDateId(null);
                                                            setEditingGroupDate(null);
                                                        }}
                                                        style={{ padding: '4px 8px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        title="Cancelar"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div
                                                    onClick={() => {
                                                        setEditingGroupDateId(group.id);
                                                        // Format to YYYY-MM-DD for date input
                                                        const dateStr = group.target_date ? group.target_date.split('T')[0] : '';
                                                        setEditingGroupDate(dateStr);
                                                    }}
                                                    style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '4px', cursor: 'pointer' }}
                                                >
                                                    🎯 Fecha objetivo: {group.target_date ? new Date(group.target_date).toLocaleDateString() : 'Sin fecha'}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => setCreatingObjectiveForGroup(group.id)}
                                                style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600 }}
                                            >
                                                <Plus size={16} style={{ marginRight: '4px' }} /> Objetivo
                                            </button>
                                            <button
                                                onClick={() => setConfirmReplicateGroup(group)}
                                                style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                title="Replicar grupo a todos los nodos"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteGroup(group)}
                                                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Create Objective Form */}
                                    {creatingObjectiveForGroup === group.id && (
                                        <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <input
                                                    placeholder="Descripción del objetivo"
                                                    value={newObjective.description}
                                                    onChange={e => setNewObjective({ description: e.target.value })}
                                                    style={{ flex: 1, padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.9rem', borderRadius: '4px' }}
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handleCreateObjective(group.id)}
                                                    style={{ padding: '8px 16px', background: 'var(--primary)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.9rem', borderRadius: '4px', fontWeight: 600 }}
                                                >
                                                    Crear
                                                </button>
                                                <button
                                                    onClick={() => { setCreatingObjectiveForGroup(null); setNewObjective({ description: '' }); }}
                                                    style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', borderRadius: '4px' }}
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Objectives */}
                                    {group.objectives.map(obj => (
                                        <div key={obj.id} style={{ marginBottom: 'var(--space-md)', paddingLeft: 'var(--space-md)', borderLeft: `2px solid ${selectedNode.color}40` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                                                <div style={{ flex: 1 }}>
                                                    {editingObjId === obj.id ? (
                                                        <input
                                                            autoFocus
                                                            value={editingObjDesc}
                                                            onChange={e => setEditingObjDesc(e.target.value)}
                                                            onBlur={() => handleUpdateObjective(obj.id, editingObjDesc)}
                                                            onKeyDown={e => e.key === 'Enter' && handleUpdateObjective(obj.id, editingObjDesc)}
                                                            style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-app)', border: '1px solid var(--primary)', color: 'white', borderRadius: '4px', fontSize: '0.95rem', fontWeight: 500 }}
                                                        />
                                                    ) : (
                                                        <h4
                                                            onClick={() => { setEditingObjId(obj.id); setEditingObjDesc(obj.description); }}
                                                            style={{ margin: 0, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500 }}
                                                        >
                                                            {obj.description}
                                                        </h4>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => setShowAddKR(showAddKR === obj.id ? null : obj.id)}
                                                        style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}
                                                    >
                                                        <Plus size={14} style={{ marginRight: '2px' }} /> KR
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDeleteObjective(obj)}
                                                        style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.6)', cursor: 'pointer', padding: '4px' }}
                                                    >
                                                        <Trash size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Key Results */}
                                            <div style={{ paddingLeft: '8px', borderLeft: '2px solid rgba(255,255,255,0.1)', marginBottom: 'var(--space-sm)' }}>
                                                {obj.key_results?.map(kr => (
                                                    <div key={kr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: '0.85rem' }}>
                                                        {editingKrId === kr.id ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                                                <TrendingUp size={12} color={selectedNode.color} />
                                                                <input
                                                                    autoFocus
                                                                    value={editingKrDesc}
                                                                    onChange={e => setEditingKrDesc(e.target.value)}
                                                                    onBlur={async () => {
                                                                        if (editingKrDesc.trim() && editingKrDesc !== kr.description) {
                                                                            await api.updateKeyResult(kr.id, { ...kr, description: editingKrDesc });
                                                                            loadObjectiveGroups();
                                                                        }
                                                                        setEditingKrId(null);
                                                                    }}
                                                                    onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                                                    style={{ flex: 1, padding: '2px 6px', background: 'var(--bg-app)', border: '1px solid var(--primary)', color: 'white', fontSize: '0.85rem', borderRadius: '4px' }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                                                <TrendingUp size={12} color={selectedNode.color} />
                                                                <span>{kr.description}</span>
                                                            </div>
                                                        )}
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            <button
                                                                onClick={() => { setEditingKrId(kr.id); setEditingKrDesc(kr.description); }}
                                                                style={{ background: 'none', border: 'none', color: 'rgba(139, 92, 246, 0.4)', cursor: 'pointer', padding: '2px' }}
                                                            >
                                                                <Pencil size={12} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteKR(kr.id, e)}
                                                                style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.4)', cursor: 'pointer', padding: '2px' }}
                                                            >
                                                                <Trash size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}

                                                {obj.key_results?.length === 0 && !showAddKR && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                                                        Sin resultados clave
                                                    </div>
                                                )}

                                                {showAddKR === obj.id && (
                                                    <div style={{ marginTop: '8px' }}>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <input
                                                                placeholder="Nuevo KR"
                                                                value={newKR.description}
                                                                onChange={e => { setNewKR({ ...newKR, description: e.target.value }); setKrError(null); }}
                                                                style={{ flex: 1, padding: '4px 8px', background: 'var(--bg-app)', border: krError ? '1px solid #ef4444' : '1px solid var(--border-color)', color: 'white', fontSize: '0.8rem', borderRadius: '4px' }}
                                                            />
                                                            <button
                                                                onClick={() => handleAddKR(obj.id)}
                                                                style={{ padding: '4px 12px', background: 'var(--primary)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.8rem', borderRadius: '4px' }}
                                                            >
                                                                OK
                                                            </button>
                                                        </div>
                                                        {krError && (
                                                            <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                                                                ⚠️ {krError}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {group.objectives.length === 0 && !creatingObjectiveForGroup && (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: 'var(--space-md) 0' }}>
                                            Sin objetivos. Haz clic en "+ Objetivo" para agregar uno.
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Create Group Button/Form */}
                            {creatingGroup ? (
                                <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
                                    <h3>Nuevo Grupo de Objetivos</h3>
                                    <input
                                        placeholder="Alias del grupo (ej: Q1 2025, Semestre 1)"
                                        value={newGroup.alias}
                                        onChange={e => setNewGroup({ ...newGroup, alias: e.target.value })}
                                        style={{ width: '100%', marginBottom: '12px', padding: '10px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                                        autoFocus
                                    />
                                    <input
                                        type="date"
                                        value={newGroup.target_date}
                                        onChange={e => setNewGroup({ ...newGroup, target_date: e.target.value })}
                                        onClick={(e) => {
                                            try {
                                                (e.target as HTMLInputElement).showPicker();
                                            } catch (err) {
                                                console.warn('showPicker not supported');
                                            }
                                        }}
                                        required
                                        style={{ width: '100%', marginBottom: '12px', padding: '10px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                                    />
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            onClick={handleCreateGroup}
                                            disabled={isCreatingGroup}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                background: isCreatingGroup ? 'var(--text-muted)' : 'var(--primary)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: isCreatingGroup ? 'not-allowed' : 'pointer',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            {isCreatingGroup ? (
                                                <>
                                                    <span className="spinner" style={{
                                                        width: '16px',
                                                        height: '16px',
                                                        border: '2px solid rgba(255,255,255,0.3)',
                                                        borderTop: '2px solid white',
                                                        borderRadius: '50%',
                                                        animation: 'spin 1s linear infinite'
                                                    }}></span>
                                                    Creando...
                                                </>
                                            ) : 'Crear Grupo'}
                                        </button>
                                        <button
                                            onClick={() => { setCreatingGroup(false); setNewGroup({ alias: '', target_date: '' }); }}
                                            style={{ flex: 1, padding: '10px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setCreatingGroup(true)}
                                    style={{
                                        padding: '12px 24px',
                                        background: 'var(--primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontWeight: 600
                                    }}
                                >
                                    <Plus size={18} />
                                    Nuevo Grupo de Objetivos
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Delete Group Confirmation */}
            {confirmDeleteGroup && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001
                }}>
                    <div className="glass-panel" style={{ padding: 'var(--space-lg)', width: '450px', textAlign: 'center' }}>
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <AlertTriangle size={48} color="#ef4444" />
                        </div>
                        <h3 style={{ margin: '0 0 var(--space-sm) 0', color: '#ef4444' }}>⚠️ ADVERTENCIA</h3>
                        <p className="text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                            ¿Estás seguro de que quieres <strong>ELIMINAR</strong> el grupo "<strong>{confirmDeleteGroup.alias}</strong>"?
                        </p>
                        <p style={{ marginBottom: 'var(--space-md)', color: '#f87171', fontSize: '0.9rem' }}>
                            Esta acción es <strong>PERMANENTE</strong> y eliminará el grupo, <strong>todos sus objetivos</strong>, <strong>todos los resultados clave</strong> y <strong>todas las tareas asociadas</strong>.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setConfirmDeleteGroup(null)}
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
                                onClick={handleDeleteGroup}
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
                                ELIMINAR GRUPO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Replicate Group Confirmation */}
            {confirmReplicateGroup && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001
                }}>
                    <div className="glass-panel" style={{ padding: 'var(--space-lg)', width: '450px', textAlign: 'center' }}>
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <Copy size={48} color="#3b82f6" />
                        </div>
                        <h3 style={{ margin: '0 0 var(--space-sm) 0', color: '#3b82f6' }}>Replicar Grupo</h3>
                        <p className="text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                            ¿Quieres replicar el grupo "<strong>{confirmReplicateGroup.alias}</strong>" a todos los demás nodos?
                        </p>
                        <p style={{ marginBottom: 'var(--space-md)', color: '#60a5fa', fontSize: '0.9rem' }}>
                            Se creará un grupo <strong>vacío</strong> con el mismo <strong>alias</strong> y <strong>fecha objetivo</strong> en todos los nodos. Los objetivos y resultados clave <strong>NO</strong> se copiarán.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setConfirmReplicateGroup(null)}
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
                                onClick={handleReplicateGroup}
                                style={{
                                    padding: '10px 24px',
                                    background: '#3b82f6',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 'bold'
                                }}
                            >
                                REPLICAR GRUPO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Objective Confirmation */}
            {confirmDeleteObjective && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001
                }}>
                    <div className="glass-panel" style={{ padding: 'var(--space-lg)', width: '450px', textAlign: 'center' }}>
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <AlertTriangle size={48} color="#ef4444" />
                        </div>
                        <h3 style={{ margin: '0 0 var(--space-sm) 0', color: '#ef4444' }}>⚠️ ADVERTENCIA</h3>
                        <p className="text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                            ¿Estás seguro de que quieres <strong>ELIMINAR</strong> el objetivo "<strong>{confirmDeleteObjective.description}</strong>"?
                        </p>
                        <p style={{ marginBottom: 'var(--space-md)', color: '#f87171', fontSize: '0.9rem' }}>
                            Esta acción es <strong>PERMANENTE</strong> y eliminará el objetivo, <strong>todos sus resultados clave</strong> y <strong>todas las tareas asociadas</strong>.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setConfirmDeleteObjective(null)}
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
                                onClick={handleDeleteObjective}
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
                                ELIMINAR OBJETIVO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete All Groups Confirmation */}
            {confirmDeleteAllGroups && selectedNode && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001
                }}>
                    <div className="glass-panel" style={{ padding: 'var(--space-lg)', width: '500px', textAlign: 'center' }}>
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <AlertTriangle size={56} color="#ef4444" />
                        </div>
                        <h3 style={{ margin: '0 0 var(--space-sm) 0', color: '#ef4444', fontSize: '1.5rem' }}>🚨 PELIGRO EXTREMO</h3>
                        <p className="text-muted" style={{ marginBottom: 'var(--space-md)', fontSize: '1.1rem' }}>
                            ¿Estás seguro de que quieres <strong>ELIMINAR TODOS</strong> los grupos de objetivos del nodo "<strong>{selectedNode.name}</strong>"?
                        </p>
                        <p style={{ marginBottom: 'var(--space-md)', color: '#f87171', fontSize: '1rem', fontWeight: 600 }}>
                            Esta acción es <strong>IRREVERSIBLE</strong> y eliminará:
                        </p>
                        <ul style={{ textAlign: 'left', marginBottom: 'var(--space-md)', color: '#f87171', paddingLeft: '40px' }}>
                            <li><strong>Todos los grupos de objetivos</strong> ({objectiveGroups.length} grupos)</li>
                            <li><strong>Todos los objetivos</strong> dentro de esos grupos</li>
                            <li><strong>Todos los resultados clave</strong></li>
                            <li><strong>Todas las tareas asociadas</strong></li>
                        </ul>
                        <p style={{ marginBottom: 'var(--space-lg)', color: '#ef4444', fontSize: '0.95rem', fontWeight: 700 }}>
                            ⚠️ NO HAY FORMA DE RECUPERAR ESTA INFORMACIÓN ⚠️
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setConfirmDeleteAllGroups(false)}
                                style={{
                                    padding: '12px 28px',
                                    background: 'var(--primary)',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 'bold',
                                    fontSize: '1rem'
                                }}
                            >
                                CANCELAR (Recomendado)
                            </button>
                            <button
                                onClick={handleDeleteAllGroups}
                                style={{
                                    padding: '12px 28px',
                                    background: '#ef4444',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 'bold',
                                    fontSize: '1rem'
                                }}
                            >
                                SÍ, ELIMINAR TODO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Replicate All Groups Confirmation */}
            {confirmReplicateAllGroups && selectedNode && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001
                }}>
                    <div className="glass-panel" style={{ padding: 'var(--space-lg)', width: '500px', textAlign: 'center' }}>
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <Copy size={56} color="#3b82f6" />
                        </div>
                        <h3 style={{ margin: '0 0 var(--space-sm) 0', color: '#3b82f6', fontSize: '1.5rem' }}>COPIAR ESTRUCTURA</h3>
                        <p className="text-muted" style={{ marginBottom: 'var(--space-md)', fontSize: '1.1rem' }}>
                            ¿Quieres copiar los <strong>{objectiveGroups.length}</strong> grupos de objetivos del nodo "<strong>{selectedNode.name}</strong>" a todos los demás nodos?
                        </p>
                        <p style={{ marginBottom: 'var(--space-md)', color: '#60a5fa', fontSize: '1rem', fontWeight: 600 }}>
                            Se crearán grupos <strong>vacíos</strong> con los mismos <strong>alias</strong> y <strong>fechas objetivo</strong> en todos los nodos. Los objetivos y resultados clave <strong>NO</strong> se copiarán.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setConfirmReplicateAllGroups(false)}
                                style={{
                                    padding: '12px 28px',
                                    background: 'transparent',
                                    border: '1px solid var(--text-muted)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 'bold',
                                    fontSize: '1rem'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReplicateAllGroups}
                                style={{
                                    padding: '12px 28px',
                                    background: '#3b82f6',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 'bold',
                                    fontSize: '1rem'
                                }}
                            >
                                SÍ, COPIAR TODO
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Planning;
