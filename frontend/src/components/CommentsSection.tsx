import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, MoreVertical, Award, Trash2 } from 'lucide-react';
import { api } from '../services/api';

interface Attachment {
    url: string;
    type: string;
    name: string;
    size?: number;
}

interface Comment {
    id: string;
    task_id: string;
    user_name: string;
    content: string;
    attachments: Attachment[];
    created_at: string;
}

interface CommentsSectionProps {
    taskId: string;
    onPromoteToEvidence: (commentId: string, attachmentIndex: number) => void;
    deliverables?: any[];
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
    taskId,
    onPromoteToEvidence,
    deliverables = []
}) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const commentsEndRef = useRef<HTMLDivElement>(null);

    // Load comments
    useEffect(() => {
        loadComments();
    }, [taskId]);

    const loadComments = async () => {
        try {
            const data = await api.getTaskComments(taskId);
            setComments(data);
        } catch (error) {
            console.error('Failed to load comments:', error);
        }
    };

    // Auto-scroll to bottom when new comments arrive
    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    // Handle paste for images
    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    await uploadFile(file);
                }
            }
        }
    };

    // Upload file
    const uploadFile = async (file: File) => {
        setIsLoading(true);
        try {
            const result = await api.uploadFile(taskId, file);
            setAttachments(prev => [...prev, {
                url: result.url,
                type: result.type,
                name: result.name,
                size: result.size
            }]);
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle file select
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            await uploadFile(file);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Remove attachment before sending
    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    // Submit comment
    const handleSubmit = async () => {
        if (!newComment.trim() && attachments.length === 0) return;

        setIsLoading(true);
        try {
            await api.createComment(taskId, {
                content: newComment,
                user_name: 'Usuario', // TODO: Get from auth context
                attachments
            });
            setNewComment('');
            setAttachments([]);
            await loadComments();
        } catch (error) {
            console.error('Failed to create comment:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Delete comment
    const handleDelete = async (commentId: string) => {
        try {
            await api.deleteComment(commentId);
            await loadComments();
        } catch (error) {
            console.error('Failed to delete comment:', error);
        }
        setActiveMenu(null);
    };

    // Promote attachment to evidence
    const handlePromote = (commentId: string, attachmentIndex: number) => {
        onPromoteToEvidence(commentId, attachmentIndex);
        setActiveMenu(null);
    };

    // Simple Markdown-like renderer
    const renderContent = (content: string) => {
        if (!content) return null;

        // Escape HTML
        let html = content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Bold: **text**
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Code blocks: ```text```
        html = html.replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; font-family: monospace; font-size: 0.8rem; overflow-x: auto; margin: 5px 0;">$1</pre>');

        // Inline code: `text`
        html = html.replace(/`(.*?)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>');

        // Links: https://...
        html = html.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: underline;">$1</a>');

        // Line breaks
        html = html.replace(/\n/g, '<br />');

        return <div dangerouslySetInnerHTML={{ __html: html }} />;
    };

    // Format date
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            borderTop: '1px solid var(--glass-border)',
            marginTop: 'var(--space-lg)'
        }}>
            <h4 style={{
                margin: '0',
                padding: 'var(--space-md)',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                borderBottom: '1px solid var(--glass-border)'
            }}>
                Actividad y Comentarios ({comments.length})
            </h4>

            {/* Comments List */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: 'var(--space-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-md)',
                maxHeight: '300px'
            }}>
                {comments.length === 0 ? (
                    <p style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                        textAlign: 'center',
                        padding: 'var(--space-lg)'
                    }}>
                        Sin actividad aún. Agrega un comentario o adjunta archivos.
                    </p>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} style={{
                            background: 'var(--glass-bg)',
                            borderRadius: 'var(--radius-sm)',
                            padding: 'var(--space-sm)',
                            position: 'relative'
                        }}>
                            {/* Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 'var(--space-xs)'
                            }}>
                                <span style={{
                                    fontWeight: 'bold',
                                    fontSize: '0.8rem',
                                    color: 'var(--primary)'
                                }}>
                                    {comment.user_name}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    {deliverables.some(d => d.promoted_from_comment_id === comment.id) && (
                                        <span style={{
                                            fontSize: '0.65rem',
                                            background: 'rgba(52, 211, 153, 0.2)',
                                            color: '#34d399',
                                            padding: '1px 6px',
                                            borderRadius: '10px',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px'
                                        }}>
                                            <Award size={10} />
                                            Evidencia
                                        </span>
                                    )}
                                    <span style={{
                                        fontSize: '0.7rem',
                                        color: 'var(--text-muted)'
                                    }}>
                                        {formatDate(comment.created_at)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setActiveMenu(activeMenu === comment.id ? null : comment.id)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer',
                                            padding: '2px'
                                        }}
                                    >
                                        <MoreVertical size={14} />
                                    </button>

                                    {/* Context Menu */}
                                    {activeMenu === comment.id && (
                                        <div style={{
                                            position: 'absolute',
                                            right: 'var(--space-sm)',
                                            top: '30px',
                                            background: 'var(--bg-panel)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: 'var(--radius-sm)',
                                            zIndex: 10,
                                            minWidth: '150px'
                                        }}>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(comment.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-xs)',
                                                    width: '100%',
                                                    padding: 'var(--space-sm)',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    textAlign: 'left'
                                                }}
                                            >
                                                <Trash2 size={14} />
                                                Eliminar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            {comment.content && (
                                <div style={{
                                    margin: '0 0 var(--space-xs) 0',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-primary)',
                                    lineHeight: '1.5'
                                }}>
                                    {renderContent(comment.content)}
                                </div>
                            )}

                            {/* Attachments */}
                            {comment.attachments && comment.attachments.length > 0 && (
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 'var(--space-xs)',
                                    marginTop: 'var(--space-xs)'
                                }}>
                                    {comment.attachments.map((att, idx) => (
                                        <div key={idx} style={{
                                            position: 'relative',
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: 'var(--radius-sm)',
                                            overflow: 'hidden'
                                        }}>
                                            {att.type?.startsWith('image/') ? (
                                                <img
                                                    src={att.url}
                                                    alt={att.name}
                                                    style={{
                                                        width: '80px',
                                                        height: '60px',
                                                        objectFit: 'cover'
                                                    }}
                                                />
                                            ) : (
                                                <div style={{
                                                    padding: 'var(--space-xs)',
                                                    fontSize: '0.7rem',
                                                    color: 'var(--text-muted)'
                                                }}>
                                                    📎 {att.name}
                                                </div>
                                            )}
                                            {/* Promote button */}
                                            <button
                                                type="button"
                                                onClick={() => handlePromote(comment.id, idx)}
                                                title="Marcar como Evidencia Final"
                                                style={{
                                                    position: 'absolute',
                                                    bottom: '2px',
                                                    right: '2px',
                                                    background: 'rgba(0,0,0,0.7)',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '2px 4px',
                                                    cursor: 'pointer',
                                                    color: 'var(--primary)'
                                                }}
                                            >
                                                <Award size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
                <div ref={commentsEndRef} />
            </div>

            {/* Attachments Preview */}
            {attachments.length > 0 && (
                <div style={{
                    display: 'flex',
                    gap: 'var(--space-xs)',
                    padding: 'var(--space-xs) var(--space-md)',
                    borderTop: '1px solid var(--glass-border)',
                    flexWrap: 'wrap'
                }}>
                    {attachments.map((att, idx) => (
                        <div key={idx} style={{
                            position: 'relative',
                            background: 'var(--glass-bg)',
                            borderRadius: 'var(--radius-sm)',
                            padding: 'var(--space-xs)',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            📎 {att.name.substring(0, 15)}...
                            <button
                                type="button"
                                onClick={() => removeAttachment(idx)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: 0
                                }}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input Area */}
            <div style={{
                display: 'flex',
                gap: 'var(--space-xs)',
                padding: 'var(--space-md)',
                borderTop: '1px solid var(--glass-border)'
            }}>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        background: 'transparent',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: 'var(--space-xs)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                    }}
                >
                    <Paperclip size={18} />
                </button>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {/* Toolbar */}
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        padding: '2px 5px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <button type="button" onClick={() => {
                            const start = (document.activeElement as HTMLTextAreaElement).selectionStart;
                            const end = (document.activeElement as HTMLTextAreaElement).selectionEnd;
                            const text = newComment;
                            setNewComment(text.substring(0, start) + '**' + text.substring(start, end) + '**' + text.substring(end));
                        }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 'bold' }}>B</button>
                        <button type="button" onClick={() => {
                            const start = (document.activeElement as HTMLTextAreaElement).selectionStart;
                            const text = newComment;
                            setNewComment(text.substring(0, start) + '\n- ' + text.substring(start));
                        }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>• List</button>
                        <button type="button" onClick={() => {
                            const start = (document.activeElement as HTMLTextAreaElement).selectionStart;
                            const text = newComment;
                            setNewComment(text.substring(0, start) + '\n```\n\n```' + text.substring(start));
                        }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>&lt;/&gt; Code</button>
                    </div>
                    <textarea
                        placeholder="Escribe un comentario... (Ctrl+V para pegar imágenes)"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onPaste={handlePaste}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                handleSubmit();
                            }
                        }}
                        style={{
                            width: '100%',
                            minHeight: '60px',
                            maxHeight: '150px',
                            padding: 'var(--space-sm)',
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                            resize: 'vertical',
                            fontFamily: 'inherit'
                        }}
                    />
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        Ctrl+Enter para enviar
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading || (!newComment.trim() && attachments.length === 0)}
                    style={{
                        background: 'var(--primary)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: 'var(--space-sm)',
                        color: 'var(--bg-app)',
                        cursor: 'pointer',
                        opacity: isLoading || (!newComment.trim() && attachments.length === 0) ? 0.5 : 1
                    }}
                >
                    <Send size={18} />
                </button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />
        </div>
    );
};
