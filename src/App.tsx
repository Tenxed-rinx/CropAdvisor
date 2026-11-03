/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { SimulatorPage } from './pages/SimulatorPage';
import { SoilAnalysisPage } from './pages/SoilAnalysisPage';
import { CropAdvicePage } from './pages/CropAdvicePage';
import { DataLabPage } from './pages/DataLabPage';
import { AboutPage } from './pages/AboutPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-[#FAF7F0] text-[#1F2A24]">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/simulator" element={<SimulatorPage />} />
              <Route path="/soil-analysis" element={<SoilAnalysisPage />} />
              <Route path="/crop-advice" element={<CropAdvicePage />} />
              <Route path="/data-lab" element={<DataLabPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
