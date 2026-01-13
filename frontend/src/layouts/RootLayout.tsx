import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Target, Calendar, CheckSquare, Settings, Folder, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Tooltip } from '../components/Tooltip';
import './RootLayout.css';

export const RootLayout: React.FC = () => {
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        return saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', String(isCollapsed));
    }, [isCollapsed]);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const mainNavItems = [
        { to: '/', icon: LayoutDashboard, label: 'Panel' },
        { to: '/projects', icon: Folder, label: 'Proyectos' },
        { to: '/planning', icon: Calendar, label: 'Planificación' },
        { to: '/execution', icon: CheckSquare, label: 'Ejecución' },
    ];

    const settingsNavItems = [
        { to: '/nodes', icon: Settings, label: 'Configuración' },
    ];

    return (
        <div className="layout-container">
            <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <Target size={24} />
                    {!isCollapsed && <span>Flywheel Nav</span>}
                </div>
                <nav className="nav-menu">
                    {mainNavItems.map(({ to, icon: Icon, label }) => (
                        <Tooltip key={to} content={label} disabled={!isCollapsed}>
                            <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <Icon size={20} />
                                {!isCollapsed && <span>{label}</span>}
                            </NavLink>
                        </Tooltip>
                    ))}

                    {/* Separator */}
                    <div style={{ marginTop: 'auto', paddingTop: 'var(--space-md)' }}>
                        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', marginBottom: 'var(--space-md)' }}></div>
                        {settingsNavItems.map(({ to, icon: Icon, label }) => (
                            <Tooltip key={to} content={label} disabled={!isCollapsed}>
                                <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                    <Icon size={20} />
                                    {!isCollapsed && <span>{label}</span>}
                                </NavLink>
                            </Tooltip>
                        ))}
                    </div>
                </nav>
                <button
                    className="sidebar-toggle"
                    onClick={toggleCollapse}
                    aria-label={isCollapsed ? 'Expandir navegación' : 'Colapsar navegación'}
                >
                    {isCollapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
                </button>
            </aside>
            <main className="main-content">
                <Outlet />
            </main>
        </div >
    );
};
