import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Home, MapPin, DollarSign, Users, Wifi, Bath,
  ChevronRight, Loader2, Star, Shield, Calendar,
  Building2, Utensils, Dumbbell, Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SAMPLE_LISTINGS = [
  { id: 'h1', name: 'Student Housing International Dorm', type: 'Dormitory', city: 'Boston', country: 'us', monthly_rent: 1200, deposit: 1200, distance_km: 1.2, rating: 4.2, shared: true, furnished: true, bills_included: true, amenities: ['WiFi', 'Laundry', 'Kitchen', 'Study Room'], available_from: 'Aug 2026' },
  { id: 'h2', name: 'University Halls - City Campus', type: 'University Halls', city: 'London', country: 'uk', monthly_rent: 950, deposit: 950, distance_km: 0.5, rating: 4.5, shared: false, furnished: true, bills_included: true, amenities: ['WiFi', 'Gym', 'Common Room', 'Laundry'], available_from: 'Sep 2026' },
  { id: 'h3', name: 'Shared Apartment near Campus', type: 'Shared Apartment', city: 'Munich', country: 'de', monthly_rent: 650, deposit: 1300, distance_km: 0.8, rating: 4.0, shared: true, furnished: true, bills_included: false, amenities: ['WiFi', 'Kitchen', 'Balcony'], available_from: 'Oct 2026' },
  { id: 'h4', name: 'Studio Apartment - Private', type: 'Studio', city: 'Milan', country: 'it', monthly_rent: 800, deposit: 1600, distance_km: 1.5, rating: 4.3, shared: false, furnished: true, bills_included: true, amenities: ['WiFi', 'AC', 'Kitchenette', 'Laundry'], available_from: 'Sep 2026' },
  { id: 'h5', name: 'Student Residence - Premium', type: 'Residence', city: 'Vienna', country: 'at', monthly_rent: 550, deposit: 550, distance_km: 2.0, rating: 4.1, shared: false, furnished: true, bills_included: true, amenities: ['WiFi', 'Gym', 'Study Room', 'Cafeteria', 'Laundry'], available_from: 'Oct 2026' },
  { id: 'h6', name: 'Affordable Shared House', type: 'Shared House', city: 'Warsaw', country: 'pl', monthly_rent: 350, deposit: 700, distance_km: 3.0, rating: 3.8, shared: true, furnished: true, bills_included: false, amenities: ['WiFi', 'Kitchen', 'Garden'], available_from: 'Oct 2026' },
];

export default function StudentHousing({ country, compact = false }) {
  const [maxRent, setMaxRent] = useState(1500);
  const [shared, setShared] = useState('any');
  const [search, setSearch] = useState('');

  const listings = SAMPLE_LISTINGS
    .filter(l => !country || l.country === country)
    .filter(l => l.monthly_rent <= maxRent)
    .filter(l => shared === 'any' || (shared === 'private' && !l.shared) || (shared === 'shared' && l.shared))
    .filter(l => !search || l.city.toLowerCase().includes(search.toLowerCase()) || l.name.toLowerCase().includes(search.toLowerCase()));

  if (compact) {
    return (
      <div className="rounded-2xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-100))] p-5">
        <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-2">
          <Home className="w-3.5 h-3.5" /> Student Housing
        </div>
        <p className="text-[13px] text-muted-foreground mb-3">
          Find student accommodation near your university.
        </p>
        <Link to="/account?tab=housing" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-800))] min-h-[44px]">
          Search housing <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-2xl bg-white border border-[hsl(var(--border))] p-6 sm:p-8"
    >
      <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-1">
        <Home className="w-3.5 h-3.5" /> Student Housing
      </div>
      <h2 className="font-display font-bold text-[24px] text-[hsl(var(--blue-900))] mb-2 leading-tight">
        Find accommodation
      </h2>
      <p className="text-[14px] text-muted-foreground mb-6">
        Student housing options near your university. Prices in USD/month.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div>
          <label htmlFor="studenthousing-max-rent" className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground block mb-1">Max Rent</label>
          <div className="flex items-center gap-2">
            <input id="studenthousing-max-rent"
              type="range"
              min="200"
              max="2500"
              step="50"
              value={maxRent}
              onChange={(e) => setMaxRent(parseInt(e.target.value))}
              className="flex-1 accent-[hsl(var(--blue-700))]"
            />
            <span className="text-[13px] font-bold text-[hsl(var(--blue-900))] shrink-0 w-16">${maxRent}</span>
          </div>
        </div>
        <div>
          <label id="studenthousing-type" className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground block mb-1">Type</label>
          <div role="group" aria-labelledby="studenthousing-type" className="inline-flex rounded-full bg-[hsl(var(--soft-bg))] p-1">
            {[
              { id: 'any', label: 'Any' },
              { id: 'shared', label: 'Shared' },
              { id: 'private', label: 'Private' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setShared(t.id)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition ${
                  shared === t.id ? 'bg-white text-[hsl(var(--blue-900))] shadow-sm' : 'text-muted-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="studenthousing-search" className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground block mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input id="studenthousing-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="City or property name..."
              className="w-full h-11 rounded-xl border border-[hsl(var(--border))] focus:border-[hsl(var(--blue-700))] outline-none pl-10 pr-4 text-[14px] text-[hsl(var(--blue-900))]"
            />
          </div>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[hsl(var(--border))] p-8 text-center">
          <Home className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="mt-3 text-[14px] text-muted-foreground">No listings match your filters.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-[hsl(var(--border))] bg-white hover:border-[hsl(var(--blue-200))] hover:shadow-md transition overflow-hidden"
            >
              <div className="bg-[hsl(var(--blue-50))] border-b border-[hsl(var(--border))] p-5 text-center">
                <div className="text-[hsl(var(--blue-700))] text-2xl font-bold">{l.type?.charAt(0) || 'H'}</div>
                <div className="mt-2 text-[hsl(var(--blue-900))] font-bold text-[13px]">{l.type}</div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-[14px] text-[hsl(var(--blue-900))] truncate">{l.name}</h3>
                    <div className="text-[12px] text-muted-foreground inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {l.city} · {l.distance_km}km
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[12px] font-bold text-amber-600 shrink-0">
                    <Star className="w-3 h-3 fill-current" /> {l.rating}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="text-[20px] font-display font-bold text-[hsl(var(--blue-900))]">
                      ${l.monthly_rent}
                    </div>
                    <div className="text-[12px] text-muted-foreground">/month</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-bold text-[hsl(var(--blue-900))]">${l.deposit} deposit</div>
                    <div className="text-[12px] text-muted-foreground">Available {l.available_from}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {l.amenities.slice(0, 4).map(a => (
                    <span key={a} className="text-[12px] px-2 py-0.5 rounded-full bg-[hsl(var(--soft-bg))] text-muted-foreground font-medium">
                      {a}
                    </span>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-[hsl(var(--border))] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    {l.shared ? 'Shared' : 'Private'}
                    {l.furnished && ' · Furnished'}
                    {l.bills_included && ' · Bills included'}
                  </div>
                  <button className="inline-flex items-center gap-1 text-[12px] font-bold text-[hsl(var(--blue-700))] hover:underline">
                    Details <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
