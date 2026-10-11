import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';

export default function NotFound() {
  return (
    <div className="bg-white">
      <Navbar />
      <main className="min-h-[70vh] flex items-center px-4 pt-28 md:pt-36 pb-16 md:pb-24">
        <div className="max-w-xl w-full mx-auto text-center">
          <div>
            <span className="icon-tile h-14 w-14 rounded-2xl">
              <Compass className="w-7 h-7" aria-hidden="true" />
            </span>
          </div>
          <div className="eyebrow mt-6">Error 404</div>
          <h1 className="h-display mt-3">Page not found</h1>
          <p className="lead mt-4">
            The page you're looking for doesn't exist or may have moved.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Button asChild className="btn-accent h-12 px-6 text-[15px]">
              <Link to="/">
                <Home className="w-4 h-4" aria-hidden="true" />
                Go home
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-6 text-[15px]">
              <Link to="/student-visa">
                <Compass className="w-4 h-4" aria-hidden="true" />
                Browse destinations
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
