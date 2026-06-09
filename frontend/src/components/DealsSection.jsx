import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plane, Bus, Car, Hotel, Sparkle, Phone, ChevronRight, Clock } from 'lucide-react';
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
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative flex-shrink-0 w-[260px] sm:w-[290px] rounded-2xl bg-white border border-black/8 shadow-sm overflow-hidden cursor-pointer group"
      onClick={onCall}
    >
      {discount >= 20 && (
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[hsl(var(--accent))] text-white text-[10px] font-bold uppercase tracking-wider">
            {discount}% OFF
          </span>
        </div>
      )}

      <div className="p-4">
        {category === 'flights' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[18px] font-bold text-[hsl(var(--blue-900))]">{deal.from} → {deal.to}</span>
              </div>
              <span className="text-[11px] text-[hsl(var(--blue-900))]/50 font-medium">{deal.airline}</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[hsl(var(--blue-900))]/60 mb-3">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {deal.time}</span>
              <span>{deal.stops}</span>
              <span className="text-[hsl(var(--accent))] font-bold">{deal.seats} seats left</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[hsl(var(--blue-900))]/50 line-through">₹{deal.original.toLocaleString('en-IN')}</span>
                <div className="text-[20px] font-display font-extrabold text-[hsl(var(--blue-900))]">₹{deal.price.toLocaleString('en-IN')}</div>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[hsl(var(--blue-700))] text-white text-[12px] font-bold hover:bg-[hsl(var(--blue-800))] transition-colors">
                <Phone className="w-3.5 h-3.5" /> Call
              </button>
            </div>
          </>
        )}

        {category === 'buses' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[15px] font-bold text-[hsl(var(--blue-900))]">{deal.from} → {deal.to}</span>
              <span className="text-[10px] text-[hsl(var(--blue-900))]/50 font-medium">{deal.operator}</span>
            </div>
            <div className="text-[11px] text-[hsl(var(--blue-900))]/60 mb-2">{deal.type} · {deal.departure} → {deal.arrival}</div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[hsl(var(--blue-900))]/50 line-through">₹{deal.original.toLocaleString('en-IN')}</span>
                <div className="text-[20px] font-display font-extrabold text-[hsl(var(--blue-900))]">₹{deal.price.toLocaleString('en-IN')}</div>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[hsl(var(--blue-700))] text-white text-[12px] font-bold hover:bg-[hsl(var(--blue-800))] transition-colors">
                <Phone className="w-3.5 h-3.5" /> Call
              </button>
            </div>
          </>
        )}

        {category === 'cars' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[15px] font-bold text-[hsl(var(--blue-900))]">{deal.company}</span>
              <span className="text-[10px] text-[hsl(var(--blue-900))]/50 font-medium">{deal.location}</span>
            </div>
            <div className="text-[11px] text-[hsl(var(--blue-900))]/60 mb-2">{deal.vehicle} · {deal.type} · {deal.seats} Seats{deal.fuelType}</div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[hsl(var(--blue-900))]/50 line-through">₹{deal.original.toLocaleString('en-IN')}/day</span>
                <div className="text-[20px] font-display font-extrabold text-[hsl(var(--blue-900))]">₹{deal.price.toLocaleString('en-IN')}<span className="text-[12px] font-normal text-[hsl(var(--blue-900))]/50">/day</span></div>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[hsl(var(--blue-700))] text-white text-[12px] font-bold hover:bg-[hsl(var(--blue-800))] transition-colors">
                <Phone className="w-3.5 h-3.5" /> Call
              </button>
            </div>
          </>
        )}

        {category === 'hotels' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[15px] font-bold text-[hsl(var(--blue-900))]">{deal.name}</span>
              <span className="text-[10px] text-[hsl(var(--blue-900))]/50 font-medium">{deal.category}</span>
            </div>
            <div className="text-[11px] text-[hsl(var(--blue-900))]/60 mb-2">{deal.location} · {deal.rooms}</div>
            <div className="text-[10px] text-[hsl(var(--blue-900))]/50 mb-2">{deal.amenities}</div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[hsl(var(--blue-900))]/50 line-through">₹{deal.original.toLocaleString('en-IN')}/night</span>
                <div className="text-[20px] font-display font-extrabold text-[hsl(var(--blue-900))]">₹{deal.price.toLocaleString('en-IN')}<span className="text-[12px] font-normal text-[hsl(var(--blue-900))]/50">/night</span></div>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[hsl(var(--blue-700))] text-white text-[12px] font-bold hover:bg-[hsl(var(--blue-800))] transition-colors">
                <Phone className="w-3.5 h-3.5" /> Call
              </button>
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
    <div className="py-8 sm:py-10 border-b border-black/5 last:border-0">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[hsl(var(--blue-700))] text-white">
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="text-[18px] sm:text-[22px] font-display font-extrabold text-[hsl(var(--blue-900))]">{category.label}</h3>
          <span className="ml-auto text-[12px] text-[hsl(var(--blue-900))]/50 font-medium flex items-center gap-1">
            Live deals <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </span>
        </div>

        <div className="relative">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {deals.map((deal, i) => (
              <div key={deal.id} className="snap-start">
                <DealCard
                  deal={deal}
                  category={category.id}
                  onCall={() => window.location.href = `tel:${BRAND.phoneRaw}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DealsSection() {
  const [activeTab, setActiveTab] = useState('flights');

  return (
    <section className="relative py-12 sm:py-16 bg-[hsl(var(--soft-bg))]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="mb-8">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
            <Sparkle className="w-3.5 h-3.5" />
            Exclusive deals
          </div>
          <h2 className="mt-3 text-[26px] sm:text-[36px] lg:text-[42px] leading-[1.08] font-display font-extrabold tracking-[-0.03em] text-[hsl(var(--blue-900))]">
            Flights, Hotels, Buses & <span className="text-[hsl(var(--accent))]">Car Rentals.</span>
          </h2>
          <p className="mt-2 text-[14px] sm:text-[15px] text-[hsl(var(--blue-900))]/60 max-w-xl">
            Real-time deals from top providers. Tap to call our travel desk for instant booking.
          </p>
        </Reveal>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold transition-all whitespace-nowrap ${
                  activeTab === cat.id
                    ? 'bg-[hsl(var(--blue-700))] text-white'
                    : 'bg-white text-[hsl(var(--blue-900))]/60 border border-black/10 hover:border-black/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl bg-white border border-black/8 overflow-hidden shadow-sm">
          {CATEGORIES.filter(c => activeTab === 'all' || c.id === activeTab).map((cat) => (
            <CategorySection key={cat.id} category={cat} deals={DEALS[cat.id]} />
          ))}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.href = `tel:${BRAND.phoneRaw}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[hsl(var(--blue-700))] text-white text-[14px] font-bold hover:bg-[hsl(var(--blue-800))] transition-colors"
          >
            <Phone className="w-4 h-4" />
            Call for all deals · {BRAND.phone}
          </button>
        </div>
      </div>
    </section>
  );
}