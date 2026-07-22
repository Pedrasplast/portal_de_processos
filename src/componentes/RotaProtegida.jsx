import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../Servicos/clienteSupabase';
import { FiHome } from 'react-icons/fi';
import './RotaProtegida.css';

function RotaProtegida({ children }) {
  const [status, setStatus] = useState('carregando'); // 'carregando', 'liberado', 'bloqueado'
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function validarAcesso(sessionUser) {
      if (!sessionUser) {
        if (isMounted) setStatus('bloqueado');
        return;
      }

      try {
        const { data: perfil, error: perfilError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', sessionUser.id)
          .single();

        if (!isMounted) return;

        if (perfilError || !perfil) {
          setStatus('bloqueado');
        } else {
          setStatus('liberado');
        }
      } catch {
        if (isMounted) setStatus('bloqueado');
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        validarAcesso(session.user);
      } else {
        setStatus('bloqueado');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        validarAcesso(session.user);
      } else {
        setStatus('bloqueado');
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  if (status === 'carregando') {
    return (
      <div className="rota-protegida-loading">
        <p>Verificando credenciais de acesso...</p>
      </div>
    );
  }

  if (status === 'bloqueado') {
    return (
      <div className="rota-protegida-container">
        <div className="rota-protegida-card">
          <h3>Acesso Restrito</h3>
          <p>
            Seu usuário ainda não possui liberação para visualizar os POPs. Por favor, <strong>peça liberação para o administrador</strong> do sistema.
          </p>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="rota-protegida-btn"
          >
            <FiHome size={16} /> Voltar à Página Inicial
          </button>
        </div>
      </div>
    );
  }

  return children;
}

export default RotaProtegida;