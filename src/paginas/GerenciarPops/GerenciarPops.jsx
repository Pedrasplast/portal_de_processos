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

  if (tipoNormalizado === 'POP') {
    return 'POP';
  }

  if (tipoNormalizado === 'FLUXOGRAMA') {
    return 'FLUXOGRAMA';
  }

  if (tipoNormalizado === 'MAPA VISUAL') {
    return 'MAPA VISUAL';
  }

  return '';
}

/*
 * Reconhece:
 *
 * POP-01 | NOME
 * FLUXOGRAMA-01 | NOME
 * MAPA VISUAL-01 | NOME
 */
function analisarTituloDocumento(titulo = '') {
  const tituloAjustado = titulo
    .trim()
    .replace(/\s+/g, ' ');

  const resultado = tituloAjustado.match(
    /^(POP|FLUXOGRAMA|MAPA\s+VISUAL)-(\d+)\s*\|\s*(.+)$/i,
  );

  if (!resultado) {
    return null;
  }

  const tipo = normalizarTipoDocumento(
    resultado[1],
  );

  const numero = Number(resultado[2]);

  if (
    !tipo ||
    !Number.isInteger(numero) ||
    numero <= 0
  ) {
    return null;
  }

  const nomeProcesso = resultado[3]
    .trim()
    .replace(/\s+/g, ' ');

  if (!nomeProcesso) {
    return null;
  }

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
  const [pops, setPops] = useState([]);

  const [setor, setSetor] = useState('');
  const [tipoDocumento, setTipoDocumento] =
    useState('');

  const [codigoSelecionado, setCodigoSelecionado] =
    useState('');

  const [nomeProcesso, setNomeProcesso] =
    useState('');

  const [arquivo, setArquivo] = useState(null);
  const [loading, setLoading] = useState(false);

  const [carregandoDados, setCarregandoDados] =
    useState(true);

  const [mensagem, setMensagem] = useState({
    tipo: '',
    texto: '',
  });

  const [popParaExcluir, setPopParaExcluir] =
    useState(null);

  const inputArquivoRef = useRef(null);
  const mensagemTimeoutRef = useRef(null);

  const mostrarMensagemTemporaria = useCallback(
    (tipo, texto) => {
      if (mensagemTimeoutRef.current) {
        clearTimeout(mensagemTimeoutRef.current);
      }

      setMensagem({
        tipo,
        texto,
      });

      mensagemTimeoutRef.current = setTimeout(() => {
        setMensagem({
          tipo: '',
          texto: '',
        });
      }, 4500);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (mensagemTimeoutRef.current) {
        clearTimeout(mensagemTimeoutRef.current);
      }
    };
  }, []);

  const carregarPops = useCallback(
    async (isInitial = false) => {
      try {
        if (isInitial) {
          setCarregandoDados(true);
        }

        const { data, error } = await supabase
          .from('pops')
          .select(`
            id,
            titulo,
            setor,
            tipo_documento,
            storage_path
          `)
          .order('id', {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        setPops(data || []);
      } catch (error) {
        mostrarMensagemTemporaria(
          'erro',
          `Erro ao carregar: ${error.message}`,
        );
      } finally {
        if (isInitial) {
          setCarregandoDados(false);
        }
      }
    },
    [mostrarMensagemTemporaria],
  );

  useEffect(() => {
    carregarPops(true);
  }, [carregarPops]);

  const documentosNormalizados = useMemo(() => {
    return pops
      .map((documento) => {
        const dadosTitulo =
          analisarTituloDocumento(
            documento.titulo,
          );

        if (!dadosTitulo) {
          return null;
        }

        return {
          ...documento,

          numero: dadosTitulo.numero,
          codigo: dadosTitulo.codigo,

          nomeProcesso:
            dadosTitulo.nomeProcesso,

          tipo:
            normalizarTipoDocumento(
              documento.tipo_documento,
            ) || dadosTitulo.tipo,
        };
      })
      .filter(Boolean);
  }, [pops]);

  /*
   * Documentos pertencentes ao setor selecionado.
   */
  const documentosDoSetor = useMemo(() => {
    if (!setor) {
      return [];
    }

    return documentosNormalizados.filter(
      (documento) =>
        normalizarTexto(documento.setor) ===
        normalizarTexto(setor),
    );
  }, [documentosNormalizados, setor]);

  /*
   * Busca todos os números existentes no setor,
   * independentemente do tipo.
   *
   * Exemplo:
   *
   * POP-01
   * POP-03
   * FLUXOGRAMA-02
   *
   * Números existentes: 01, 02 e 03.
   */
  const numerosExistentesNoSetor = useMemo(() => {
    const numeros = documentosDoSetor
      .map((documento) => documento.numero)
      .filter(Number.isFinite);

    return [...new Set(numeros)].sort(
      (a, b) => a - b,
    );
  }, [documentosDoSetor]);

  /*
   * Números existentes que ainda estão disponíveis
   * para o tipo selecionado.
   *
   * Exemplo:
   *
   * Existe POP-03, mas não FLUXOGRAMA-03.
   * Ao selecionar Fluxograma, o número 03 aparece.
   */
  const numerosDisponiveis = useMemo(() => {
    if (!setor || !tipoDocumento) {
      return [];
    }

    return numerosExistentesNoSetor.filter(
      (numero) => {
        const tipoJaExiste =
          documentosDoSetor.some(
            (documento) =>
              documento.numero === numero &&
              documento.tipo === tipoDocumento,
          );

        return !tipoJaExiste;
      },
    );
  }, [
    setor,
    tipoDocumento,
    numerosExistentesNoSetor,
    documentosDoSetor,
  ]);

  /*
   * Uma linha nova sempre usa o maior número existente
   * no setor + 1.
   *
   * A sequência é compartilhada entre todos os tipos.
   */
  const proximoNumeroNovo = useMemo(() => {
    const maiorNumero =
      numerosExistentesNoSetor.length > 0
        ? Math.max(...numerosExistentesNoSetor)
        : 0;

    return maiorNumero + 1;
  }, [numerosExistentesNoSetor]);

  const proximoCodigoNovo = useMemo(
    () => formatarCodigo(proximoNumeroNovo),
    [proximoNumeroNovo],
  );

  /*
   * Quando o setor ou tipo é alterado:
   *
   * 1. Dá preferência ao maior número existente
   *    que ainda não possui o tipo selecionado.
   *
   * 2. Caso não exista nenhum, seleciona um número novo.
   *
   * Exemplo:
   * Existe POP-03 e falta FLUXOGRAMA-03.
   * O Fluxograma já inicia automaticamente em 03.
   */
  useEffect(() => {
    if (!setor || !tipoDocumento) {
      setCodigoSelecionado('');
      return;
    }

    if (numerosDisponiveis.length > 0) {
      const maiorNumeroDisponivel = Math.max(
        ...numerosDisponiveis,
      );

      setCodigoSelecionado(
        formatarCodigo(maiorNumeroDisponivel),
      );

      return;
    }

    setCodigoSelecionado(proximoCodigoNovo);
  }, [
    setor,
    tipoDocumento,
    numerosDisponiveis,
    proximoCodigoNovo,
  ]);

  /*
   * Retorna os tipos já cadastrados em determinado
   * número para mostrar no select.
   */
  const obterTiposDoNumero = useCallback(
    (numero) => {
      return documentosDoSetor
        .filter(
          (documento) =>
            documento.numero === numero,
        )
        .map((documento) => documento.tipo)
        .filter(
          (tipo, indice, lista) =>
            lista.indexOf(tipo) === indice,
        );
    },
    [documentosDoSetor],
  );

  const tituloPreview = useMemo(() => {
    if (
      !tipoDocumento ||
      !codigoSelecionado
    ) {
      return 'TIPO-__ |';
    }

    return (
      `${tipoDocumento}-` +
      `${codigoSelecionado} |`
    );
  }, [
    tipoDocumento,
    codigoSelecionado,
  ]);

  const handleSetorChange = (event) => {
    setSetor(event.target.value);
    setCodigoSelecionado('');
    setNomeProcesso('');
  };

  const handleTipoDocumentoChange = (
    event,
  ) => {
    setTipoDocumento(event.target.value);
    setCodigoSelecionado('');
    setNomeProcesso('');
  };

  /*
   * Confere a situação novamente no banco no momento
   * do envio para evitar duplicidade.
   */
  const validarCodigoNoBanco = useCallback(
    async ({
      setorSelecionado,
      tipoSelecionado,
      codigo,
    }) => {
      const { data, error } = await supabase
        .from('pops')
        .select(`
          id,
          titulo,
          setor,
          tipo_documento
        `)
        .eq('setor', setorSelecionado);

      if (error) {
        throw error;
      }

      const numeroSelecionado = Number(codigo);

      const documentosAtuais = (data || [])
        .map((documento) => {
          const dadosTitulo =
            analisarTituloDocumento(
              documento.titulo,
            );

          if (!dadosTitulo) {
            return null;
          }

          return {
            numero: dadosTitulo.numero,

            tipo:
              normalizarTipoDocumento(
                documento.tipo_documento,
              ) || dadosTitulo.tipo,
          };
        })
        .filter(Boolean);

      const documentoDuplicado =
        documentosAtuais.some(
          (documento) =>
            documento.numero ===
              numeroSelecionado &&
            documento.tipo ===
              tipoSelecionado,
        );

      if (documentoDuplicado) {
        return {
          valido: false,

          mensagem:
            `${tipoSelecionado}-${codigo} já está ` +
            `cadastrado no setor ${setorSelecionado}.`,
        };
      }

      return {
        valido: true,
      };
    },
    [],
  );

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!setor) {
      mostrarMensagemTemporaria(
        'erro',
        'Selecione o setor.',
      );

      return;
    }

    if (!tipoDocumento) {
      mostrarMensagemTemporaria(
        'erro',
        'Selecione o tipo de documento.',
      );

      return;
    }

    if (!codigoSelecionado) {
      mostrarMensagemTemporaria(
        'erro',
        'Selecione o número do documento.',
      );

      return;
    }

    if (nomeProcesso.trim().length < 3) {
      mostrarMensagemTemporaria(
        'erro',
        'Informe o nome completo do processo.',
      );

      return;
    }

    if (!arquivo) {
      mostrarMensagemTemporaria(
        'erro',
        'Selecione o arquivo PDF.',
      );

      return;
    }

    const arquivoEhPdf =
      arquivo.type === 'application/pdf' ||
      arquivo.name
        .toLowerCase()
        .endsWith('.pdf');

    if (!arquivoEhPdf) {
      mostrarMensagemTemporaria(
        'erro',
        'O arquivo selecionado deve estar em PDF.',
      );

      return;
    }

    setLoading(true);

    let caminhoStorageEnviado = null;

    try {
      const validacao =
        await validarCodigoNoBanco({
          setorSelecionado: setor,
          tipoSelecionado: tipoDocumento,
          codigo: codigoSelecionado,
        });

      if (!validacao.valido) {
        mostrarMensagemTemporaria(
          'erro',
          validacao.mensagem,
        );

        await carregarPops(false);
        return;
      }

      const tituloPadronizado =
        `${tipoDocumento}-${codigoSelecionado} | ` +
        normalizarTexto(nomeProcesso);

      const nomeArquivoSeguro =
        sanitizarNomeArquivo(arquivo.name);

      const identificador =
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()
              .toString(16)
              .slice(2)}`;

      const caminhoStorage =
        `pdfs/${setor}/${codigoSelecionado}/` +
        `${tipoDocumento}/` +
        `${identificador}-${nomeArquivoSeguro}`;

      caminhoStorageEnviado = caminhoStorage;

      const { error: storageError } =
        await supabase.storage
          .from('pops')
          .upload(caminhoStorage, arquivo, {
            contentType: 'application/pdf',
            upsert: false,
          });

      if (storageError) {
        throw storageError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from('pops')
        .getPublicUrl(caminhoStorage);

      const { error: dbError } = await supabase
        .from('pops')
        .insert([
          {
            titulo: tituloPadronizado,
            arquivo_url: publicUrl,
            storage_path: caminhoStorage,
            setor,
            tipo_documento: tipoDocumento,
          },
        ]);

      if (dbError) {
        throw dbError;
      }

      caminhoStorageEnviado = null;

      mostrarMensagemTemporaria(
        'sucesso',
        `${tituloPadronizado} cadastrado com sucesso!`,
      );

      setNomeProcesso('');
      setArquivo(null);

      if (inputArquivoRef.current) {
        inputArquivoRef.current.value = '';
      }

      await carregarPops(false);
    } catch (error) {
      if (caminhoStorageEnviado) {
        try {
          await supabase.storage
            .from('pops')
            .remove([
              caminhoStorageEnviado,
            ]);
        } catch (erroRemocao) {
          console.error(
            'Erro ao remover arquivo órfão:',
            erroRemocao,
          );
        }
      }

      mostrarMensagemTemporaria(
        'erro',
        `Erro no upload: ${error.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const solicitarExclusao = useCallback(
    (pop) => {
      setPopParaExcluir(pop);
    },
    [],
  );

  const confirmarExclusao = async () => {
    if (!popParaExcluir) {
      return;
    }

    try {
      if (popParaExcluir.storage_path) {
        const { error: storageError } =
          await supabase.storage
            .from('pops')
            .remove([
              popParaExcluir.storage_path,
            ]);

        if (storageError) {
          throw storageError;
        }
      }

      const { error } = await supabase
        .from('pops')
        .delete()
        .eq('id', popParaExcluir.id);

      if (error) {
        throw error;
      }

      mostrarMensagemTemporaria(
        'sucesso',
        'Documento excluído com sucesso!',
      );

      setPopParaExcluir(null);

      await carregarPops(false);
    } catch (error) {
      mostrarMensagemTemporaria(
        'erro',
        `Erro ao excluir: ${error.message}`,
      );

      setPopParaExcluir(null);
    }
  };

  const listaPopsMemoizada = useMemo(() => {
    if (carregandoDados) {
      return (
        <tr>
          <td
            colSpan="4"
            className="pops-empty"
          >
            Carregando documentos...
          </td>
        </tr>
      );
    }

    if (pops.length === 0) {
      return (
        <tr>
          <td
            colSpan="4"
            className="pops-empty"
          >
            Nenhum documento cadastrado.
          </td>
        </tr>
      );
    }

    return pops.map((pop) => (
      <tr key={pop.id}>
        <td className="td-title">
          <FiFileText className="file-icon" />

          <span>{pop.titulo}</span>
        </td>

        <td>{pop.setor || 'Geral'}</td>

        <td>
          <span className="badge-tipo">
            {pop.tipo_documento || 'POP'}
          </span>
        </td>

        <td className="td-actions">
          <button
            type="button"
            onClick={() =>
              solicitarExclusao(pop)
            }
            className="btn-delete"
          >
            <FiTrash2 />
            Excluir
          </button>
        </td>
      </tr>
    ));
  }, [
    carregandoDados,
    pops,
    solicitarExclusao,
  ]);

  return (
    <MainLayout>
      <div className="pops-header">
        <h2>Painel Administrativo</h2>

        <p>
          Cadastre novos documentos ou remova registros
          antigos.
        </p>
      </div>

      {mensagem.texto && (
        <div
          className={`alert-box ${mensagem.tipo}`}
          role="alert"
        >
          {mensagem.texto}
        </div>
      )}

      <form
        onSubmit={handleUpload}
        className="admin-form"
      >
        <h3>Adicionar Novo Documento</h3>

        <div className="form-group">
          <label htmlFor="setor-documento">
            Setor / Pasta
          </label>

          <select
            id="setor-documento"
            value={setor}
            onChange={handleSetorChange}
            className="form-select-setor"
            disabled={loading}
            required
          >
            <option value="" disabled>
              Selecione o setor
            </option>

            {SETORES_LISTA.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tipo-documento">
            Tipo de Documento
          </label>

          <select
            id="tipo-documento"
            value={tipoDocumento}
            onChange={handleTipoDocumentoChange}
            className="form-select-setor"
            disabled={loading}
            required
          >
            <option value="" disabled>
              Selecione o tipo de documento
            </option>

            {TIPOS_DOCUMENTO.map((tipo) => (
              <option
                key={tipo}
                value={tipo}
              >
                {tipo}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="codigo-documento">
            Número do Documento
          </label>

          <select
            id="codigo-documento"
            value={codigoSelecionado}
            onChange={(event) => {
              setCodigoSelecionado(
                event.target.value,
              );

              setNomeProcesso('');
            }}
            className="form-select-setor"
            disabled={
              loading ||
              !setor ||
              !tipoDocumento
            }
            required
          >
            <option value="" disabled>
              Selecione a numeração
            </option>

            {numerosDisponiveis.map((numero) => {
              const tiposExistentes =
                obterTiposDoNumero(numero);

              const codigo =
                formatarCodigo(numero);

              return (
                <option
                  key={`existente-${codigo}`}
                  value={codigo}
                >
                  {codigo} - Possui [{tiposExistentes.join(', ')}]                  
                </option>
              );
            })}

            <option value={proximoCodigoNovo}>
              {proximoCodigoNovo} - criar novo procedimento
            </option>
          </select>

          <small className="form-hint">
            Você pode completar uma numeração já
            existente ou criar uma nova linha.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="nome-processo">
            Título do Processo
          </label>

          <div className="titulo-composto">
            <span className="titulo-prefixo">
              {tituloPreview}
            </span>

            <input
              id="nome-processo"
              type="text"
              placeholder="NOME DO PROCESSO"
              value={nomeProcesso}
              onChange={(event) =>
                setNomeProcesso(
                  event.target.value.toUpperCase(),
                )
              }
              disabled={
                loading ||
                !setor ||
                !tipoDocumento ||
                !codigoSelecionado
              }
              maxLength={140}
              autoComplete="off"
              required
            />
          </div>

          <small className="form-hint">
            Documento que será cadastrado:{' '}
            {tituloPreview}
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="arquivo-pdf">
            Arquivo PDF
          </label>

          <input
            ref={inputArquivoRef}
            id="arquivo-pdf"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) =>
              setArquivo(
                event.target.files?.[0] ||
                  null,
              )
            }
            disabled={loading}
            required
          />
        </div>

        <button
          type="submit"
          className="btn-submit"
          disabled={loading}
        >
          <FiUpload />

          {loading
            ? 'Validando e enviando...'
            : 'Publicar Documento'}
        </button>
      </form>

      <div
        className="pops-table-wrapper"
        style={{ marginTop: '30px' }}
      >
        <table className="pops-table">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Setor</th>
              <th>Tipo</th>
              <th className="th-actions">
                Ações
              </th>
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
              Tem certeza de que deseja remover o
              documento{' '}
              <strong>
                "{popParaExcluir.titulo}"
              </strong>
              ? Esta ação não poderá ser desfeita.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() =>
                  setPopParaExcluir(null)
                }
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