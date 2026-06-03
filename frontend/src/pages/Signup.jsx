import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AuthCard from '../components/AuthCard';

export default function Signup() {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');

  return (
    <div className="bg-white">
      <Navbar />
      <main className="min-h-[calc(100vh-72px)] pt-32 pb-20 bg-[hsl(var(--soft-bg))]">
        <div className="max-w-md mx-auto px-5">
          <AuthCard mode="signup" referralCode={ref} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
