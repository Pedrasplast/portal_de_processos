import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../Servicos/clienteSupabase';

function RotaProtegida({ children }) {
  const [status, setStatus] = useState('carregando'); // 'carregando', 'liberado', 'bloqueado'

  useEffect(() => {
    let isMounted = true;

    async function validarAcesso(sessionUser) {
      if (!sessionUser) {
        if (isMounted) setStatus('bloqueado');
        return;
      }

      try {
        // Seleciona apenas a coluna 'regra' para otimizar a query no Supabase
        const { data: perfil, error: perfilError } = await supabase
          .from('profiles')
          .select('regra')
          .eq('id', sessionUser.id)
          .single();

        if (!isMounted) return;

        if (perfilError || !perfil || perfil.regra !== 'admin') {
          setStatus('bloqueado');
        } else {
          setStatus('liberado');
        }
      } catch {
        if (isMounted) setStatus('bloqueado');
      }
    }

    // 1. Verificação inicial rápida da sessão
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        validarAcesso(session.user);
      } else {
        setStatus('bloqueado');
      }
    });

    // 2. Ouve alterações de autenticação em tempo real
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <p>Verificando credenciais de acesso...</p>
      </div>
    );
  }

  if (status === 'bloqueado') {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default RotaProtegida;