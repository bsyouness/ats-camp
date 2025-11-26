import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-playa-surface border-t border-playa-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-neon-orange to-neon-purple bg-clip-text text-transparent mb-4">
              ATS Camp
            </h3>
            <p className="text-gray-400 text-sm">
              Building community, one burn at a time.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/about" className="text-gray-400 hover:text-white text-sm transition-colors">
                About Us
              </Link>
              <Link to="/info" className="text-gray-400 hover:text-white text-sm transition-colors">
                Useful Info
              </Link>
              <Link to="/contact" className="text-gray-400 hover:text-white text-sm transition-colors">
                Contact
              </Link>
              <Link to="/join-whatsapp" className="text-gray-400 hover:text-white text-sm transition-colors">
                Join WhatsApp
              </Link>
            </nav>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Resources</h4>
            <nav className="flex flex-col gap-2">
              <a
                href="https://burningman.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Burning Man Official
              </a>
              <a
                href="https://iburn.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                iBurn App
              </a>
              <Link to="/report" className="text-gray-400 hover:text-white text-sm transition-colors">
                Report an Issue
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-playa-border text-center text-gray-500 text-sm">
          <p>&copy; {currentYear} ATS Camp. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
