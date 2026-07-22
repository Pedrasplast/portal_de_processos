import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';

import {
  FiUpload,
  FiTrash2,
  FiFileText,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';

import { supabase } from '../../Servicos/clienteSupabase';
import MainLayout from '../../componentes/Layout/MainLayout';
import './GerenciarPops.css';

const SETORES_LISTA = [
  'ALMOXARIFADO',
  'COMPRAS',
  'SETOR FISCAL',
  'AUXILIAR ADM',
  'FATURAMENTO',
  'COMERCIAL',
  'EXPORTAÇÃO',
  'FINANCEIRO',
  'LOGISTICA',
  'PCP',
  'MOLDE',
  'MARCAS E PATENTES',
  'PRODUÇÃO',
  'SCOPI',
  'QUALIDADE',
  'RH',
  'EXPEDIÇÃO',
];

const TIPOS_DOCUMENTO = [
  'POP',
  'FLUXOGRAMA',
  'MAPA VISUAL',
];

function normalizarTexto(texto = '') {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function normalizarTipoDocumento(tipo = '') {
  const tipoNormalizado = normalizarTexto(tipo)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (tipoNormalizado === 'POP') return 'POP';
  if (tipoNormalizado === 'FLUXOGRAMA') return 'FLUXOGRAMA';
  if (tipoNormalizado === 'MAPA VISUAL') return 'MAPA VISUAL';

  return '';
}

function analisarTituloDocumento(titulo = '') {
  const tituloAjustado = titulo.trim().replace(/\s+/g, ' ');
  const resultado = tituloAjustado.match(
    /^(POP|FLUXOGRAMA|MAPA\s+VISUAL)-(\d+)\s*\|\s*(.+)$/i,
  );

  if (!resultado) return null;

  const tipo = normalizarTipoDocumento(resultado[1]);
  const numero = Number(resultado[2]);

  if (!tipo || !Number.isInteger(numero) || numero <= 0) return null;

  const nomeProcesso = resultado[3].trim().replace(/\s+/g, ' ');
  if (!nomeProcesso) return null;

  return {
    tipo,
    numero,
    codigo: String(numero).padStart(2, '0'),
    nomeProcesso,
  };
}

function formatarCodigo(numero) {
  return String(numero).padStart(2, '0');
}

function sanitizarNomeArquivo(nome = '') {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
}

function GerenciarPops() {
  const [abaAtiva, setAbaAtiva] = useState('pops'); 

  // Estados de Usuários Permitidos (Com campos unificados)
  const [usuariosCadastrados, setUsuariosCadastrados] = useState([]);
  const [novoNomeUsuario, setNovoNomeUsuario] = useState('');
  const [novoEmailUsuario, setNovoEmailUsuario] = useState('');
  const [novaDescricaoUsuario, setNovaDescricaoUsuario] = useState('');
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);

  // Estados de POPs
  const [pops, setPops] = useState([]);
  const [setor, setSetor] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [codigoSelecionado, setCodigoSelecionado] = useState('');
  const [nomeProcesso, setNomeProcesso] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(true);

  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [popParaExcluir, setPopParaExcluir] = useState(null);

  const inputArquivoRef = useRef(null);
  const mensagemTimeoutRef = useRef(null);

  const mostrarMensagemTemporaria = useCallback((tipo, texto) => {
    if (mensagemTimeoutRef.current) clearTimeout(mensagemTimeoutRef.current);
    setMensagem({ tipo, texto });
    mensagemTimeoutRef.current = setTimeout(() => {
      setMensagem({ tipo: '', texto: '' });
    }, 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (mensagemTimeoutRef.current) clearTimeout(mensagemTimeoutRef.current);
    };
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

  const carregarUsuarios = useCallback(async () => {
    try {
      setCarregandoUsuarios(true);
      const { data, error } = await supabase
        .from('usuarios_pops')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setUsuariosCadastrados(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error.message);
    } finally {
      setCarregandoUsuarios(false);
    }
  }, []);

  useEffect(() => {
    carregarPops(true);
    carregarUsuarios();
  }, [carregarPops, carregarUsuarios]);

  const handleCadastrarUsuario = async (e) => {
    e.preventDefault();
    if (!novoNomeUsuario || !novoEmailUsuario) {
      mostrarMensagemTemporaria('erro', 'Preencha o nome e o e-mail do usuário.');
      return;
    }

    try {
      setLoading(true);
      const emailTratado = normalizarTexto(novoEmailUsuario).toLowerCase();
      const { error } = await supabase.from('usuarios_pops').insert([
        { 
          nome: novoNomeUsuario.trim(), 
          email: emailTratado,
          descricao: novaDescricaoUsuario.trim() 
        },
      ]);

      if (error) throw error;
      mostrarMensagemTemporaria('sucesso', 'Usuário cadastrado com sucesso!');
      setNovoNomeUsuario('');
      setNovoEmailUsuario('');
      setNovaDescricaoUsuario('');
      carregarUsuarios();
    } catch (error) {
      mostrarMensagemTemporaria('erro', `Erro ao cadastrar usuário: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const excluirUsuarioPermitido = async (idUsuario) => {
    try {
      const { error } = await supabase.from('usuarios_pops').delete().eq('id', idUsuario);
      if (error) throw error;
      mostrarMensagemTemporaria('sucesso', 'Acesso do usuário removido.');
      carregarUsuarios();
    } catch (error) {
      mostrarMensagemTemporaria('erro', `Erro ao remover usuário: ${error.message}`);
    }
  };

  const documentosNormalizados = useMemo(() => {
    return pops
      .map((documento) => {
        const dadosTitulo = analisarTituloDocumento(documento.titulo);
        if (!dadosTitulo) return null;
        return {
          ...documento,
          numero: dadosTitulo.numero,
          codigo: dadosTitulo.codigo,
          nomeProcesso: dadosTitulo.nomeProcesso,
          tipo: normalizarTipoDocumento(documento.tipo_documento) || dadosTitulo.tipo,
        };
      })
      .filter(Boolean);
  }, [pops]);

  const documentosDoSetor = useMemo(() => {
    if (!setor) return [];
    return documentosNormalizados.filter(
      (documento) => normalizarTexto(documento.setor) === normalizarTexto(setor),
    );
  }, [documentosNormalizados, setor]);

  const numerosExistentesNoSetor = useMemo(() => {
    const numeros = documentosDoSetor.map((d) => d.numero).filter(Number.isFinite);
    return [...new Set(numeros)].sort((a, b) => a - b);
  }, [documentosDoSetor]);

  const numerosDisponiveis = useMemo(() => {
    if (!setor || !tipoDocumento) return [];
    return numerosExistentesNoSetor.filter((numero) => {
      const tipoJaExiste = documentosDoSetor.some(
        (d) => d.numero === numero && d.tipo === tipoDocumento,
      );
      return !tipoJaExiste;
    });
  }, [setor, tipoDocumento, numerosExistentesNoSetor, documentosDoSetor]);

  const proximoNumeroNovo = useMemo(() => {
    const maior = numerosExistentesNoSetor.length > 0 ? Math.max(...numerosExistentesNoSetor) : 0;
    return maior + 1;
  }, [numerosExistentesNoSetor]);

  const proximoCodigoNovo = useMemo(() => formatarCodigo(proximoNumeroNovo), [proximoNumeroNovo]);

  useEffect(() => {
    if (!setor || !tipoDocumento) {
      setCodigoSelecionado('');
      return;
    }
    if (numerosDisponiveis.length > 0) {
      const maiorDisp = Math.max(...numerosDisponiveis);
      setCodigoSelecionado(formatarCodigo(maiorDisp));
      return;
    }
    setCodigoSelecionado(proximoCodigoNovo);
  }, [setor, tipoDocumento, numerosDisponiveis, proximoCodigoNovo]);

  const obterTiposDoNumero = useCallback((numero) => {
    return documentosDoSetor
      .filter((d) => d.numero === numero)
      .map((d) => d.tipo)
      .filter((t, i, l) => l.indexOf(t) === i);
  }, [documentosDoSetor]);

  const tituloPreview = useMemo(() => {
    if (!tipoDocumento || !codigoSelecionado) return 'TIPO-__ |';
    return `${tipoDocumento}-${codigoSelecionado} |`;
  }, [tipoDocumento, codigoSelecionado]);

  const handleSetorChange = (event) => {
    setSetor(event.target.value);
    setCodigoSelecionado('');
    setNomeProcesso('');
  };

  const handleTipoDocumentoChange = (event) => {
    setTipoDocumento(event.target.value);
    setCodigoSelecionado('');
    setNomeProcesso('');
  };

  const validarCodigoNoBanco = useCallback(async ({ setorSelecionado, tipoSelecionado, codigo }) => {
    const { data, error } = await supabase.from('pops').select('id, titulo, setor, tipo_documento').eq('setor', setorSelecionado);
    if (error) throw error;

    const numeroSel = Number(codigo);
    const documentosAtuais = (data || []).map((d) => {
      const dadosTitulo = analisarTituloDocumento(d.titulo);
      if (!dadosTitulo) return null;
      return { numero: dadosTitulo.numero, tipo: normalizarTipoDocumento(d.tipo_documento) || dadosTitulo.tipo };
    }).filter(Boolean);

    const duplicado = documentosAtuais.some((d) => d.numero === numeroSel && d.tipo === tipoSelecionado);
    if (duplicado) {
      return { valido: false, mensagem: `${tipoSelecionado}-${codigo} já está cadastrado no setor ${setorSelecionado}.` };
    }
    return { valido: true };
  }, []);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!setor || !tipoDocumento || !codigoSelecionado || nomeProcesso.trim().length < 3 || !arquivo) {
      mostrarMensagemTemporaria('erro', 'Preencha todos os campos obrigatórios corretamente.');
      return;
    }

    const ehPdf = arquivo.type === 'application/pdf' || arquivo.name.toLowerCase().endsWith('.pdf');
    if (!ehPdf) {
      mostrarMensagemTemporaria('erro', 'O arquivo selecionado deve estar em PDF.');
      return;
    }

    setLoading(true);
    let caminhoStorageEnviado = null;

    try {
      const validacao = await validarCodigoNoBanco({ setorSelecionado: setor, tipoSelecionado: tipoDocumento, codigo: codigoSelecionado });
      if (!validacao.valido) {
        mostrarMensagemTemporaria('erro', validacao.mensagem);
        await carregarPops(false);
        return;
      }

      const tituloPadronizado = `${tipoDocumento}-${codigoSelecionado} | ` + normalizarTexto(nomeProcesso);
      const nomeSeguro = sanitizarNomeArquivo(arquivo.name);
      const identificador = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const caminhoStorage = `pdfs/${setor}/${codigoSelecionado}/${tipoDocumento}/${identificador}-${nomeSeguro}`;
      caminhoStorageEnviado = caminhoStorage;

      const { error: storageError } = await supabase.storage.from('pops').upload(caminhoStorage, arquivo, {
        contentType: 'application/pdf',
        upsert: false,
      });

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage.from('pops').getPublicUrl(caminhoStorage);

      const { error: dbError } = await supabase.from('pops').insert([
        {
          titulo: tituloPadronizado,
          arquivo_url: publicUrl,
          storage_path: caminhoStorage,
          setor,
          tipo_documento: tipoDocumento,
        },
      ]);

      if (dbError) throw dbError;

      caminhoStorageEnviado = null;
      mostrarMensagemTemporaria('sucesso', `${tituloPadronizado} cadastrado com sucesso!`);
      setNomeProcesso('');
      setArquivo(null);
      if (inputArquivoRef.current) inputArquivoRef.current.value = '';
      await carregarPops(false);
    } catch (error) {
      if (caminhoStorageEnviado) {
        try { await supabase.storage.from('pops').remove([caminhoStorageEnviado]); } catch (e) { console.error(e); }
      }
      mostrarMensagemTemporaria('erro', `Erro no upload: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const solicitarExclusao = useCallback((pop) => setPopParaExcluir(pop), []);

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
      await carregarPops(false);
    } catch (error) {
      mostrarMensagemTemporaria('erro', `Erro ao excluir: ${error.message}`);
      setPopParaExcluir(null);
    }
  };

  const listaPopsMemoizada = useMemo(() => {
    if (carregandoDados) return <tr><td colSpan="4" className="pops-empty">Carregando documentos...</td></tr>;
    if (pops.length === 0) return <tr><td colSpan="4" className="pops-empty">Nenhum documento cadastrado.</td></tr>;

    return pops.map((pop) => (
      <tr key={pop.id}>
        <td className="td-title"><FiFileText className="file-icon" /><span>{pop.titulo}</span></td>
        <td>{pop.setor || 'Geral'}</td>
        <td><span className="badge-tipo">{pop.tipo_documento || 'POP'}</span></td>
        <td className="td-actions">
          <button type="button" onClick={() => solicitarExclusao(pop)} className="btn-delete"><FiTrash2 /> Excluir</button>
        </td>
      </tr>
    ));
  }, [carregandoDados, pops, solicitarExclusao]);

  return (
    <MainLayout>
      <div className="pops-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Painel Administrativo</h2>
          <p>Gerenciamento de POPs e Usuários com Acesso</p>
        </div>
      </div>

      {/* Apenas 2 Abas Agora */}
      <div style={{ display: 'flex', gap: '10px', margin: '20px 0', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
        <button
          type="button"
          onClick={() => setAbaAtiva('pops')}
          style={{
            background: abaAtiva === 'pops' ? '#007bff' : '#f8f9fa',
            color: abaAtiva === 'pops' ? '#fff' : '#333',
            border: '1px solid #ccc', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <FiFileText /> Gerenciar POPs
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('usuarios')}
          style={{
            background: abaAtiva === 'usuarios' ? '#007bff' : '#f8f9fa',
            color: abaAtiva === 'usuarios' ? '#fff' : '#333',
            border: '1px solid #ccc', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <FiUsers /> Usuários com Acesso
        </button>
      </div>

      {mensagem.texto && (
        <div className={`alert-box ${mensagem.tipo}`} role="alert">
          {mensagem.texto}
        </div>
      )}

      {abaAtiva === 'usuarios' ? (
        <div className="admin-form" style={{ background: '#fff', padding: '20px', borderRadius: '8px' }}>
          <h3><FiUserPlus /> Cadastrar Usuário com Acesso</h3>
          <form onSubmit={handleCadastrarUsuario}>
            <div className="form-group">
              <label>Nome do Colaborador</label>
              <input type="text" placeholder="Ex: João Silva" value={novoNomeUsuario} onChange={(e) => setNovoNomeUsuario(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>E-mail de Acesso</label>
              <input type="email" placeholder="joao@empresa.com" value={novoEmailUsuario} onChange={(e) => setNovoEmailUsuario(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Descrição (Opcional)</label>
              <input type="text" placeholder="Detalhes ou observações do usuário" value={novaDescricaoUsuario} onChange={(e) => setNovaDescricaoUsuario(e.target.value)} />
            </div>
            <button type="submit" className="btn-submit" disabled={loading}>{loading ? 'Salvando...' : 'Liberar Acesso'}</button>
          </form>

          <h3 style={{ marginTop: '30px' }}>Lista de Usuários Autorizados</h3>
          <div className="pops-table-wrapper" style={{ marginTop: '10px' }}>
            <table className="pops-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Descrição</th>
                  <th className="th-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuariosCadastrados.length === 0 ? (
                  <tr><td colSpan="4" className="pops-empty">Nenhum usuário cadastrado.</td></tr>
                ) : (
                  usuariosCadastrados.map((u) => (
                    <tr key={u.id}>
                      <td><strong>{u.nome}</strong></td>
                      <td>{u.email}</td>
                      <td>{u.descricao || '-'}</td>
                      <td className="td-actions">
                        <button type="button" onClick={() => excluirUsuarioPermitido(u.id)} className="btn-delete"><FiTrash2 /> Revogar</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          <form onSubmit={handleUpload} className="admin-form">
            <h3>Adicionar Novo Documento</h3>
            <div className="form-group">
              <label htmlFor="setor-documento">Setor / Pasta</label>
              <select id="setor-documento" value={setor} onChange={handleSetorChange} className="form-select-setor" disabled={loading} required>
                <option value="" disabled>Selecione o setor</option>
                {SETORES_LISTA.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tipo-documento">Tipo de Documento</label>
              <select id="tipo-documento" value={tipoDocumento} onChange={handleTipoDocumentoChange} className="form-select-setor" disabled={loading} required>
                <option value="" disabled>Selecione o tipo de documento</option>
                {TIPOS_DOCUMENTO.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="codigo-documento">Número do Documento</label>
              <select id="codigo-documento" value={codigoSelecionado} onChange={(e) => { setCodigoSelecionado(e.target.value); setNomeProcesso(''); }} className="form-select-setor" disabled={loading || !setor || !tipoDocumento} required>
                <option value="" disabled>Selecione a numeração</option>
                {numerosDisponiveis.map((numero) => {
                  const tiposExistentes = obterTiposDoNumero(numero);
                  const codigo = formatarCodigo(numero);
                  return <option key={`existente-${codigo}`} value={codigo}>{codigo} - Possui [{tiposExistentes.join(', ')}]</option>;
                })}
                <option value={proximoCodigoNovo}>{proximoCodigoNovo} - criar novo procedimento</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="nome-processo">Título do Processo</label>
              <div className="titulo-composto">
                <span className="titulo-prefixo">{tituloPreview}</span>
                <input id="nome-processo" type="text" placeholder="NOME DO PROCESSO" value={nomeProcesso} onChange={(e) => setNomeProcesso(e.target.value.toUpperCase())} disabled={loading || !setor || !tipoDocumento || !codigoSelecionado} maxLength={140} autoComplete="off" required />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="arquivo-pdf">Arquivo PDF</label>
              <input ref={inputArquivoRef} id="arquivo-pdf" type="file" accept="application/pdf,.pdf" onChange={(e) => setArquivo(e.target.files?.[0] || null)} disabled={loading} required />
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              <FiUpload /> {loading ? 'Validando e enviando...' : 'Publicar Documento'}
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
              <tbody>{listaPopsMemoizada}</tbody>
            </table>
          </div>
        </>
      )}

      {popParaExcluir && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Confirmar Exclusão</h3>
            <p>Tem certeza de que deseja remover o documento <strong>"{popParaExcluir.titulo}"</strong>?</p>
            <div className="modal-actions">
              <button type="button" onClick={() => setPopParaExcluir(null)} className="btn-cancelar">Cancelar</button>
              <button type="button" onClick={confirmarExclusao} className="btn-confirmar-exclusao">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default GerenciarPops;