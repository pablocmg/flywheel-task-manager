import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Plus, TrendingUp, Trash, Pencil, AlertTriangle, Check, X, Copy, Trash2, GripVertical } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
    is_central?: boolean;
}

function SortableKR({ id, enabled, children }: { id: string; enabled: boolean; children: React.ReactNode }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id, disabled: !enabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
    };

    return (
        <div ref={setNodeRef} style={style}>
            {enabled && (
                <div {...attributes} {...listeners} onMouseDown={e => e.preventDefault()} style={{ cursor: 'grab', padding: '4px', display: 'flex', alignItems: 'center' }}>
                    <GripVertical size={14} color="rgba(255,255,255,0.3)" />
                </div>
            )}
            <div style={{ flex: 1 }}>{children}</div>
        </div>
    );
}

function SortableObjective({ id, enabled, children }: { id: string; enabled: boolean; children: React.ReactNode }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id, disabled: !enabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        marginBottom: 'var(--space-md)',
    };

    return (
        <div ref={setNodeRef} style={style}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                {enabled && (
                    <div {...attributes} {...listeners} onMouseDown={e => e.preventDefault()} style={{ cursor: 'grab', padding: '12px 4px 0 0', display: 'flex', alignItems: 'center' }}>
                        <GripVertical size={16} color="rgba(255,255,255,0.3)" />
                    </div>
                )}
                <div style={{ flex: 1 }}>{children}</div>
            </div>
        </div>
    );
}

const Planning: React.FC = () => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [objectiveGroups, setObjectiveGroups] = useState<ObjectiveGroup[]>([]);
    const [allObjectiveGroups, setAllObjectiveGroups] = useState<ObjectiveGroup[]>([]);

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
    const [successReplicateAllGroups, setSuccessReplicateAllGroups] = useState<{ periodsCount: number; totalCreated: number } | null>(null);
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
    const [isCreatingKR, setIsCreatingKR] = useState(false);
    const [deletingKRId, setDeletingKRId] = useState<string | null>(null);
    const [deletingObjectiveId, setDeletingObjectiveId] = useState<string | null>(null);
    const [deletingPeriodId, setDeletingPeriodId] = useState<string | null>(null);
    const [isCreatingObjective, setIsCreatingObjective] = useState(false);
    const [isCreatingPeriod, setIsCreatingPeriod] = useState(false);
    const [updatingObjectiveId, setUpdatingObjectiveId] = useState<string | null>(null);
    const [updatingKRId, setUpdatingKRId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        // Check if it's an Objective
        const sourceGroup = objectiveGroups.find(g => g.objectives.some(o => o.id === active.id));
        if (sourceGroup) {
            // It's an objective
            const oldIndex = sourceGroup.objectives.findIndex(o => o.id === active.id);
            const newIndex = sourceGroup.objectives.findIndex(o => o.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newObjectives = arrayMove(sourceGroup.objectives, oldIndex, newIndex);

                // Optimistic Update
                setObjectiveGroups(prev => prev.map(g =>
                    g.id === sourceGroup.id ? { ...g, objectives: newObjectives } : g
                ));

                // Backend Update
                // We don't await this to keep UI responsive, but in real app we might want to handle errors
                try {
                    await Promise.all(newObjectives.map((obj, index) =>
                        api.updateObjectiveOrder(obj.id, index)
                    ));
                } catch (err) {
                    console.error('Error updating objective order:', err);
                    loadObjectiveGroups(); // Revert on error properly
                }
            }
            return;
        }

        // Check if it's a KR
        let sourceObj: Objective | undefined;
        let sourceGroupForKR: ObjectiveGroup | undefined;

        for (const g of objectiveGroups) {
            sourceObj = g.objectives.find(o => o.key_results.some(kr => kr.id === active.id));
            if (sourceObj) {
                sourceGroupForKR = g;
                break;
            }
        }

        if (sourceObj && sourceGroupForKR) {
            const oldIndex = sourceObj.key_results.findIndex(kr => kr.id === active.id);
            const newIndex = sourceObj.key_results.findIndex(kr => kr.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newKRs = arrayMove(sourceObj.key_results, oldIndex, newIndex);

                // Optimistic Update
                setObjectiveGroups(prev => prev.map(g =>
                    g.id === sourceGroupForKR!.id ? {
                        ...g,
                        objectives: g.objectives.map(o =>
                            o.id === sourceObj!.id ? { ...o, key_results: newKRs } : o
                        )
                    } : g
                ));

                // Backend Update
                try {
                    await Promise.all(newKRs.map((kr, index) =>
                        api.updateKeyResultOrder(kr.id, index)
                    ));
                } catch (err) {
                    console.error('Error updating KR order:', err);
                    loadObjectiveGroups();
                }
            }
        }
    };

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

            // Load all objective groups for completion check
            const allGroups: ObjectiveGroup[] = [];
            for (const node of activeNodes) {
                try {
                    const groups = await api.getObjectiveGroups(node.id);
                    allGroups.push(...groups);
                } catch (err) {
                    console.error(`Error loading groups for node ${node.id}:`, err);
                }
            }
            setAllObjectiveGroups(allGroups);
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

            // Update allObjectiveGroups for this node
            setAllObjectiveGroups(prev => [
                ...prev.filter(g => g.node_id !== selectedNodeId),
                ...groups
            ]);
        } catch (err) {
            console.error(err);
        }
    };

    // Group handlers
    const handleCreateGroup = async () => {
        if (!selectedNodeId || !newGroup.alias.trim()) {
            alert('Debes ingresar un alias para el periodo');
            return;
        }

        if (!newGroup.target_date) {
            alert('Debes seleccionar una fecha objetivo para el periodo');
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
            alert('Error al crear el periodo de objetivos');
        } finally {
            setIsCreatingGroup(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!confirmDeleteGroup) return;

        setDeletingPeriodId(confirmDeleteGroup.id);
        try {
            await api.deleteObjectiveGroup(confirmDeleteGroup.id);
            setConfirmDeleteGroup(null);
            loadObjectiveGroups();
        } catch (err) {
            console.error(err);
            alert('Error al eliminar el periodo');
        } finally {
            setDeletingPeriodId(null);
        }
    };

    const handleReplicateGroup = async () => {
        if (!confirmReplicateGroup) return;

        try {
            const result = await api.replicateObjectiveGroup(confirmReplicateGroup.id);
            setConfirmReplicateGroup(null);
            alert(`Periodo replicado exitosamente a ${result.createdGroups.length} nodo(s)`);
        } catch (err) {
            console.error(err);
            alert('Error al replicar el periodo');
        }
    };

    const handleDeleteAllGroups = async () => {
        if (!selectedNodeId) return;

        try {
            const result = await api.deleteAllObjectiveGroupsByNode(selectedNodeId);
            setConfirmDeleteAllGroups(false);
            loadObjectiveGroups();
            alert(`Se eliminaron ${result.deletedCount} periodo(s) de objetivos exitosamente`);
        } catch (err) {
            console.error(err);
            alert('Error al eliminar todos los periodos');
        }
    };

    const handleReplicateAllGroups = async () => {
        if (!selectedNodeId) return;

        try {
            const result = await api.replicateAllObjectiveGroupsFromNode(selectedNodeId);
            setConfirmReplicateAllGroups(false);
            setSuccessReplicateAllGroups({ periodsCount: objectiveGroups.length, totalCreated: result.totalCreated });
        } catch (err) {
            console.error(err);
            alert('Error al replicar todos los periodos');
        }
    };

    // Objective handlers
    const handleCreateObjective = async (groupId: string) => {
        if (!newObjective.description.trim()) {
            alert('Debes ingresar una descripción para el objetivo');
            return;
        }

        setIsCreatingObjective(true);
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
        } finally {
            setIsCreatingObjective(false);
        }
    };

    const handleUpdateObjective = async (objId: string, newDesc: string) => {
        setUpdatingObjectiveId(objId);
        try {
            const group = objectiveGroups.find(g => g.objectives.some(o => o.id === objId));
            const obj = group?.objectives.find(o => o.id === objId);
            if (!obj) return;

            await api.updateObjective(objId, { ...obj, description: newDesc });
            setEditingObjId(null);
            loadObjectiveGroups();
        } catch (err) {
            console.error(err);
        } finally {
            setUpdatingObjectiveId(null);
        }
    };

    const handleDeleteObjective = async () => {
        if (!confirmDeleteObjective) return;

        setDeletingObjectiveId(confirmDeleteObjective.id);
        try {
            await api.deleteObjective(confirmDeleteObjective.id);
            setConfirmDeleteObjective(null);
            loadObjectiveGroups();
        } catch (err) {
            console.error(err);
            alert('Error al eliminar el objetivo');
        } finally {
            setDeletingObjectiveId(null);
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
        setIsCreatingKR(true);

        try {
            await api.createKeyResult({ ...newKR, objective_id: objId });
            setShowAddKR(null);
            setNewKR({ description: '', target_value: 100 });
            loadObjectiveGroups();
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Error al crear el resultado clave');
        } finally {
            setIsCreatingKR(false);
        }
    };

    const handleDeleteKR = async (krId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        setDeletingKRId(krId);
        try {
            await api.deleteKeyResult(krId);
            loadObjectiveGroups();
        } catch (err) {
            console.error(err);
            alert('Error al eliminar el resultado clave');
        } finally {
            setDeletingKRId(null);
        }
    };

    // Helper to check if a node is complete
    const isNodeComplete = (nodeId: string) => {
        const nodeGroups = allObjectiveGroups.filter(g => g.node_id === nodeId);
        if (nodeGroups.length === 0) return false;

        return nodeGroups.some(group =>
            group.objectives.length > 0 &&
            group.objectives.some(obj => obj.key_results && obj.key_results.length > 0)
        );
    };

    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    return (
        <div style={{ padding: 'var(--space-lg)', paddingBottom: '100px' }}>
            <div style={{ marginBottom: 'var(--space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Planificación Estratégica</h1>
                    <p className="text-muted">Gestiona periodos de objetivos, objetivos individuales y resultados clave por nodo.</p>
                </div>
            </div>

            {loading ? <p>Cargando...</p> : (
                <>
                    {/* Node Selector */}
                    {nodes.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-lg)' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Seleccionar Nodo:</label>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                                {nodes.map(node => {
                                    const isComplete = isNodeComplete(node.id);
                                    return (
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
                                                boxShadow: selectedNodeId === node.id ? `0 0 15px ${node.color}40` : 'none',
                                                opacity: isComplete ? 1 : 0.6
                                            }}
                                        >
                                            {node.is_central && <span style={{ marginRight: '6px' }}>👑</span>}
                                            {node.name}
                                            {isComplete && <span style={{ marginLeft: '6px', fontSize: '0.85em' }}>✓</span>}
                                        </button>
                                    );
                                })}
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
                                            Copiar Todos los Periodos a los demás Nodos
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
                                            Borrar Todos los Periodos de este Nodo
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {selectedNode && (
                        <div>
                            {/* Objective Groups */}
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                {objectiveGroups.map(group => (
                                    <div key={group.id} className="glass-panel" style={{
                                        padding: 'var(--space-md)',
                                        marginBottom: 'var(--space-lg)',
                                        borderLeft: `4px solid ${group.objectives.length === 0 ? 'rgba(255,255,255,0.1)' : selectedNode.color}`
                                    }}>
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
                                                        style={{
                                                            margin: 0,
                                                            cursor: 'pointer',
                                                            fontSize: '1.1rem',
                                                            fontWeight: 600,
                                                            wordWrap: 'break-word',
                                                            overflowWrap: 'break-word',
                                                            lineHeight: '1.4',
                                                            opacity: group.objectives.length === 0 ? 0.4 : 1,
                                                            color: group.objectives.length === 0 ? 'var(--text-muted)' : 'white'
                                                        }}
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
                                                        style={{
                                                            fontSize: '0.85rem',
                                                            color: group.objectives.length === 0 ? 'var(--text-muted)' : 'var(--primary)',
                                                            marginTop: '4px',
                                                            cursor: 'pointer',
                                                            opacity: group.objectives.length === 0 ? 0.4 : 1
                                                        }}
                                                    >
                                                        🎯 Fecha objetivo: {group.target_date ? new Date(group.target_date).toLocaleDateString() : 'Sin fecha'}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    onClick={() => { setEditingGroupAliasId(group.id); setEditingGroupAlias(group.alias); }}
                                                    style={{ background: 'none', border: 'none', color: 'rgba(139, 92, 246, 0.6)', cursor: 'pointer', padding: '4px' }}
                                                    title="Editar periodo"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteGroup(group)}
                                                    style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.4)', cursor: 'pointer', padding: '4px' }}
                                                    title="Borrar periodo"
                                                >
                                                    <Trash size={18} />
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
                                                        disabled={isCreatingObjective}
                                                        style={{
                                                            padding: '8px 16px',
                                                            background: isCreatingObjective ? 'var(--text-muted)' : 'var(--primary)',
                                                            border: 'none',
                                                            color: 'white',
                                                            cursor: isCreatingObjective ? 'not-allowed' : 'pointer',
                                                            fontSize: '0.9rem',
                                                            borderRadius: '4px',
                                                            fontWeight: 600,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        {isCreatingObjective && (
                                                            <span className="spinner" style={{
                                                                width: '14px',
                                                                height: '14px',
                                                                border: '2px solid rgba(255,255,255,0.3)',
                                                                borderTop: '2px solid white',
                                                                borderRadius: '50%',
                                                                animation: 'spin 1s linear infinite'
                                                            }}></span>
                                                        )}
                                                        {isCreatingObjective ? 'Creando...' : 'Crear'}
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
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <SortableContext
                                                items={group.objectives.map(o => o.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {group.objectives.map(obj => (
                                                    <SortableObjective
                                                        key={obj.id}
                                                        id={obj.id}
                                                        enabled={(editingGroupAliasId === group.id || editingGroupDateId === group.id) && group.objectives.length > 1}
                                                    >
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
                                                                            style={{ margin: 0, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500, wordWrap: 'break-word', overflowWrap: 'break-word', lineHeight: '1.4' }}
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
                                                                        onClick={() => { setEditingObjId(obj.id); setEditingObjDesc(obj.description); }}
                                                                        style={{ background: 'none', border: 'none', color: 'rgba(139, 92, 246, 0.6)', cursor: 'pointer', padding: '4px' }}
                                                                        title="Editar objetivo"
                                                                    >
                                                                        <Pencil size={14} />
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
                                                                <SortableContext
                                                                    items={obj.key_results?.map(kr => kr.id) || []}
                                                                    strategy={verticalListSortingStrategy}
                                                                >
                                                                    {obj.key_results?.map(kr => (
                                                                        <SortableKR
                                                                            key={kr.id}
                                                                            id={kr.id}
                                                                            enabled={editingObjId === obj.id && (obj.key_results?.length || 0) > 1}
                                                                        >
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
                                                                                        disabled={deletingKRId === kr.id}
                                                                                        style={{
                                                                                            background: 'none',
                                                                                            border: 'none',
                                                                                            color: deletingKRId === kr.id ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.4)',
                                                                                            cursor: deletingKRId === kr.id ? 'not-allowed' : 'pointer',
                                                                                            padding: '2px',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center'
                                                                                        }}
                                                                                    >
                                                                                        {deletingKRId === kr.id ? (
                                                                                            <span className="spinner" style={{
                                                                                                width: '12px',
                                                                                                height: '12px',
                                                                                                border: '2px solid rgba(239, 68, 68, 0.3)',
                                                                                                borderTop: '2px solid rgba(239, 68, 68, 0.8)',
                                                                                                borderRadius: '50%',
                                                                                                animation: 'spin 1s linear infinite'
                                                                                            }}></span>
                                                                                        ) : (
                                                                                            <Trash size={12} />
                                                                                        )}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </SortableKR>
                                                                    ))}
                                                                </SortableContext>

                                                                {obj.key_results?.length === 0 && !showAddKR && (
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                                                                        Sin resultados clave
                                                                    </div>
                                                                )}

                                                                {showAddKR === obj.id && (
                                                                    <div style={{ marginTop: '8px' }}>
                                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                                            <input
                                                                                autoFocus
                                                                                placeholder="Nuevo KR"
                                                                                value={newKR.description}
                                                                                onChange={e => { setNewKR({ ...newKR, description: e.target.value }); setKrError(null); }}
                                                                                onKeyDown={e => {
                                                                                    if (e.key === 'Enter' && !isCreatingKR) {
                                                                                        handleAddKR(obj.id);
                                                                                    }
                                                                                }}
                                                                                disabled={isCreatingKR}
                                                                                style={{ flex: 1, padding: '4px 8px', background: 'var(--bg-app)', border: krError ? '1px solid #ef4444' : '1px solid var(--border-color)', color: 'white', fontSize: '0.8rem', borderRadius: '4px' }}
                                                                            />
                                                                            <button
                                                                                onClick={() => handleAddKR(obj.id)}
                                                                                disabled={isCreatingKR}
                                                                                style={{
                                                                                    padding: '4px 12px',
                                                                                    background: isCreatingKR ? 'var(--text-muted)' : 'var(--primary)',
                                                                                    border: 'none',
                                                                                    color: 'white',
                                                                                    cursor: isCreatingKR ? 'not-allowed' : 'pointer',
                                                                                    fontSize: '0.8rem',
                                                                                    borderRadius: '4px',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '4px'
                                                                                }}
                                                                            >
                                                                                {isCreatingKR && (
                                                                                    <span className="spinner" style={{
                                                                                        width: '12px',
                                                                                        height: '12px',
                                                                                        border: '2px solid rgba(255,255,255,0.3)',
                                                                                        borderTop: '2px solid white',
                                                                                        borderRadius: '50%',
                                                                                        animation: 'spin 1s linear infinite'
                                                                                    }}></span>
                                                                                )}
                                                                                {isCreatingKR ? 'Creando...' : 'OK'}
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
                                                    </SortableObjective>
                                                ))}
                                            </SortableContext>
                                        </div>

                                        {group.objectives.length === 0 && !creatingObjectiveForGroup && (
                                            <div style={{
                                                padding: '8px 12px',
                                                textAlign: 'center',
                                                opacity: 0.4,
                                                background: 'rgba(0,0,0,0.15)',
                                                borderRadius: '4px',
                                                border: '1px dashed rgba(255,255,255,0.08)'
                                            }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                                    Sin objetivos
                                                </div>
                                                <button
                                                    onClick={() => setCreatingObjectiveForGroup(group.id)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: 'transparent',
                                                        border: `1px dashed ${selectedNode.color}40`,
                                                        color: `${selectedNode.color}80`,
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 500,
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = `${selectedNode.color}15`;
                                                        e.currentTarget.style.borderColor = `${selectedNode.color}60`;
                                                        e.currentTarget.style.color = selectedNode.color;
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'transparent';
                                                        e.currentTarget.style.borderColor = `${selectedNode.color}40`;
                                                        e.currentTarget.style.color = `${selectedNode.color}80`;
                                                    }}
                                                >
                                                    + Crear objetivo
                                                </button>
                                            </div>
                                        )}

                                        {/* Add objective button for populated periods */}
                                        {group.objectives.length > 0 && !creatingObjectiveForGroup && (
                                            <div style={{
                                                padding: '8px 12px',
                                                textAlign: 'center',
                                                marginTop: 'var(--space-sm)'
                                            }}>
                                                <button
                                                    onClick={() => setCreatingObjectiveForGroup(group.id)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: 'transparent',
                                                        border: `1px dashed ${selectedNode.color}40`,
                                                        color: `${selectedNode.color}80`,
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 500,
                                                        transition: 'all 0.2s ease',
                                                        width: '100%'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = `${selectedNode.color}15`;
                                                        e.currentTarget.style.borderColor = `${selectedNode.color}60`;
                                                        e.currentTarget.style.color = selectedNode.color;
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'transparent';
                                                        e.currentTarget.style.borderColor = `${selectedNode.color}40`;
                                                        e.currentTarget.style.color = `${selectedNode.color}80`;
                                                    }}
                                                >
                                                    + Crear objetivo
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </DndContext>

                            {/* Create Group Button/Form */}
                            {creatingGroup ? (
                                <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
                                    <h3>Nuevo Periodo de Objetivos</h3>
                                    <input
                                        placeholder="Alias del periodo (ej: Q1 2025, Semestre 1)"
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
                                            onClick={() => { setCreatingGroup(false); setNewGroup({ alias: '', target_date: '' }); }}
                                            style={{ flex: 1, padding: '10px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            Cancelar
                                        </button>
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
                                            ) : 'Crear Periodo'}
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
                                    Nuevo Periodo de Objetivos
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
                            ¿Estás seguro de que quieres <strong>ELIMINAR</strong> el periodo "<strong>{confirmDeleteGroup.alias}</strong>"?
                        </p>
                        <p style={{ marginBottom: 'var(--space-md)', color: '#f87171', fontSize: '0.9rem' }}>
                            Esta acción es <strong>PERMANENTE</strong> y eliminará el periodo, <strong>todos sus objetivos</strong>, <strong>todos los resultados clave</strong> y <strong>todas las tareas asociadas</strong>.
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
                                ELIMINAR PERIODO
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
                        <h3 style={{ margin: '0 0 var(--space-sm) 0', color: '#3b82f6' }}>Replicar Periodo</h3>
                        <p className="text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                            ¿Quieres replicar el periodo "<strong>{confirmReplicateGroup.alias}</strong>" a todos los demás nodos?
                        </p>
                        <p style={{ marginBottom: 'var(--space-md)', color: '#60a5fa', fontSize: '0.9rem' }}>
                            Se creará un periodo <strong>vacío</strong> con el mismo <strong>alias</strong> y <strong>fecha objetivo</strong> en todos los nodos. Los objetivos y resultados clave <strong>NO</strong> se copiarán.
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
                                REPLICAR PERIODO
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
                                disabled={deletingObjectiveId !== null}
                                style={{
                                    padding: '10px 24px',
                                    background: deletingObjectiveId ? 'var(--text-muted)' : '#ef4444',
                                    border: 'none',
                                    color: 'white',
                                    cursor: deletingObjectiveId ? 'not-allowed' : 'pointer',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {deletingObjectiveId && (
                                    <span className="spinner" style={{
                                        width: '16px',
                                        height: '16px',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTop: '2px solid white',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }}></span>
                                )}
                                {deletingObjectiveId ? 'ELIMINANDO...' : 'ELIMINAR OBJETIVO'}
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
                            ¿Estás seguro de que quieres <strong>ELIMINAR TODOS</strong> los periodos de objetivos del nodo "<strong>{selectedNode.name}</strong>"?
                        </p>
                        <p style={{ marginBottom: 'var(--space-md)', color: '#f87171', fontSize: '1rem', fontWeight: 600 }}>
                            Esta acción es <strong>IRREVERSIBLE</strong> y eliminará:
                        </p>
                        <ul style={{ textAlign: 'left', marginBottom: 'var(--space-md)', color: '#f87171', paddingLeft: '40px' }}>
                            <li><strong>Todos los periodos de objetivos</strong> ({objectiveGroups.length} periodos)</li>
                            <li><strong>Todos los objetivos</strong> dentro de esos periodos</li>
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
                            ¿Quieres copiar los <strong>{objectiveGroups.length}</strong> periodos de objetivos del nodo "<strong>{selectedNode.name}</strong>" a todos los demás nodos?
                        </p>
                        <p style={{ marginBottom: 'var(--space-md)', color: '#60a5fa', fontSize: '1rem', fontWeight: 600 }}>
                            Se crearán periodos <strong>vacíos</strong> con los mismos <strong>alias</strong> y <strong>fechas objetivo</strong> en todos los nodos. Los objetivos y resultados clave <strong>NO</strong> se copiarán.
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

            {/* Success Modal for Replicate All Groups */}
            {successReplicateAllGroups && selectedNode && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001
                }}>
                    <div className="glass-panel" style={{ padding: 'var(--space-lg)', width: '500px', textAlign: 'center' }}>
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <Check size={56} color="#10b981" />
                        </div>
                        <h3 style={{ margin: '0 0 var(--space-sm) 0', color: '#10b981', fontSize: '1.5rem' }}>✓ REPLICACIÓN EXITOSA</h3>
                        <p className="text-muted" style={{ marginBottom: 'var(--space-md)', fontSize: '1.1rem' }}>
                            Se replicaron <strong>{successReplicateAllGroups.periodsCount}</strong> periodo(s) a todos los demás nodos exitosamente
                        </p>
                        <p style={{ marginBottom: 'var(--space-md)', color: '#34d399', fontSize: '1rem', fontWeight: 600 }}>
                            <strong>{successReplicateAllGroups.totalCreated}</strong> periodos creados en total
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => {
                                    setSuccessReplicateAllGroups(null);
                                    loadObjectiveGroups();
                                }}
                                style={{
                                    padding: '12px 28px',
                                    background: '#10b981',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 'bold',
                                    fontSize: '1rem'
                                }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Planning;
