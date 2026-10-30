import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { IntroPage } from './pages/IntroPage';
import { AppPage } from './pages/AppPage';
import { HistoryPage } from './pages/HistoryPage';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <Navbar />
        <Routes>
          <Route path="/" element={<IntroPage />} />
          <Route path="/app" element={<AppPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  );
}

export default App;
