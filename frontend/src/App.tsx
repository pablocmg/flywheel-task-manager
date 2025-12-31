import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import Dashboard from './pages/Dashboard';
import NodesConfig from './pages/NodesConfig';
import Planning from './pages/Planning';
import Projects from './pages/Projects';
import Execution from './pages/Execution';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="nodes" element={<NodesConfig />} />
          <Route path="planning" element={<Planning />} />
          <Route path="projects" element={<Projects />} />
          <Route path="execution" element={<Execution />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
