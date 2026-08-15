import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import SupportPage from './pages/SupportPage';
import LegalPage from './pages/LegalPage';
import ConfirmPage from './pages/ConfirmPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black text-white flex flex-col">
        <Nav />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/legal" element={<LegalPage />} />
            <Route path="/confirm" element={<ConfirmPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
