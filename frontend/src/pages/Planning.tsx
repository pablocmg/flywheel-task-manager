import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Target, TrendingUp, Trash, Pencil } from 'lucide-react';

interface KeyResult {
    id: string;
    description: string;
    target_value: number;
    current_value: number;
}

interface Objective {
    id: string;
    description: string;
    type: 'annual' | 'quarterly';
    quarter: string | null;
    year: number;
    key_results: KeyResult[];
    tasks?: Task[];
}

interface Task {
    id: string;
    title: string;
    description: string;
    status: string;
    weight: number;
    week_number: number;
    project_id?: string;
}




interface Node {
    id: string;
    name: string;
    color: string;
    objectives?: Objective[];
}

const Planning: React.FC = () => {
    const [nodes, setNodes] = useState<Node[]>([]);
    // const [allProjects, setAllProjects] = useState<Project[]>([]); // removing unused
    const [loading, setLoading] = useState(true);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // KR Management
    const [showAddKR, setShowAddKR] = useState<string | null>(null); // objective ID
    const [newKR, setNewKR] = useState({ description: '', target_value: 100 });
    const [krError, setKrError] = useState<string | null>(null);
    const [editingKrId, setEditingKrId] = useState<string | null>(null);
    const [editingKrDesc, setEditingKrDesc] = useState('');

    // Objective editing
    const [editingObjId, setEditingObjId] = useState<string | null>(null);
    const [editingObjDesc, setEditingObjDesc] = useState('');



    // Task Creation
    // Task Creation - Unused vars removed


    // Unused getCurrentWeek removed

    useEffect(() => {
        loadData();
    }, []);

    // Unused useEffect removed

    const loadData = async () => {
        setLoading(true);
        try {
            const [nodesData] = await Promise.all([
                api.getNodes(),
                // api.getProjects()
            ]);
            // setAllProjects(projectsData);

            // Load objectives and tasks for each node
            const nodesWithObjs = await Promise.all(nodesData.map(async (n: Node) => {
                const objs = await api.getObjectives(n.id);
                const objsWithTasks = await Promise.all(objs.map(async (o: Objective) => {
                    const tasks = await api.getTasksByObjective(o.id);
                    return { ...o, tasks };
                }));
                return { ...n, objectives: objsWithTasks };
            }));

            setNodes(nodesWithObjs.filter((n: any) => n.is_active !== false)); // Filter active nodes
            if (nodesWithObjs.length > 0 && !selectedNodeId) {
                setSelectedNodeId(nodesWithObjs[0].id);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    /* Unused functions removed: reloadObjective */

    // Unused loadProjectsForObjective removed

    const handleUpdateObjective = async (objId: string, newDesc: string) => {
        if (!selectedNodeId) return;
        try {
            const obj = nodes.find(n => n.id === selectedNodeId)?.objectives?.find(o => o.id === objId);
            if (!obj) return;
            await api.updateObjective(objId, { ...obj, description: newDesc });
            setEditingObjId(null);
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddKR = async (objId: string) => {
        console.log('[handleAddKR] CALLED with objId:', objId);
        console.log('[handleAddKR] newKR:', newKR);

        if (!newKR.description.trim()) {
            console.log('[handleAddKR] ABORT: description is empty');
            return;
        }

        // Frontend validation: check for duplicates
        const currentObj = nodes.find(n => n.id === selectedNodeId)?.objectives?.find(o => o.id === objId);
        const isDuplicate = currentObj?.key_results?.some(
            kr => kr.description.trim().toLowerCase() === newKR.description.trim().toLowerCase()
        );

        if (isDuplicate) {
            console.log('[handleAddKR] ABORT: duplicate KR detected');
            setKrError('Ya existe un KR con ese nombre');
            return;
        }

        setKrError(null);

        try {
            console.log('[handleAddKR] Calling API...');
            const newKRData = await api.createKeyResult({ ...newKR, objective_id: objId });
            console.log('[handleAddKR] API response:', newKRData);

            // Optimistic UI update - add KR immediately to state
            setNodes(prevNodes => prevNodes.map(n => {
                if (n.id !== selectedNodeId) return n;
                return {
                    ...n,
                    objectives: n.objectives?.map(o => {
                        if (o.id !== objId) return o;
                        return {
                            ...o,
                            key_results: [...(o.key_results || []), newKRData]
                        };
                    })
                };
            }));
            console.log('[handleAddKR] State updated, closing form');
            setShowAddKR(null);
            setNewKR({ description: '', target_value: 100 });
            console.log('[handleAddKR] SUCCESS');
        } catch (err: any) {
            console.error('[handleAddKR] ERROR:', err);
            alert(err.message || 'Error al crear el resultado clave');
        }
    };

    const handleDeleteKR = async (krId: string, objId: string, e: React.MouseEvent) => {
        console.log('[handleDeleteKR] CALLED with krId:', krId, 'objId:', objId);
        e.stopPropagation();
        e.preventDefault();

        // Skip confirm for now - delete directly
        console.log('[handleDeleteKR] Proceeding with delete (no confirm)...');

        console.log('[handleDeleteKR] Updating UI optimistically...');
        // Optimistic UI update - remove KR immediately from state
        setNodes(prevNodes => prevNodes.map(n => {
            if (n.id !== selectedNodeId) return n;
            return {
                ...n,
                objectives: n.objectives?.map(o => {
                    if (o.id !== objId) return o;
                    return {
                        ...o,
                        key_results: o.key_results?.filter(kr => kr.id !== krId)
                    };
                })
            };
        }));

        try {
            console.log('[handleDeleteKR] Calling API...');
            await api.deleteKeyResult(krId);
            console.log('[handleDeleteKR] SUCCESS');
        } catch (err) {
            console.error('[handleDeleteKR] ERROR:', err);
            alert('Error al eliminar el resultado clave');
            loadData(); // Reload to restore state on error
        }
    };

    /* Unused functions removed: handleCreateTask */

    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    const annualObj = selectedNode?.objectives?.find(o => o.type === 'annual');
    const quarterlyObjs = selectedNode?.objectives?.filter(o => o.type === 'quarterly').sort((a, b) => (a.quarter || '').localeCompare(b.quarter || ''));

    const renderObjectiveCard = (obj: Objective, title: string, color: string) => {
        // Removed progress calculation - not needed

        return (
            <div key={obj.id} className="glass-panel" style={{ padding: 'var(--space-md)', borderLeft: `4px solid ${color}` }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', color: color, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                            {title}
                        </div>
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
                            <h3
                                onClick={() => { setEditingObjId(obj.id); setEditingObjDesc(obj.description); }}
                                style={{ margin: 0, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500 }}
                            >
                                {obj.description}
                            </h3>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={() => setShowAddKR(showAddKR === obj.id ? null : obj.id)}
                            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}
                        >
                            <Plus size={14} style={{ marginRight: '2px' }} /> KR
                        </button>
                    </div>
                </div>

                {/* Key Results */}
                <div style={{ paddingLeft: '8px', borderLeft: '2px solid rgba(255,255,255,0.1)', marginBottom: 'var(--space-sm)' }}>
                    {obj.key_results?.map(kr => (
                        <div key={kr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: '0.85rem' }}>
                            {editingKrId === kr.id ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                    <TrendingUp size={12} color={color} />
                                    <input
                                        autoFocus
                                        value={editingKrDesc}
                                        onChange={e => setEditingKrDesc(e.target.value)}
                                        onBlur={async () => {
                                            if (editingKrDesc.trim() && editingKrDesc !== kr.description) {
                                                try {
                                                    await api.updateKeyResult(kr.id, { ...kr, description: editingKrDesc });
                                                    setNodes(prev => prev.map(n => ({
                                                        ...n,
                                                        objectives: n.objectives?.map(o => ({
                                                            ...o,
                                                            key_results: o.key_results?.map(k => k.id === kr.id ? { ...k, description: editingKrDesc } : k)
                                                        }))
                                                    })));
                                                } catch (err) { console.error(err); }
                                            }
                                            setEditingKrId(null);
                                        }}
                                        onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                        style={{ flex: 1, padding: '2px 6px', background: 'var(--bg-app)', border: '1px solid var(--primary)', color: 'white', fontSize: '0.85rem', borderRadius: '4px' }}
                                    />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                    <TrendingUp size={12} color={color} />
                                    <span>{kr.description}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                    onClick={() => { setEditingKrId(kr.id); setEditingKrDesc(kr.description); }}
                                    style={{ background: 'none', border: 'none', color: 'rgba(139, 92, 246, 0.4)', cursor: 'pointer', padding: '2px' }}
                                    onMouseOver={e => e.currentTarget.style.color = '#8b5cf6'}
                                    onMouseOut={e => e.currentTarget.style.color = 'rgba(139, 92, 246, 0.4)'}
                                >
                                    <Pencil size={12} />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteKR(kr.id, obj.id, e)}
                                    style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.4)', cursor: 'pointer', padding: '2px' }}
                                    onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                                    onMouseOut={e => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.4)'}
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
        );
    };

    return (
        <div style={{ padding: 'var(--space-lg)', paddingBottom: '100px' }}>
            <div style={{ marginBottom: 'var(--space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Planificación Estratégica</h1>
                    <p className="text-muted">Gestiona objetivos, resultados clave y proyectos por nodo.</p>
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
                        </div>
                    )}

                    {selectedNode && (
                        <div>
                            {/* Annual Objective */}
                            {annualObj && (
                                <div style={{ marginBottom: 'var(--space-xl)' }}>
                                    <h2 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Target size={24} color={selectedNode.color} />
                                        Objetivo Anual {annualObj.year}
                                    </h2>
                                    {renderObjectiveCard(annualObj, `Anual ${annualObj.year}`, selectedNode.color)}
                                </div>
                            )}

                            {/* Quarterly Objectives */}
                            {quarterlyObjs && quarterlyObjs.length > 0 && (
                                <div>
                                    <h2 style={{ marginBottom: 'var(--space-md)' }}>Objetivos Trimestrales</h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--space-md)' }}>
                                        {quarterlyObjs.map(q => renderObjectiveCard(q, q.quarter || 'Quarter', selectedNode.color))}
                                    </div>
                                </div>
                            )}

                            {!annualObj && (!quarterlyObjs || quarterlyObjs.length === 0) && (
                                <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                                    <p>Este nodo aún no tiene objetivos configurados.</p>
                                    <p style={{ fontSize: '0.9rem' }}>Ve a "Config Nodos" para definir tus OKRs.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}


        </div>
    );
};

export default Planning;
