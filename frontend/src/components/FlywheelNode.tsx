import React from 'react';
import { Pencil, Eye, EyeOff, Star, DollarSign } from 'lucide-react';

interface NodeProps {
    node: {
        id: string;
        name: string;
        description: string;
        color: string;
        is_central?: boolean;
        is_active?: boolean;
        generates_revenue?: boolean;
    };
    onUpdate: () => void;
    onToggleActive: () => void;
}

export const FlywheelNode: React.FC<NodeProps> = ({ node, onUpdate, onToggleActive }) => {
    const isCentral = node.is_central;
    const isActive = node.is_active !== false;
    const generatesRevenue = node.generates_revenue;

    return (
        <div
            className="glass-panel"
            style={{
                marginBottom: 'var(--space-md)',
                borderLeft: `4px solid ${node.color || 'var(--primary)'}`,
                border: isCentral && isActive
                    ? '2px solid #fbbf24'
                    : generatesRevenue && isActive
                        ? '2px solid rgba(16, 185, 129, 0.5)'
                        : '1px solid rgba(255,255,255,0.1)',
                boxShadow: isCentral && isActive
                    ? '0 0 25px rgba(251, 191, 36, 0.3), inset 0 0 30px rgba(251, 191, 36, 0.05)'
                    : generatesRevenue && isActive
                        ? '0 0 20px rgba(16, 185, 129, 0.2), inset 0 0 20px rgba(16, 185, 129, 0.03)'
                        : undefined,
                background: isCentral && isActive
                    ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, transparent 50%)'
                    : generatesRevenue && isActive
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, transparent 50%)'
                        : undefined,
                opacity: isActive ? 1 : 0.5,
                filter: isActive ? 'none' : 'grayscale(100%)',
                transition: 'all 0.3s ease',
                borderRadius: 'var(--radius-lg)'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {isCentral && isActive && <Star size={18} fill="#fbbf24" color="#fbbf24" />}
                        {generatesRevenue && isActive && !isCentral && (
                            <div style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 0 12px rgba(16, 185, 129, 0.5)'
                            }}>
                                <DollarSign size={14} color="white" strokeWidth={3} />
                            </div>
                        )}
                        <h3 style={{ margin: 0, fontSize: isCentral ? '1.1rem' : '1rem' }}>{node.name}</h3>
                        {isCentral && isActive && (
                            <span style={{
                                fontSize: '0.65rem',
                                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                color: 'black',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                MOTOR CENTRAL
                            </span>
                        )}
                        {generatesRevenue && isActive && !isCentral && (
                            <span style={{
                                fontSize: '0.65rem',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: 'white',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                boxShadow: '0 0 8px rgba(16, 185, 129, 0.3)'
                            }}>
                                💰 GENERA INGRESOS
                            </span>
                        )}
                        {!isActive && (
                            <span style={{
                                fontSize: '0.65rem',
                                background: 'rgba(71, 85, 105, 0.5)',
                                color: '#94a3b8',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase'
                            }}>
                                INACTIVO
                            </span>
                        )}
                    </div>
                    <small className="text-muted" style={{ marginTop: '4px', display: 'block' }}>{node.description}</small>
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        💡 Gestiona los OKRs de este nodo desde la página de <strong>Planificación</strong>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="btn-icon"
                        onClick={(e) => { e.stopPropagation(); onUpdate(); }}
                        title="Editar Nodo"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            padding: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Pencil size={16} />
                    </button>
                    <button
                        className="btn-icon"
                        onClick={(e) => { e.stopPropagation(); onToggleActive(); }}
                        title={isActive ? 'Desactivar Nodo' : 'Activar Nodo'}
                        style={{
                            background: isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(100, 116, 139, 0.2)',
                            border: `1px solid ${isActive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
                            color: isActive ? '#22c55e' : '#64748b',
                            borderRadius: '8px',
                            padding: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
};
