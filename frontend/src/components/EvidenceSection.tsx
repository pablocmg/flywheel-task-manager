import React, { useState, useRef, useCallback } from 'react';
import { Upload, Link2, Image, FileText, X, ExternalLink, Film } from 'lucide-react';
import { api } from '../services/api';

interface Deliverable {
    type: 'image' | 'link' | 'file' | 'video';
    url: string;
    title?: string;
    thumbnail?: string;
    added_by?: string;
    promoted_from_comment_id?: string;
    added_at?: string;
}

interface EvidenceSectionProps {
    taskId: string;
    deliverables: Deliverable[];
    onUpdate: () => void;
    readOnly?: boolean;
}

export const EvidenceSection: React.FC<EvidenceSectionProps> = ({
    taskId,
    deliverables,
    onUpdate,
    readOnly = false
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Determine type from URL
    const getTypeFromUrl = (url: string): Deliverable['type'] => {
        const lowerUrl = url.toLowerCase();
        if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(lowerUrl)) return 'image';
        if (/\.(mp4|webm|mov|avi)$/i.test(lowerUrl) || lowerUrl.includes('youtube') || lowerUrl.includes('vimeo')) return 'video';
        if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar)$/i.test(lowerUrl)) return 'file';
        return 'link';
    };

    // Handle file drop
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (readOnly) return;

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        setIsLoading(true);
        try {
            for (const file of files) {
                const result = await api.uploadFile(taskId, file);
                const type = file.type.startsWith('image/') ? 'image' :
                    file.type.startsWith('video/') ? 'video' : 'file';
                await api.addDeliverable(taskId, {
                    type,
                    url: result.url,
                    title: file.name
                });
            }
            onUpdate();
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsLoading(false);
        }
    }, [taskId, onUpdate, readOnly]);

    // Handle file input
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsLoading(true);
        try {
            for (const file of Array.from(files)) {
                const result = await api.uploadFile(taskId, file);
                const type = file.type.startsWith('image/') ? 'image' :
                    file.type.startsWith('video/') ? 'video' : 'file';
                await api.addDeliverable(taskId, {
                    type,
                    url: result.url,
                    title: file.name
                });
            }
            onUpdate();
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Handle link add
    const handleAddLink = async () => {
        if (!linkUrl.trim()) return;

        setIsLoading(true);
        try {
            await api.addDeliverable(taskId, {
                type: getTypeFromUrl(linkUrl),
                url: linkUrl,
                title: linkTitle || linkUrl
            });
            setLinkUrl('');
            setLinkTitle('');
            setShowLinkInput(false);
            onUpdate();
        } catch (error) {
            console.error('Add link failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle remove deliverable
    const handleRemove = async (index: number) => {
        if (readOnly) return;
        try {
            await api.removeDeliverable(taskId, index);
            onUpdate();
        } catch (error) {
            console.error('Remove failed:', error);
        }
    };

    // Get icon for file type
    const getFileIcon = (type: string) => {
        switch (type) {
            case 'image': return <Image size={32} />;
            case 'video': return <Film size={32} />;
            case 'link': return <ExternalLink size={32} />;
            default: return <FileText size={32} />;
        }
    };

    return (
        <div style={{
            marginBottom: 'var(--space-lg)',
            padding: 'var(--space-md)',
            background: 'rgba(0, 200, 150, 0.05)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(0, 200, 150, 0.2)'
        }}>
            <h4 style={{
                margin: '0 0 var(--space-sm) 0',
                color: 'var(--primary)',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)'
            }}>
                <Upload size={16} />
                Entregables Finales
                {deliverables.length > 0 && (
                    <span style={{
                        background: 'var(--primary)',
                        color: 'var(--bg-app)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                    }}>{deliverables.length}</span>
                )}
            </h4>

            {/* Deliverables Grid */}
            {deliverables.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-md)'
                }}>
                    {deliverables.map((item, index) => (
                        <div key={index} style={{
                            position: 'relative',
                            background: 'var(--glass-bg)',
                            borderRadius: 'var(--radius-sm)',
                            overflow: 'hidden',
                            border: '1px solid var(--glass-border)'
                        }}>
                            {/* Preview */}
                            {item.type === 'image' ? (
                                <img
                                    src={item.url}
                                    alt={item.title || 'Evidence'}
                                    style={{
                                        width: '100%',
                                        height: '100px',
                                        objectFit: 'cover'
                                    }}
                                />
                            ) : (
                                <div style={{
                                    height: '100px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-muted)',
                                    background: 'rgba(255,255,255,0.02)'
                                }}>
                                    {getFileIcon(item.type)}
                                </div>
                            )}

                            {/* Title */}
                            <div style={{
                                padding: 'var(--space-xs)',
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'inherit', textDecoration: 'none' }}
                                >
                                    {item.title || item.url}
                                </a>
                            </div>

                            {/* Remove button */}
                            {!readOnly && (
                                <button
                                    onClick={() => handleRemove(index)}
                                    style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '4px',
                                        background: 'rgba(0,0,0,0.6)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '20px',
                                        height: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: 'white'
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Dropzone (when empty or for adding more) */}
            {!readOnly && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    style={{
                        border: `2px dashed ${isDragging ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-lg)',
                        textAlign: 'center',
                        background: isDragging ? 'rgba(0, 200, 150, 0.1)' : 'transparent',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                    }}
                    onClick={() => !showLinkInput && fileInputRef.current?.click()}
                >
                    {isLoading ? (
                        <p style={{ margin: 0, color: 'var(--primary)' }}>Subiendo...</p>
                    ) : deliverables.length === 0 ? (
                        <>
                            <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }} />
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                No hay entregables aún. Arrastra archivos aquí o haz clic para subir.
                            </p>
                        </>
                    ) : (
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            Arrastra más archivos o haz clic para agregar
                        </p>
                    )}
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            {/* Add link button and input */}
            {!readOnly && (
                <div style={{ marginTop: 'var(--space-sm)' }}>
                    {showLinkInput ? (
                        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                            <input
                                type="url"
                                placeholder="URL del link..."
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                style={{
                                    flex: 1,
                                    minWidth: '200px',
                                    padding: 'var(--space-xs) var(--space-sm)',
                                    background: 'var(--glass-bg)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--text-primary)'
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Título (opcional)"
                                value={linkTitle}
                                onChange={(e) => setLinkTitle(e.target.value)}
                                style={{
                                    width: '150px',
                                    padding: 'var(--space-xs) var(--space-sm)',
                                    background: 'var(--glass-bg)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--text-primary)'
                                }}
                            />
                            <button
                                onClick={handleAddLink}
                                disabled={!linkUrl.trim()}
                                style={{
                                    padding: 'var(--space-xs) var(--space-sm)',
                                    background: 'var(--primary)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--bg-app)',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Agregar
                            </button>
                            <button
                                onClick={() => { setShowLinkInput(false); setLinkUrl(''); setLinkTitle(''); }}
                                style={{
                                    padding: 'var(--space-xs) var(--space-sm)',
                                    background: 'transparent',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowLinkInput(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-xs)',
                                padding: 'var(--space-xs) var(--space-sm)',
                                background: 'transparent',
                                border: '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '0.8rem'
                            }}
                        >
                            <Link2 size={14} />
                            Agregar link
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
