import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Hero from '../components/Hero';
import CountryGrid from '../components/CountryGrid';
import HowItWorks from '../components/HowItWorks';
import Testimonials from '../components/Testimonials';
import Faq from '../components/Faq';
import CtaBanner from '../components/CtaBanner';
import PressStrip from '../components/PressStrip';

export default function Home() {
  return (
    <div>
      <Navbar />
      <Hero />
      <PressStrip />
      <CountryGrid />
      <HowItWorks />
      <Testimonials />
      <Faq />
      <CtaBanner />
      <Footer />
    </div>
  );
}
