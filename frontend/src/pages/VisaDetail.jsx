import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2, FileText, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { useAuth, API } from '../context/AuthContext';
import { COUNTRIES } from '../data/mock';
import VisaPricingCard from '../components/visa/VisaPricingCard';
import FlightSuggestions from '../components/FlightSuggestions';
import ApplicationReviewModal from '../components/ApplicationReviewModal';
import VisaBreadcrumb from '../components/visa/VisaBreadcrumb';
import CategoryTabs from '../components/visa/CategoryTabs';
import CategoryDetails from '../components/visa/CategoryDetails';
import DocsList from '../components/visa/DocsList';
import AssistCard from '../components/visa/AssistCard';
import VisaFaqSection from '../components/visa/VisaFaqSection';
import OtherCountries from '../components/visa/OtherCountries';
import VisaComparison from '../components/visa/VisaComparison';
import AppointmentMonitor from '../components/visa/AppointmentMonitor';
import GuidedFormSection from '../components/visa/GuidedFormSection';
import InterviewPrep from '../components/visa/InterviewPrep';
import EligibilityChecker from '../components/visa/EligibilityChecker';
import TrustFeatures from '../components/visa/TrustFeatures';
import OnTimeGuarantee from '../components/OnTimeGuarantee';
import HowItWorks from '../components/HowItWorks';
import ETATracker from '../components/visa/ETATracker';
import CategorySuggestions from '../components/visa/CategorySuggestions';

export default function VisaDetail() {
  const { id } = useParams();
  const { isAuthed, openAuth } = useAuth();
  const [country, setCountry] = useState(null);
  const [type, setType] = useState('Tourist');
  const [applicants, setApplicants] = useState(1);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    axios
      .get(`${API}/countries/${id}`)
      .then((r) => {
        if (!mounted) return;
        setCountry(r.data);
        const types = Object.keys(r.data.categories || {});
        if (types.length) setType(types[0]);
      })
      .catch(() => mounted && setCountry(null));
    return () => {
      mounted = false;
    };
  }, [id]);

  if (!country) {
    return (
      <div className="bg-white">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" />
        </div>
        <Footer />
      </div>
    );
  }

  const cat = country.categories?.[type];
  const others = COUNTRIES.filter((c) => c.id !== country.id).slice(0, 4);

  const onApply = () => {
    if (!isAuthed) {
      openAuth('signup');
      return;
    }
    setReviewOpen(true);
  };

  const applying = false;

  return (
    <div className="bg-white">
      <Navbar />

      <section className="relative pt-28 bg-[hsl(var(--soft-bg))] border-b border-black/5 aurora-bg aurora-grain">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pb-16">
          <VisaBreadcrumb countryName={country.name} />
          <div className="mt-8 flex justify-start">
            <CategoryTabs categories={country.categories} value={type} onChange={setType} />
          </div>
          <div className="mt-8">
            {cat && <CategoryDetails cat={cat} country={country} onApply={onApply} applying={applying} typeId={type} applicants={applicants} />}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
              <FileText className="w-3.5 h-3.5" /> Required for {type}
            </div>
            <h2 className="mt-2 font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
              Documents you will need
            </h2>
            {cat && <DocsList docs={cat.documents} />}
            <div className="mt-8">
              <Button
                onClick={onApply}
                disabled={applying}
                className="rounded-full btn-accent text-white h-12 px-6 font-bold"
              >
                Begin {type.toLowerCase()} application
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
          <aside className="lg:col-span-5 space-y-6">
            {cat && (
              <VisaPricingCard
                category={cat}
                country={country}
                visaType={type}
                onApply={onApply}
                onApplicantsChange={setApplicants}
              />
            )}
            <AssistCard />
          </aside>
        </div>
      </section>

      <ETATracker country={country} />
      <TrustFeatures countryName={country.name} />
      <OnTimeGuarantee />
      <HowItWorks />
      <VisaFaqSection countryName={country.name} />
      <VisaComparison countryName={country.name} />
      <AppointmentMonitor countryName={country.name} />
      <GuidedFormSection countryName={country.name} />
      <InterviewPrep countryName={country.name} />
      <EligibilityChecker countryName={country.name} />
      <FlightSuggestions country={country} />
      <CategorySuggestions currentId={country.id} />
      <OtherCountries list={others} />
      <Footer />

      <ApplicationReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        country={country}
        category={cat}
        visaType={type}
        applicants={applicants}
      />
    </div>
  );
}
