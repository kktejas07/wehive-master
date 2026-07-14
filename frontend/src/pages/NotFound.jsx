import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';

export default function NotFound() {
  return (
    <div className="bg-white">
      <Navbar />
      <main className="min-h-[70vh] flex items-center justify-center px-5 py-24">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[hsl(var(--blue-50))]">
            <Compass className="w-10 h-10 text-[hsl(var(--blue-700))]" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-[30px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
              404 — Page not found
            </h1>
            <p className="mt-2 text-[hsl(var(--blue-900))]/60">
              The page you're looking for doesn't exist or may have moved.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild className="rounded-full btn-accent text-white h-11 px-6 font-bold gap-2">
              <Link to="/">
                <Home className="w-4 h-4" />
                Go home
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full h-11 px-6 font-bold gap-2">
              <Link to="/student-visa">
                <Compass className="w-4 h-4" />
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
