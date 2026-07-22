import { memo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiLogOut, FiLogIn } from 'react-icons/fi';

import { supabase } from '../../Servicos/clienteSupabase';
import './Navbar.css';

function processarNomeUsuario(email = '') {
  const parteInicial = email.split('@')[0];

  return parteInicial
    .split(/[._-]+/)
    .filter(Boolean)
    .map(
      (parte) =>
        parte.charAt(0).toUpperCase() +
        parte.slice(1).toLowerCase()
    )
    .join(' ');
}

const Navbar = memo(function Navbar() {
  const [usuario, setUsuario] = useState(null);
  const [processandoLogout, setProcessandoLogout] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    let componenteAtivo = true;
    let recebeuEventoDeAutenticacao = false;

    function atualizarUsuario(session) {
      if (!componenteAtivo) return;

      setUsuario(session?.user ?? null);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      recebeuEventoDeAutenticacao = true;
      atualizarUsuario(session);
    });

    async function carregarSessaoInicial() {
      const { data, error } = await supabase.auth.getSession();

      if (!componenteAtivo || recebeuEventoDeAutenticacao) {
        return;
      }

      if (error) {
        console.error('Erro ao verificar sessão:', error);
        setUsuario(null);
        return;
      }

      atualizarUsuario(data.session);
    }

    void carregarSessaoInicial();

    return () => {
      componenteAtivo = false;
      subscription?.unsubscribe();
    };
  }, []);

  const logado = Boolean(usuario);
  const nomeAdmin = processarNomeUsuario(usuario?.email);

  async function handleAuthAction() {
    if (!logado) {
      navigate('/login');
      return;
    }

    if (processandoLogout) return;

    try {
      setProcessandoLogout(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Erro ao sair do sistema:', error);
      setProcessandoLogout(false);
    }
  }

  const textoBotao = logado
    ? 'Sair do Sistema'
    : 'Fazer Login';

  return (
    <header className="app-navbar">
     <div className="navbar-logo">
        <img
          src="/Logo_Pedrasplast.png"
          alt="Logo"
          className="navbar-logo"
        />
      </div>
      

      <div className="navbar-right">
        {logado && (
          <div className="navbar-user">
            <div className="user-avatar" aria-hidden="true">
              <FiUser size={16} />
            </div>

            <span
              className="user-email-text"
              title={nomeAdmin}
            >
              {nomeAdmin}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleAuthAction}
          disabled={processandoLogout}
          className={`navbar-icon-btn ${
            logado
              ? 'logout-btn-navbar'
              : 'login-btn-navbar'
          }`}
          title={textoBotao}
          aria-label={textoBotao}
        >
          {logado ? (
            <FiLogOut size={18} aria-hidden="true" />
          ) : (
            <FiLogIn size={18} aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
});

export default Navbar;