import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../Servicos/clienteSupabase';
import './RotaProtegidaAdmin.css';

function RotaProtegidaAdmin({ children }) {
  const [status, setStatus] = useState('carregando'); // 'carregando', 'liberado', 'redirecionando'
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function validarAdmin(sessionUser) {
      if (!sessionUser) {
        if (isMounted) {
          setStatus('redirecionando');
          navigate('/login', { replace: true });
        }
        return;
      }

      try {
        const { data: perfil, error: perfilError } = await supabase
          .from('profiles')
          .select('regra')
          .eq('id', sessionUser.id)
          .single();

        if (!isMounted) return;

        if (perfilError || !perfil || perfil.regra !== 'admin') {
          setStatus('redirecionando');
          navigate('/login', { replace: true });
        } else {
          setStatus('liberado');
        }
      } catch {
        if (isMounted) {
          setStatus('redirecionando');
          navigate('/login', { replace: true });
        }
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        validarAdmin(session.user);
      } else {
        setStatus('redirecionando');
        navigate('/login', { replace: true });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        validarAdmin(session.user);
      } else {
        setStatus('redirecionando');
        navigate('/login', { replace: true });
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [navigate]);

  if (status === 'carregando' || status === 'redirecionando') {
    return (
      <div className="rota-admin-loading">
        <p>Verificando credenciais administrativas...</p>
      </div>
    );
  }

  return children;
}

export default RotaProtegidaAdmin;