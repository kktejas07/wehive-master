import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Loader2, FileText, ChevronRight, AlertTriangle } from 'lucide-react';
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
import HowItWorks from '../components/HowItWorks';
import ETATracker from '../components/visa/ETATracker';
import CategorySuggestions from '../components/visa/CategorySuggestions';

export default function VisaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthed } = useAuth();
  const [country, setCountry] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [type, setType] = useState('Tourist');
  const [applicants, setApplicants] = useState(1);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    setCountry(null);
    setNotFound(false);
    setLoadError(false);
    axios
      .get(`${API}/countries/${id}`)
      .then((r) => {
        if (!mounted) return;
        setCountry(r.data);
        const types = Object.keys(r.data.categories || {});
        if (types.length) setType(types[0]);
      })
      .catch((e) => {
        if (!mounted) return;
        setCountry(null);
        if (e?.response?.status === 404) setNotFound(true);
        else setLoadError(true);
      });
    return () => {
      mounted = false;
    };
  }, [id, reloadKey]);

  if (loadError) {
    return (
      <div className="bg-white">
        <Navbar />
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-5 text-center">
          <AlertTriangle className="w-10 h-10 text-[hsl(var(--blue-700))]" />
          <h1 className="font-display font-bold text-[24px] text-[hsl(var(--blue-900))] leading-tight">
            Something went wrong loading this page
          </h1>
          <p className="text-muted-foreground max-w-md">
            Please check your connection and try again.
          </p>
          <Button onClick={() => setReloadKey((k) => k + 1)} className="rounded-xl btn-accent text-white h-11 px-6 font-bold">
            Try again
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="bg-white">
        <Navbar />
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-5 text-center">
          <AlertTriangle className="w-10 h-10 text-[hsl(var(--blue-700))]" />
          <h1 className="font-display font-bold text-[24px] text-[hsl(var(--blue-900))] leading-tight">
            We couldn't find that visa page
          </h1>
          <p className="text-muted-foreground max-w-md">
            "{id}" isn't a destination we recognize. Try browsing our full list of destinations instead.
          </p>
          <Button onClick={() => navigate('/student-visa')} className="rounded-xl btn-accent text-white h-11 px-6 font-bold">
            Browse destinations
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

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
      navigate(`/signup?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    setReviewOpen(true);
  };

  return (
    <div className="bg-white">
      <Navbar />

      <section className="relative pt-28 bg-[hsl(var(--soft-bg))] border-b border-[hsl(var(--border))]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pb-16">
          <VisaBreadcrumb countryName={country.name} />
          <div className="mt-8 flex justify-start">
            <CategoryTabs categories={country.categories} value={type} onChange={setType} />
          </div>
          <div className="mt-8">
            {cat && <CategoryDetails cat={cat} country={country} onApply={onApply} typeId={type} applicants={applicants} />}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))]">
              <FileText className="w-3.5 h-3.5" /> Required for {type}
            </div>
            <h2 className="mt-2 font-display font-bold text-[28px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-tight">
              Documents you will need
            </h2>
            {cat && <DocsList docs={cat.documents} />}
            <div className="mt-8">
              <Button
                onClick={onApply}
                variant="outline"
                className="rounded-xl bg-white border border-[hsl(var(--border))] text-[hsl(var(--blue-900))] hover:bg-white hover:border-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-700))] h-12 px-5 font-semibold"
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
