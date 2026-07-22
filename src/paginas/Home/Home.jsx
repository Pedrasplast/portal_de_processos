import React, { useCallback } from 'react';
import MainLayout from '../../componentes/Layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import { FiFolder, FiSettings, FiArrowRight } from 'react-icons/fi';
import './Home.css';

function Home() {
  const navigate = useNavigate();

  const irParaRepositorio = useCallback(() => {
    navigate('/pops');
  }, [navigate]);

  const irParaAdmin = useCallback(() => {
    navigate('/admin/pops');
  }, [navigate]);

  return (
    <MainLayout>
      <div className="home-hero">
        <h1>Bem-vindo ao Sistema de Gestão de POPs</h1>
        <p>Centralize, organize e consulte os Procedimentos Operacionais Padrão da sua instituição com facilidade e segurança.</p>
      </div>

      <div className="home-cards-grid">
        <div 
          className="home-card" 
          onClick={irParaRepositorio}
          role="button"
          tabIndex={0}
        >
          <div className="card-icon folder"><FiFolder size={24} /></div>
          <h3>Repositório de POPs</h3>
          <p>Consulte todos os documentos operacionais disponíveis separados por setores.</p>
          <span className="card-link">Acessar repositório <FiArrowRight /></span>
        </div>

        <div 
          className="home-card" 
          onClick={irParaAdmin}
          role="button"
          tabIndex={0}
        >
          <div className="card-icon admin"><FiSettings size={24} /></div>
          <h3>Painel Administrativo</h3>
          <p>Envie novos arquivos PDF ou remova documentos desatualizados do sistema.</p>
          <span className="card-link">Gerenciar arquivos <FiArrowRight /></span>
        </div>
      </div>
    </MainLayout>
  );
}

export default Home;