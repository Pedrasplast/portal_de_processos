import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './paginas/Home/Home';
import ListaPops from './paginas/ListaPops/ListaPops';
import GerenciarPops from './paginas/GerenciarPops/GerenciarPops';
import Login from './paginas/Login/Login';
import RotaProtegida from './componentes/RotaProtegida';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pops" element={<ListaPops />} />
        <Route path="/login" element={<Login />} />
        
        {/* Rota protegida: apenas administradores com perfil 'admin' podem acessar */}
        <Route 
          path="/admin/pops" 
          element={
            <RotaProtegida>
              <GerenciarPops />
            </RotaProtegida>
          } 
        />
        
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;