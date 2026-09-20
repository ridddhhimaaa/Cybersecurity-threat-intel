import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DrawerProvider } from './context/DrawerContext';
import { Layout } from './components/layout/Layout';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { Vulnerabilities } from './pages/Vulnerabilities';
import { CVEDetail } from './pages/CVEDetail';
import { Analytics } from './pages/Analytics';
import { CWEIntelligence } from './pages/CWEIntelligence';
import { RiskML } from './pages/RiskML';
import { CVSSAnalysis } from './pages/CVSSAnalysis';

export function App() {
  return (
    <DrawerProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing / Cyber Defense Command Center */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />

          {/* Analytical Intelligence Dashboard & Workspaces */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/vulnerabilities" element={<Vulnerabilities />} />
            <Route path="/vulnerabilities/:id" element={<CVEDetail />} />
            <Route path="/cves/:id" element={<CVEDetail />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/cwe" element={<CWEIntelligence />} />
            <Route path="/risk-ml" element={<RiskML />} />
            <Route path="/cvss" element={<CVSSAnalysis />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DrawerProvider>
  );
}

export default App;
