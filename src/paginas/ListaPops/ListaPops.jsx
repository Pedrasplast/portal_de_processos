import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiFileText, FiExternalLink, FiDownload } from 'react-icons/fi';
import { supabase } from '../../Servicos/clienteSupabase';
import MainLayout from '../../componentes/Layout/MainLayout';
import './ListaPops.css';

const SETORES_LISTA = [
  "TODOS",
  "ALMOXARIFADO",
  "COMPRAS",
  "SETOR FISCAL",
  "AUXILIAR ADM",
  "FATURAMENTO",
  "COMERCIAL",
  "EXPORTAÇÃO",
  "FINANCEIRO",
  "LOGISTICA",
  "PCP",
  "MOLDE",
  "MARCAS E PATENTES",
  "PRODUÇÃO",
  "SCOPI",
  "QUALIDADE",
  "RH",
  "EXPEDIÇÃO"
];

function ListaPops() {
  const [pops, setPops] = useState([]);
  const [busca, setBusca] = useState('');
  const [setorSelecionado, setSetorSelecionado] = useState('TODOS');

  const carregarPops = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pops')
        .select('id, titulo, setor, tipo_documento, arquivo_url')
        .order('titulo', { ascending: true });
      
      if (error) throw error;
      setPops(data || []);
    } catch (err) {
      console.error('Erro ao carregar pops:', err.message);
    }
  }, []);

  useEffect(() => {
    carregarPops();
  }, [carregarPops]);

  const popsFiltrados = useMemo(() => {
    const termoBusca = busca.toLowerCase().trim();
    
    return pops.filter(pop => {
      const matchBusca = !termoBusca || pop.titulo?.toLowerCase().includes(termoBusca);
      const matchSetor = setorSelecionado === 'TODOS' || pop.setor === setorSelecionado;
      return matchBusca && matchSetor;
    });
  }, [pops, busca, setorSelecionado]);

  const renderSetoresChips = useMemo(() => {
    return SETORES_LISTA.map((setor) => (
      <button
        key={setor}
        type="button"
        onClick={() => setSetorSelecionado(setor)}
        className={`setor-chip ${setorSelecionado === setor ? 'active' : ''}`}
      >
        {setor}
      </button>
    ));
  }, [setorSelecionado]);

  const renderTabelaLinhas = useMemo(() => {
    if (popsFiltrados.length === 0) {
      return (
        <tr>
          <td colSpan="4" className="pops-empty">Nenhum documento encontrado para este setor.</td>
        </tr>
      );
    }

    return popsFiltrados.map((pop) => (
      <tr key={pop.id}>
        <td className="td-title">
          <FiFileText className="file-icon" />
          <span>{pop.titulo}</span>
        </td>
        <td>
          <span className="badge-setor-tabela">{pop.setor || 'Geral'}</span>
        </td>
        <td>
          <span className="badge-tipo-tabela">{pop.tipo_documento || 'POP'}</span>
        </td>
        <td className="td-actions">
          <a href={pop.arquivo_url} target="_blank" rel="noopener noreferrer" className="btn-action view">
            Visualizar <FiExternalLink size={13} />
          </a>
          <a href={pop.arquivo_url} download target="_blank" rel="noopener noreferrer" className="btn-action download">
            Baixar <FiDownload size={13} />
          </a>
        </td>
      </tr>
    ));
  }, [popsFiltrados]);

  return (
    <MainLayout>
      <div className="pops-header">
        <h2>Repositório de Processos Organizacionais</h2>
        <p>Consulte e baixe os documentos operacionais padronizados por setor.</p>
        
        <input
          type="text"
          placeholder="Pesquisar processo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pops-search-input"
        />
      </div>

      <div className="setores-container">
        {renderSetoresChips}
      </div>

      <div className="pops-table-wrapper">
        <table className="pops-table">
          <thead>
            <tr>
              <th>Nome do Processo</th>
              <th style={{ width: '160px' }}>Setor</th>
              <th style={{ width: '140px' }}>Tipo</th>
              <th className="th-actions">Download</th>
            </tr>
          </thead>
          <tbody>
            {renderTabelaLinhas}
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
}

export default ListaPops;