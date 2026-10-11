import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plane, Bus, Car, Hotel, Phone, Clock } from 'lucide-react';
import Reveal from './Reveal';
import { BRAND } from '../data/mock';

const CATEGORIES = [
  { id: 'flights', label: 'Flights', icon: Plane },
  { id: 'hotels', label: 'Hotels', icon: Hotel },
  { id: 'buses', label: 'Buses', icon: Bus },
  { id: 'cars', label: 'Car Rentals', icon: Car },
];

const DEALS = {
  flights: [
    { id: 'f1', from: 'BLR', to: 'DXB', price: 12499, original: 18999, airline: 'IndiGo', time: '8h 15m', stops: 'Non-stop', departure: '06:45', arrival: '10:00', rating: 4.5, seats: 7 },
    { id: 'f2', from: 'DEL', to: 'SIN', price: 15499, original: 22999, airline: 'Air India', time: '5h 30m', stops: 'Non-stop', departure: '22:30', arrival: '04:00+1', rating: 4.2, seats: 3 },
    { id: 'f3', from: 'BOM', to: 'LHR', price: 42999, original: 64999, airline: 'British Airways', time: '9h 20m', stops: 'Non-stop', departure: '01:15', arrival: '06:35', rating: 4.7, seats: 5 },
    { id: 'f4', from: 'BLR', to: 'KUL', price: 8999, original: 13999, airline: 'AirAsia', time: '4h 30m', stops: 'Non-stop', departure: '14:20', arrival: '18:50', rating: 4.1, seats: 12 },
    { id: 'f5', from: 'MAA', to: 'DOH', price: 11299, original: 16999, airline: 'Qatar Airways', time: '4h 45m', stops: 'Non-stop', departure: '03:30', arrival: '08:15', rating: 4.6, seats: 8 },
    { id: 'f6', from: 'CCU', to: 'BKK', price: 10999, original: 15999, airline: 'Thai Airways', time: '2h 45m', stops: 'Non-stop', departure: '17:00', arrival: '19:45', rating: 4.3, seats: 4 },
    { id: 'f7', from: 'DEL', to: 'JFK', price: 74999, original: 112999, airline: 'Emirates', time: '15h 30m', stops: '1 stop', departure: '04:30', arrival: '08:00', rating: 4.8, seats: 2 },
    { id: 'f8', from: 'BLR', to: 'AUH', price: 13499, original: 19999, airline: 'Etihad', time: '3h 50m', stops: 'Non-stop', departure: '21:15', arrival: '01:05+1', rating: 4.4, seats: 6 },
  ],
  buses: [
    { id: 'b1', from: 'Bangalore', to: 'Hyderabad', price: 799, original: 1200, operator: 'RedBus', type: 'AC Sleeper', departure: '22:30', arrival: '06:30', rating: 4.3, seats: 15 },
    { id: 'b2', from: 'Mumbai', to: 'Pune', price: 449, original: 699, operator: 'Neeta Tours', type: 'AC Seater', departure: '08:00', arrival: '12:00', rating: 4.5, seats: 8 },
    { id: 'b3', from: 'Chennai', to: 'Bangalore', price: 549, original: 899, operator: 'VRL Travels', type: 'AC Sleeper', departure: '21:00', arrival: '04:30', rating: 4.1, seats: 22 },
    { id: 'b4', from: 'Delhi', to: 'Jaipur', price: 599, original: 950, operator: 'Rajasthan', type: 'AC Seater', departure: '07:30', arrival: '13:00', rating: 4.4, seats: 11 },
    { id: 'b5', from: 'Hyderabad', to: 'Goa', price: 1199, original: 1799, operator: 'Gowthami', type: 'AC Sleeper', departure: '18:00', arrival: '08:00+1', rating: 4.2, seats: 5 },
    { id: 'b6', from: 'Kolkata', to: 'Bhubaneswar', price: 699, original: 1099, operator: 'Bengal', type: 'AC Seater', departure: '20:00', arrival: '06:00', rating: 4.0, seats: 18 },
  ],
  cars: [
    { id: 'c1', company: 'Zoomcar', location: 'Bangalore Airport', price: 1299, original: 1899, vehicle: 'Swift Dzire', type: 'Self Drive', rating: 4.4, seats: 5, fuel: 'Petrol', fuelType: ' Petrol' },
    { id: 'c2', company: 'Revv', location: 'Mumbai City', price: 1599, original: 2299, vehicle: 'Honda City', type: 'Self Drive', rating: 4.6, seats: 5, fuel: 'Petrol', fuelType: ' Petrol' },
    { id: 'c3', company: 'MyChoize', location: 'Delhi NCR', price: 1799, original: 2599, vehicle: 'Creta', type: 'Self Drive', rating: 4.3, seats: 5, fuel: 'Petrol', fuelType: ' Petrol' },
    { id: 'c4', company: 'Drivezy', location: 'Goa', price: 1999, original: 2899, vehicle: 'Thar', type: 'Self Drive', rating: 4.7, seats: 4, fuel: 'Diesel', fuelType: ' Diesel' },
    { id: 'c5', company: 'Carrent', location: 'Hyderabad', price: 1099, original: 1599, vehicle: 'WagonR', type: 'Self Drive', rating: 4.1, seats: 4, fuel: 'Petrol', fuelType: ' Petrol' },
    { id: 'c6', company: 'EcoRent', location: 'Chennai', price: 1399, original: 1999, vehicle: 'Baleno', type: 'Self Drive', rating: 4.5, seats: 5, fuel: 'Petrol', fuelType: ' Petrol' },
  ],
  hotels: [
    { id: 'h1', name: 'Taj Palace', location: 'New Delhi', price: 6499, original: 8999, rating: 4.8, rooms: 'Deluxe King', amenities: 'Pool, Spa, WiFi', category: 'Luxury' },
    { id: 'h2', name: 'Marriott Suites', location: 'Bangalore', price: 5299, original: 7499, rating: 4.6, rooms: 'Executive Suite', amenities: 'Gym, WiFi, Breakfast', category: 'Premium' },
    { id: 'h3', name: 'Hyatt Regency', location: 'Mumbai', price: 4799, original: 6999, rating: 4.5, rooms: 'King Room', amenities: 'Pool, WiFi, Parking', category: 'Premium' },
    { id: 'h4', name: 'Holiday Inn', location: 'Chennai', price: 3299, original: 4599, rating: 4.3, rooms: 'Standard Double', amenities: 'WiFi, Breakfast, Parking', category: 'Business' },
    { id: 'h5', name: 'ITC Grand Chola', location: 'Chennai', price: 7999, original: 10999, rating: 4.9, rooms: 'Towers Room', amenities: 'Pool, Spa, Restaurant', category: 'Luxury' },
    { id: 'h6', name: 'Lemon Tree Premier', location: 'Goa', price: 2999, original: 4299, rating: 4.2, rooms: 'Superior Room', amenities: 'Pool, WiFi, Bar', category: 'Standard' },
  ],
};

function DealCard({ deal, category, onCall }) {
  const discount = Math.round((1 - deal.price / deal.original) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="relative flex-shrink-0 w-[260px] sm:w-[290px] h-full rounded-2xl bg-white border border-[hsl(var(--border))] shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group"
    >
      <div className="p-5">
        <div className="mb-3 h-6 flex items-center">
          {discount >= 20 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] text-[12px] font-semibold">
              Save {discount}%
            </span>
          )}
        </div>
        {category === 'flights' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[18px] font-semibold text-[hsl(var(--blue-900))]">{deal.from} → {deal.to}</span>
              </div>
              <span className="text-[12px] text-muted-foreground font-medium">{deal.airline}</span>
            </div>
            <div className="flex items-center gap-4 text-[12px] text-muted-foreground mb-3">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {deal.time}</span>
              <span>{deal.stops}</span>
              <span className="text-[hsl(var(--blue-900))] font-semibold">{deal.seats} seats left</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[12px] text-muted-foreground line-through">₹{deal.original.toLocaleString('en-IN')}</span>
                <div className="text-[20px] font-display font-bold text-[hsl(var(--blue-900))]">₹{deal.price.toLocaleString('en-IN')}</div>
              </div>
              <a href={`tel:${BRAND.phoneRaw}`} onClick={(e) => e.stopPropagation()} className="inline-flex min-h-[40px] items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[hsl(var(--border))] bg-white text-[hsl(var(--blue-700))] text-[13px] font-semibold hover:bg-[hsl(var(--blue-50))] hover:border-[hsl(var(--blue-700))]/30 transition-colors">
                <Phone className="w-3.5 h-3.5" aria-hidden="true" /> Call
              </a>
            </div>
          </>
        )}

        {category === 'buses' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[16px] font-semibold text-[hsl(var(--blue-900))]">{deal.from} → {deal.to}</span>
              <span className="text-[12px] text-muted-foreground font-medium">{deal.operator}</span>
            </div>
            <div className="text-[12px] text-muted-foreground mb-2">{deal.type} · {deal.departure} → {deal.arrival}</div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[12px] text-muted-foreground line-through">₹{deal.original.toLocaleString('en-IN')}</span>
                <div className="text-[20px] font-display font-bold text-[hsl(var(--blue-900))]">₹{deal.price.toLocaleString('en-IN')}</div>
              </div>
              <a href={`tel:${BRAND.phoneRaw}`} onClick={(e) => e.stopPropagation()} className="inline-flex min-h-[40px] items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[hsl(var(--border))] bg-white text-[hsl(var(--blue-700))] text-[13px] font-semibold hover:bg-[hsl(var(--blue-50))] hover:border-[hsl(var(--blue-700))]/30 transition-colors">
                <Phone className="w-3.5 h-3.5" aria-hidden="true" /> Call
              </a>
            </div>
          </>
        )}

        {category === 'cars' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[16px] font-semibold text-[hsl(var(--blue-900))]">{deal.company}</span>
              <span className="text-[12px] text-muted-foreground font-medium">{deal.location}</span>
            </div>
            <div className="text-[12px] text-muted-foreground mb-2">{deal.vehicle} · {deal.type} · {deal.seats} Seats{deal.fuelType}</div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[12px] text-muted-foreground line-through">₹{deal.original.toLocaleString('en-IN')}/day</span>
                <div className="text-[20px] font-display font-bold text-[hsl(var(--blue-900))]">₹{deal.price.toLocaleString('en-IN')}<span className="text-[12px] font-normal text-muted-foreground">/day</span></div>
              </div>
              <a href={`tel:${BRAND.phoneRaw}`} onClick={(e) => e.stopPropagation()} className="inline-flex min-h-[40px] items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[hsl(var(--border))] bg-white text-[hsl(var(--blue-700))] text-[13px] font-semibold hover:bg-[hsl(var(--blue-50))] hover:border-[hsl(var(--blue-700))]/30 transition-colors">
                <Phone className="w-3.5 h-3.5" aria-hidden="true" /> Call
              </a>
            </div>
          </>
        )}

        {category === 'hotels' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[16px] font-semibold text-[hsl(var(--blue-900))]">{deal.name}</span>
              <span className="text-[12px] text-muted-foreground font-medium">{deal.category}</span>
            </div>
            <div className="text-[12px] text-muted-foreground mb-2">{deal.location} · {deal.rooms}</div>
            <div className="text-[12px] text-muted-foreground mb-2">{deal.amenities}</div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[12px] text-muted-foreground line-through">₹{deal.original.toLocaleString('en-IN')}/night</span>
                <div className="text-[20px] font-display font-bold text-[hsl(var(--blue-900))]">₹{deal.price.toLocaleString('en-IN')}<span className="text-[12px] font-normal text-muted-foreground">/night</span></div>
              </div>
              <a href={`tel:${BRAND.phoneRaw}`} onClick={(e) => e.stopPropagation()} className="inline-flex min-h-[40px] items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[hsl(var(--border))] bg-white text-[hsl(var(--blue-700))] text-[13px] font-semibold hover:bg-[hsl(var(--blue-50))] hover:border-[hsl(var(--blue-700))]/30 transition-colors">
                <Phone className="w-3.5 h-3.5" aria-hidden="true" /> Call
              </a>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function CategorySection({ category, deals }) {
  const Icon = category.icon;

  return (
    <div className="py-6 sm:py-8">
      <div className="px-4 sm:px-6 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))]">
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="text-[18px] sm:text-[20px] font-display font-semibold text-[hsl(var(--blue-900))]">{category.label}</h3>
          <span className="ml-auto text-[12px] text-muted-foreground font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" /> Live deals
          </span>
        </div>
      </div>

      <div className="px-4 sm:px-6">
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
          {deals.map((deal, i) => (
            <div key={deal.id} className="snap-start">
              <DealCard
                deal={deal}
                category={category.id}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DealsSection() {
  const [activeTab, setActiveTab] = useState('flights');

  return (
    <section className="relative py-16 md:py-24 bg-[hsl(var(--soft-bg))] border-y border-[hsl(var(--border))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-8">
          <div className="text-[12px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--blue-700))]">
            Travel deals
          </div>
          <h2 className="mt-3 text-[28px] sm:text-[36px] leading-[1.15] font-display font-bold tracking-[-0.02em] text-[hsl(var(--blue-900))]">
            Flights, hotels, buses &amp; car rentals
          </h2>
          <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground max-w-xl">
            Real-time deals from top providers. Tap to call our travel desk for instant booking.
          </p>
        </Reveal>

        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap" role="group" aria-label="Deal categories">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={activeTab === cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`inline-flex min-h-[44px] items-center gap-2 px-4 py-2.5 rounded-full text-[14px] font-semibold transition-colors duration-200 whitespace-nowrap shrink-0 border ${
                  activeTab === cat.id
                    ? 'bg-[hsl(var(--blue-900))] border-[hsl(var(--blue-900))] text-white'
                    : 'bg-white text-muted-foreground border-[hsl(var(--border))] hover:text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-900))]/30'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl bg-white border border-[hsl(var(--border))] shadow-sm">
          {CATEGORIES.filter((c) => c.id === activeTab).map((cat) => (
            <CategorySection key={cat.id} category={cat} deals={DEALS[cat.id]} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href={`tel:${BRAND.phoneRaw}`}
            className="inline-flex min-h-[44px] items-center gap-2 px-5 py-3 rounded-xl bg-white border border-[hsl(var(--border))] text-[hsl(var(--blue-900))] text-[14px] font-semibold hover:border-[hsl(var(--blue-700))]/40 hover:text-[hsl(var(--blue-700))] transition-colors"
          >
            <Phone className="w-4 h-4 text-[hsl(var(--blue-700))]" aria-hidden="true" />
            Call for all deals · {BRAND.phone}
          </a>
        </div>
      </div>
    </section>
  );
}