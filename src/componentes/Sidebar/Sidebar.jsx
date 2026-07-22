import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiFolder, FiSettings } from 'react-icons/fi';
import './Sidebar.css';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <h3>Menu</h3>
      </div>
      <nav className="sidebar-menu">
        <button 
          type="button"
          className={`sidebar-item ${location.pathname === '/' ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <FiHome size={18} /> Início
        </button>
        <button 
          type="button"
          className={`sidebar-item ${location.pathname === '/pops' ? 'active' : ''}`}
          onClick={() => navigate('/pops')}
        >
          <FiFolder size={18} /> Repositório
        </button>
        <button 
          type="button"
          className={`sidebar-item ${location.pathname === '/admin/pops' ? 'active' : ''}`}
          onClick={() => navigate('/admin/pops')}
        >
          <FiSettings size={18} /> Gerenciar POPs
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;