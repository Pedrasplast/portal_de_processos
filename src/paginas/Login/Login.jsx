import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../Servicos/clienteSupabase';
import './Login.css';
import { FiArrowLeft } from 'react-icons/fi';

function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Controla se o componente está montado para evitar vazamentos de memória e setState após desmontagem
  useEffect(() => {
    let isMounted = true;
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) throw error;

      // Após logar com sucesso, redireciona direto para o painel admin
      navigate('/admin/pops');
    } catch (err) {
      setErro('E-mail ou senha inválidos. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  }, [email, senha, navigate]);

  const irParaHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <div className="login-container">
      <form onSubmit={handleLogin} className="login-box">
        <h2>Painel Administrativo</h2>
        <p>Faça login para gerenciar os POPs</p>

        {erro && <div className="login-error">{erro}</div>}

        <div className="input-group">
          <label>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu-email@dominio.com"
            required
          />
        </div>

        <div className="input-group">
          <label>Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" className="login-button" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar no Sistema'}
        </button>

        <button 
          type="button" 
          onClick={irParaHome} 
          className="back-home-button"
        >
          <FiArrowLeft size={16} /> Página Inicial
        </button>
      </form>
    </div>
  );
}

export default Login;