import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiUpload, FiTrash2, FiFileText } from 'react-icons/fi';
import { supabase } from '../../Servicos/clienteSupabase';
import MainLayout from '../../componentes/Layout/MainLayout';
import './GerenciarPops.css';

const SETORES_LISTA = [
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

const TIPOS_DOCUMENTO = [
  "POP",
  "FLUXOGRAMA",
  "MAPA VISUAL",
  "POLITICA",
  "MANUAL",
  "CHECKLIST",
  "SLA",
  "CARTILHA",
  "REGISTRO"
];

function GerenciarPops() {
  const [pops, setPops] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [setor, setSetor] = useState(SETORES_LISTA[0]);
  const [tipoDocumento, setTipoDocumento] = useState(TIPOS_DOCUMENTO[0]);
  const [arquivo, setArquivo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(true); // Novo estado para evitar piscada
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [popParaExcluir, setPopParaExcluir] = useState(null);

  const mostrarMensagemTemporaria = useCallback((tipo, texto) => {
    setMensagem({ tipo, texto });
    const timer = setTimeout(() => {
      setMensagem({ tipo: '', texto: '' });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const carregarPops = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setCarregandoDados(true);

      const { data, error } = await supabase
        .from('pops')
        .select('id, titulo, setor, tipo_documento, storage_path')
        .order('id', { ascending: false });

      if (error) throw error;
      setPops(data || []);
    } catch (error) {
      mostrarMensagemTemporaria('erro', `Erro ao carregar: ${error.message}`);
    } finally {
      if (isInitial) setCarregandoDados(false);
    }
  }, [mostrarMensagemTemporaria]);

  useEffect(() => {
    carregarPops(true);
  }, [carregarPops]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!arquivo || !titulo || !setor || !tipoDocumento) {
      mostrarMensagemTemporaria('erro', 'Preencha todos os campos e selecione o arquivo PDF.');
      return;
    }

    setLoading(true);
    try {
      const nomeArquivo = `${Date.now()}-${arquivo.name}`;
      const caminhoStorage = `pdfs/${nomeArquivo}`;

      const { error: storageError } = await supabase.storage
        .from('pops')
        .upload(caminhoStorage, arquivo);

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from('pops')
        .getPublicUrl(caminhoStorage);

      const { error: dbError } = await supabase.from('pops').insert([
        { 
          titulo, 
          arquivo_url: publicUrl, 
          storage_path: caminhoStorage, 
          setor, 
          tipo_documento: tipoDocumento 
        }
      ]);

      if (dbError) throw dbError;

      mostrarMensagemTemporaria('sucesso', 'Documento enviado com sucesso!');
      setTitulo('');
      setSetor(SETORES_LISTA[0]);
      setTipoDocumento(TIPOS_DOCUMENTO[0]);
      setArquivo(null);
      carregarPops(false);
    } catch (error) {
      mostrarMensagemTemporaria('erro', `Erro no upload: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const solicitarExclusao = useCallback((pop) => {
    setPopParaExcluir(pop);
  }, []);

  const confirmarExclusao = async () => {
    if (!popParaExcluir) return;

    try {
      if (popParaExcluir.storage_path) {
        await supabase.storage.from('pops').remove([popParaExcluir.storage_path]);
      }
      const { error } = await supabase.from('pops').delete().eq('id', popParaExcluir.id);

      if (error) throw error;

      mostrarMensagemTemporaria('sucesso', 'Documento excluído com sucesso!');
      setPopParaExcluir(null);
      carregarPops(false);
    } catch (error) {
      mostrarMensagemTemporaria('erro', `Erro ao excluir: ${error.message}`);
      setPopParaExcluir(null);
    }
  };

  const listaPopsMemoizada = useMemo(() => {
    if (carregandoDados) {
      return (
        <tr>
          <td colSpan="4" className="pops-empty">Carregando documentos...</td>
        </tr>
      );
    }

    if (pops.length === 0) {
      return (
        <tr>
          <td colSpan="4" className="pops-empty">Nenhum documento cadastrado.</td>
        </tr>
      );
    }

    return pops.map((pop) => (
      <tr key={pop.id}>
        <td className="td-title">
          <FiFileText className="file-icon" />
          <span>{pop.titulo}</span>
        </td>
        <td>
          <span className="badge-setor">{pop.setor || 'Geral'}</span>
        </td>
        <td>
          <span className="badge-tipo">{pop.tipo_documento || 'POP'}</span>
        </td>
        <td className="td-actions">
          <button 
            type="button"
            onClick={() => solicitarExclusao(pop)} 
            className="btn-delete"
          >
            <FiTrash2 /> Excluir
          </button>
        </td>
      </tr>
    ));
  }, [carregandoDados, pops, solicitarExclusao]);

  return (
    <MainLayout>
      <div className="pops-header">
        <h2>Painel Administrativo</h2>
        <p>Cadastre novos documentos ou remova registros antigos.</p>
      </div>

      {mensagem.texto && (
        <div className={`alert-box ${mensagem.tipo}`}>
          {mensagem.texto}
        </div>
      )}

      <form onSubmit={handleUpload} className="admin-form">
        <h3>Adicionar Novo Documento</h3>
        
        <div className="form-group">
          <label>Título do Processo</label>
          <input
            type="text"
            placeholder="Ex: Gestão de Contratos..."
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Setor / Pasta</label>
          <select
            value={setor}
            onChange={(e) => setSetor(e.target.value)}
            className="form-select-setor"
            required
          >
            {SETORES_LISTA.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Tipo de Documento</label>
          <select
            value={tipoDocumento}
            onChange={(e) => setTipoDocumento(e.target.value)}
            className="form-select-setor"
            required
          >
            {TIPOS_DOCUMENTO.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Arquivo PDF</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setArquivo(e.target.files[0])}
            required
          />
        </div>

        <button type="submit" className="btn-submit" disabled={loading}>
          <FiUpload /> {loading ? 'Enviando...' : 'Publicar Documento'}
        </button>
      </form>

      <div className="pops-table-wrapper" style={{ marginTop: '30px' }}>
        <table className="pops-table">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Setor</th>
              <th>Tipo</th>
              <th className="th-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {listaPopsMemoizada}
          </tbody>
        </table>
      </div>

      {popParaExcluir && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Confirmar Exclusão</h3>
            <p>
              Tem certeza de que deseja remover o documento <strong>"{popParaExcluir.titulo}"</strong>? Esta ação não poderá ser desfeita.
            </p>
            <div className="modal-actions">
              <button 
                type="button" 
                onClick={() => setPopParaExcluir(null)} 
                className="btn-cancelar"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={confirmarExclusao} 
                className="btn-confirmar-exclusao"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default GerenciarPops;