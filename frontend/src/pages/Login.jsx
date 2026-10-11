import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AuthCard from '../components/AuthCard';

export default function Login() {
  return (
    <div className="bg-white">
      <Navbar />
      <main className="min-h-screen flex items-center justify-center pt-28 pb-16 bg-[hsl(var(--soft-bg))]">
        <div className="max-w-[440px] mx-auto px-4 w-full">
          <AuthCard mode="login" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
