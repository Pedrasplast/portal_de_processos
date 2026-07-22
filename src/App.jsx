import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './paginas/Home/Home';
import ListaPops from './paginas/ListaPops/ListaPops';
import GerenciarPops from './paginas/GerenciarPops/GerenciarPops';
import Login from './paginas/Login/Login';
import RotaProtegida from './componentes/RotaProtegida';
import RotaProtegidaAdmin from './componentes/RotaProtegidaAdmin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* Rota comum: se não estiver cadastrado, mostra aviso para pedir liberação */}
        <Route 
          path="/pops" 
          element={
            <RotaProtegida>
              <ListaPops />
            </RotaProtegida>
          } 
        />

        <Route path="/login" element={<Login />} />
        
        {/* Rota administrativa: se não for admin, redireciona para o login */}
        <Route 
          path="/admin/pops" 
          element={
            <RotaProtegidaAdmin>
              <GerenciarPops />
            </RotaProtegidaAdmin>
          } 
        />
        
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;