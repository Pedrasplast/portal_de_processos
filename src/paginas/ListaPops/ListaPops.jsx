import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  FiFileText,
  FiGitBranch,
  FiMap,
} from 'react-icons/fi';

import { supabase } from '../../Servicos/clienteSupabase';
import MainLayout from '../../componentes/Layout/MainLayout';
import './ListaPops.css';

const SETORES_LISTA = [
  'TODOS',
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
  {
    valor: 'POP',
    nome: 'POP',
    icone: FiFileText,
  },
  {
    valor: 'FLUXOGRAMA',
    nome: 'Fluxograma',
    icone: FiGitBranch,
  },
  {
    valor: 'MAPA VISUAL',
    nome: 'Mapa Visual',
    icone: FiMap,
  },
];

function normalizarTexto(texto = '') {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizarTipoDocumento(tipo = '') {
  const tipoNormalizado = tipo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (tipoNormalizado === 'FLUXOGRAMA') {
    return 'FLUXOGRAMA';
  }

  if (tipoNormalizado === 'MAPA VISUAL') {
    return 'MAPA VISUAL';
  }

  return 'POP';
}

/*
 * POP-01 | PROCESSO PCP
 * Retorna: PROCESSO PCP
 */
function extrairDescricaoDocumento(titulo = '') {
  const tituloAjustado = titulo
    .trim()
    .replace(/\s+/g, ' ');

  const resultado = tituloAjustado.match(
    /^(?:POP|FLUXOGRAMA|MAPA[\s_-]*VISUAL)\s*[-–—_:/]?\s*\d+\s*\|\s*(.+)$/i,
  );

  if (!resultado) {
    return tituloAjustado || 'Sem descrição';
  }

  return resultado[1].trim();
}

/*
 * POP-01 -> 01
 * FLUXOGRAMA-01 -> 01
 * MAPA VISUAL-01 -> 01
 */
function extrairCodigoDocumento(titulo = '') {
  const tituloNormalizado = titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  const resultado = tituloNormalizado.match(
    /\b(?:POP|FLUXOGRAMA|MAPA[\s_-]*VISUAL)\s*[-–—_:/]?\s*(\d+)\b/,
  );

  if (!resultado) {
    return null;
  }

  const numero = Number(resultado[1]);

  if (
    !Number.isInteger(numero) ||
    numero <= 0
  ) {
    return null;
  }

  return String(numero).padStart(2, '0');
}

function ListaPops() {
  const [pops, setPops] = useState([]);

  const [setorSelecionado, setSetorSelecionado] =
    useState('TODOS');

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] = useState('');

  const [arquivoBaixando, setArquivoBaixando] =
    useState(null);

  const carregarPops = useCallback(async () => {
    setCarregando(true);
    setErro('');

    try {
      const { data, error } = await supabase
        .from('pops')
        .select(`
          id,
          titulo,
          setor,
          tipo_documento,
          arquivo_url
        `)
        .order('titulo', {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      setPops(data || []);
    } catch (error) {
      console.error(
        'Erro ao carregar os documentos:',
        error,
      );

      setErro(
        'Não foi possível carregar os documentos.',
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarPops();
  }, [carregarPops]);

  /*
   * Agrupa por setor + número.
   *
   * Exemplo:
   *
   * POP-01
   * FLUXOGRAMA-01
   * MAPA VISUAL-01
   *
   * Os três ficam na mesma linha.
   */
  const processosAgrupados = useMemo(() => {
    const mapaProcessos = new Map();

    pops.forEach((documento) => {
      const tituloOriginal =
        documento.titulo?.trim() || 'Sem título';

      const descricao =
        extrairDescricaoDocumento(
          tituloOriginal,
        );

      const setor =
        documento.setor?.trim() || 'Geral';

      const tipoDocumento =
        normalizarTipoDocumento(
          documento.tipo_documento,
        );

      const codigoDocumento =
        extrairCodigoDocumento(
          tituloOriginal,
        );

      const chave = codigoDocumento
        ? `${normalizarTexto(
          setor,
        )}::${codigoDocumento}`
        : `${normalizarTexto(
          setor,
        )}::sem-codigo::${documento.id}`;

      if (!mapaProcessos.has(chave)) {
        mapaProcessos.set(chave, {
          id: chave,
          codigo: codigoDocumento,
          setor,
          descricoes: {},
          arquivos: {},
        });
      }

      const processo =
        mapaProcessos.get(chave);

      /*
       * Salva uma descrição independente
       * para cada tipo de documento.
       */
      processo.descricoes[tipoDocumento] =
        descricao;

      processo.arquivos[tipoDocumento] = {
        id: documento.id,
        url: documento.arquivo_url,
        tipo: tipoDocumento,
        descricao,
        tituloOriginal,
      };
    });

    return Array.from(
      mapaProcessos.values(),
    ).sort((processoA, processoB) => {
      const comparacaoSetor =
        processoA.setor.localeCompare(
          processoB.setor,
          'pt-BR',
        );

      if (comparacaoSetor !== 0) {
        return comparacaoSetor;
      }

      const codigoA = processoA.codigo
        ? Number(processoA.codigo)
        : Number.MAX_SAFE_INTEGER;

      const codigoB = processoB.codigo
        ? Number(processoB.codigo)
        : Number.MAX_SAFE_INTEGER;

      return codigoA - codigoB;
    });
  }, [pops]);

  const processosFiltrados = useMemo(() => {
    if (setorSelecionado === 'TODOS') {
      return processosAgrupados;
    }

    const setorNormalizado =
      normalizarTexto(setorSelecionado);

    return processosAgrupados.filter(
      (processo) =>
        normalizarTexto(processo.setor) ===
        setorNormalizado,
    );
  }, [
    processosAgrupados,
    setorSelecionado,
  ]);

  async function baixarArquivo(arquivo) {
    if (!arquivo?.url || arquivoBaixando) {
      return;
    }

    setArquivoBaixando(arquivo.id);

    try {
      const resposta = await fetch(
        arquivo.url,
      );

      if (!resposta.ok) {
        throw new Error(
          'Não foi possível baixar o arquivo.',
        );
      }

      const blob = await resposta.blob();

      const urlTemporaria =
        URL.createObjectURL(blob);

      const link =
        document.createElement('a');

      const nomeArquivo =
        `${arquivo.tipo} - ${arquivo.descricao}.pdf`
          .replace(/[\\/:*?"<>|]/g, '-');

      link.href = urlTemporaria;
      link.download = nomeArquivo;

      document.body.appendChild(link);

      link.click();
      link.remove();

      URL.revokeObjectURL(
        urlTemporaria,
      );
    } catch (error) {
      console.error(
        'Erro ao baixar arquivo:',
        error,
      );

      window.open(
        arquivo.url,
        '_blank',
        'noopener,noreferrer',
      );
    } finally {
      setArquivoBaixando(null);
    }
  }

  return (
    <MainLayout>
      <div className="pops-header">
        <h2>
          Repositório de Processos Organizacionais
        </h2>

        <p>
          Consulte e baixe os documentos operacionais
          padronizados por setor.
        </p>
      </div>

      <div className="setores-container">
        {SETORES_LISTA.map((setor) => (
          <button
            key={setor}
            type="button"
            onClick={() =>
              setSetorSelecionado(setor)
            }
            className={`setor-chip ${setorSelecionado === setor
                ? 'active'
                : ''
              }`}
            aria-pressed={
              setorSelecionado === setor
            }
          >
            {setor}
          </button>
        ))}
      </div>

      {erro && (
        <div className="pops-error">
          <span>{erro}</span>

          <button
            type="button"
            onClick={carregarPops}
          >
            Tentar novamente
          </button>
        </div>
      )}

      <div className="pops-table-wrapper">
        <table className="pops-table">
          <thead>
            <tr>
              <th className="th-processo">
                Descrição dos Documentos
              </th>

              <th className="th-setor">
                Setor
              </th>

              <th
                className="th-download"
                colSpan={
                  TIPOS_DOCUMENTO.length
                }
              >
                Download
              </th>
            </tr>
          </thead>

          <tbody>
            {carregando && (
              <tr>
                <td
                  colSpan={
                    TIPOS_DOCUMENTO.length +
                    2
                  }
                  className="pops-empty"
                >
                  Carregando documentos...
                </td>
              </tr>
            )}

            {!carregando &&
              processosFiltrados.length ===
              0 && (
                <tr>
                  <td
                    colSpan={
                      TIPOS_DOCUMENTO.length +
                      2
                    }
                    className="pops-empty"
                  >
                    Nenhum documento encontrado
                    para este setor.
                  </td>
                </tr>
              )}

            {!carregando &&
              processosFiltrados.map(
                (processo) => (
                  <tr key={processo.id}>
                    <td className="td-processo">
                      <div className="descricoes-processo">
                        {TIPOS_DOCUMENTO.map((tipo) => {
                          const descricao =
                            processo.descricoes[tipo.valor];

                          if (!descricao) {
                            return null;
                          }

                          const IconeTipo = tipo.icone;

                          return (
                            <div
                              key={tipo.valor}
                              className="descricao-processo-item"
                            >
                              <IconeTipo
                                className={`descricao-tipo-icone descricao-tipo-${tipo.valor
                                  .toLowerCase()
                                  .replace(/\s+/g, '-')}`}
                                aria-hidden="true"
                              />

                              <span className="descricao-prefixo">
                                {tipo.nome}:
                              </span>

                              <span className="descricao-texto">
                                {descricao}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </td>

                    <td className="td-setor">
                      <span className="badge-setor-tabela">
                        {processo.setor}
                      </span>
                    </td>

                    {TIPOS_DOCUMENTO.map(
                      (tipo) => {
                        const arquivo =
                          processo.arquivos[
                          tipo.valor
                          ];

                        return (
                          <td
                            key={tipo.valor}
                            className="td-download"
                          >
                            {arquivo ? (
                              <button
                                type="button"
                                className="documento-download-link"
                                onClick={() =>
                                  baixarArquivo(
                                    arquivo,
                                  )
                                }
                                disabled={
                                  arquivoBaixando ===
                                  arquivo.id
                                }
                              >
                                {arquivoBaixando ===
                                  arquivo.id
                                  ? 'Baixando...'
                                  : tipo.nome}
                              </button>
                            ) : (
                              <span className="documento-vazio">
                                —
                              </span>
                            )}
                          </td>
                        );
                      },
                    )}
                  </tr>
                ),
              )}
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
}

export default ListaPops;