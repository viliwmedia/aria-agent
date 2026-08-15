import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const links = [
  { label: 'Home', to: '/' },
  { label: 'Support', to: '/support' },
  { label: 'Privacy & Terms', to: '/legal' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Close mobile menu and scroll to top on route change
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/95 backdrop-blur-md shadow-lg shadow-black/50' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src="/images/logo_s-removebg-preview.png"
            alt="Streak"
            className="h-12 w-auto object-contain"
          />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className={`text-sm font-medium tracking-wide transition-colors duration-200 ${
                pathname === to
                  ? 'text-white border-b border-white pb-0.5'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-white p-1"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-black/98 border-t border-white/10 px-6 py-4 flex flex-col gap-4">
          {links.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className={`text-left text-sm font-medium tracking-wide transition-colors duration-200 ${
                pathname === to ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
