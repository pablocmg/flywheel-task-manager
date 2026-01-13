import React, { useState } from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, disabled = false }) => {
    const [isVisible, setIsVisible] = useState(false);

    if (disabled) {
        return <>{children}</>;
    }

    return (
        <div
            style={{ position: 'relative', display: 'flex' }}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div
                    style={{
                        position: 'absolute',
                        left: '100%',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        marginLeft: '8px',
                        padding: '6px 12px',
                        background: 'var(--bg-panel)',
                        border: 'var(--glass-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        zIndex: 1000,
                        pointerEvents: 'none',
                        boxShadow: 'var(--shadow-lg)',
                    }}
                >
                    {content}
                </div>
            )}
        </div>
    );
};
