import React, { useState, useRef } from 'react';
import { AlertTriangle, Upload, Link2 } from 'lucide-react';
import { api } from '../services/api';

interface EvidenceRequiredModalProps {
    isOpen: boolean;
    taskId: string;
    taskTitle: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const EvidenceRequiredModal: React.FC<EvidenceRequiredModalProps> = ({
    isOpen,
    taskId,
    taskTitle,
    onClose,
    onSuccess
}) => {
    const [mode, setMode] = useState<'link' | 'file'>('link');
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const getTypeFromUrl = (url: string) => {
        const lowerUrl = url.toLowerCase();
        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(lowerUrl)) return 'image';
        if (/\.(mp4|webm|mov)$/i.test(lowerUrl) || lowerUrl.includes('youtube')) return 'video';
        return 'link';
    };

    const handleAddLink = async () => {
        if (!linkUrl.trim()) {
            setError('Por favor ingresa una URL');
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            await api.addDeliverable(taskId, {
                type: getTypeFromUrl(linkUrl),
                url: linkUrl,
                title: linkTitle || linkUrl
            });
            onSuccess();
        } catch (err) {
            setError('Error al agregar el link');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError('');
        try {
            const result = await api.uploadFile(taskId, file);
            const type = file.type.startsWith('image/') ? 'image' :
                file.type.startsWith('video/') ? 'video' : 'file';
            await api.addDeliverable(taskId, {
                type,
                url: result.url,
                title: file.name
            });
            onSuccess();
        } catch (err) {
            setError('Error al subir el archivo');
            console.error(err);
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'var(--bg-panel)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-xl)',
                maxWidth: '450px',
                width: '90%',
                border: '1px solid var(--glass-border)'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-lg)',
                    color: '#f59e0b'
                }}>
                    <AlertTriangle size={24} />
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                        ¡Espera! Falta el entregable
                    </h3>
                </div>

                {/* Message */}
                <p style={{
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--space-lg)',
                    fontSize: '0.9rem',
                    lineHeight: 1.5
                }}>
                    Para cerrar la tarea <strong style={{ color: 'var(--text-primary)' }}>"{taskTitle}"</strong>,
                    necesitamos la evidencia del trabajo. Sube el archivo final o pega el link del resultado.
                </p>

                {/* Mode Toggle */}
                <div style={{
                    display: 'flex',
                    gap: 'var(--space-xs)',
                    marginBottom: 'var(--space-md)'
                }}>
                    <button
                        onClick={() => setMode('link')}
                        style={{
                            flex: 1,
                            padding: 'var(--space-sm)',
                            background: mode === 'link' ? 'var(--primary)' : 'var(--glass-bg)',
                            color: mode === 'link' ? 'var(--bg-app)' : 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'var(--space-xs)'
                        }}
                    >
                        <Link2 size={16} />
                        Link
                    </button>
                    <button
                        onClick={() => setMode('file')}
                        style={{
                            flex: 1,
                            padding: 'var(--space-sm)',
                            background: mode === 'file' ? 'var(--primary)' : 'var(--glass-bg)',
                            color: mode === 'file' ? 'var(--bg-app)' : 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'var(--space-xs)'
                        }}
                    >
                        <Upload size={16} />
                        Archivo
                    </button>
                </div>

                {/* Input */}
                {mode === 'link' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        <input
                            type="url"
                            placeholder="https://..."
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            autoFocus
                            style={{
                                padding: 'var(--space-sm)',
                                background: 'var(--glass-bg)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem'
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Título (opcional)"
                            value={linkTitle}
                            onChange={(e) => setLinkTitle(e.target.value)}
                            style={{
                                padding: 'var(--space-sm)',
                                background: 'var(--glass-bg)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>
                ) : (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: '2px dashed var(--glass-border)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-xl)',
                            textAlign: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-muted)'
                        }}
                    >
                        <Upload size={32} style={{ marginBottom: 'var(--space-xs)' }} />
                        <p style={{ margin: 0 }}>Haz clic para seleccionar un archivo</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <p style={{
                        color: '#ef4444',
                        fontSize: '0.8rem',
                        marginTop: 'var(--space-sm)'
                    }}>{error}</p>
                )}

                {/* Actions */}
                <div style={{
                    display: 'flex',
                    gap: 'var(--space-sm)',
                    marginTop: 'var(--space-lg)'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: 'var(--space-sm) var(--space-md)',
                            background: 'transparent',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={mode === 'link' ? handleAddLink : () => fileInputRef.current?.click()}
                        disabled={isLoading || (mode === 'link' && !linkUrl.trim())}
                        style={{
                            flex: 1,
                            padding: 'var(--space-sm) var(--space-md)',
                            background: 'var(--primary)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--bg-app)',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            opacity: isLoading || (mode === 'link' && !linkUrl.trim()) ? 0.5 : 1
                        }}
                    >
                        {isLoading ? 'Guardando...' : 'Guardar y Terminar'}
                    </button>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
            </div>
        </div>
    );
};
