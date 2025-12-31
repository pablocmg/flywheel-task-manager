import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Target, Calendar, CheckSquare, Settings, Folder } from 'lucide-react';
import './RootLayout.css';

export const RootLayout: React.FC = () => {
    return (
        <div className="layout-container">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <Target size={24} />
                    <span>Flywheel Nav</span>
                </div>
                <nav className="nav-menu">
                    <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <LayoutDashboard size={20} />
                        <span>Panel</span>
                    </NavLink>
                    <NavLink to="/nodes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Settings size={20} />
                        <span>Config Nodos</span>
                    </NavLink>
                    <NavLink to="/planning" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Calendar size={20} />
                        <span>Planificación</span>
                    </NavLink>
                    <NavLink to="/projects" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Folder size={20} />
                        <span>Proyectos</span>
                    </NavLink>
                    <NavLink to="/execution" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <CheckSquare size={20} />
                        <span>Ejecución</span>
                    </NavLink>
                </nav>
            </aside>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};
