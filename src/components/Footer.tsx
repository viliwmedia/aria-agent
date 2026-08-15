import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <img src="/images/logo_s-removebg-preview.png" alt="Streak" className="h-7 w-auto object-contain mb-3" />
            <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
              Your partner in breaking free from gambling — one day at a time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-8 text-sm">
            <div className="flex flex-col gap-2">
              <span className="text-white font-semibold tracking-wide uppercase text-xs mb-1">Company</span>
              <Link to="/" className="text-gray-400 hover:text-white transition-colors">About Us</Link>
              <Link to="/support" className="text-gray-400 hover:text-white transition-colors">Support</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-white font-semibold tracking-wide uppercase text-xs mb-1">Legal</span>
              <Link to="/legal" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/legal" className="text-gray-400 hover:text-white transition-colors">Terms & Conditions</Link>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-600 text-xs">© {new Date().getFullYear()} Streak. All rights reserved.</p>
          <p className="text-gray-600 text-xs">Made with purpose.</p>
        </div>
      </div>
    </footer>
  );
}
