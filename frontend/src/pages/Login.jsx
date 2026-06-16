import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AuthCard from '../components/AuthCard';

export default function Login() {
  return (
    <div className="bg-white">
      <Navbar />
      <main className="min-h-screen flex items-center justify-center py-10 pt-24 bg-[hsl(var(--soft-bg))]">
        <div className="max-w-md mx-auto px-5 w-full">
          <AuthCard mode="login" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
