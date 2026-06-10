'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Bell, Clock } from 'lucide-react';

function generateCalendarDays() {
  const days = [];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }
  return days;
}

const DETECTED_SLOTS = [1, 2, 3, 4, 8, 9, 10, 11, 15, 16, 17, 18, 22, 23, 24, 25, 29, 30];

export default function AppointmentMonitor({ countryName }) {
  const [currentMonth] = useState(new Date());
  const days = generateCalendarDays();
  const monthName = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <section className="py-16 bg-white border-t border-black/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-3">
            <Calendar className="w-3.5 h-3.5" />
            What&apos;s included with the cost
          </div>
          <h2 className="font-display font-extrabold text-[26px] sm:text-[36px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
            24/7 Appointment Monitoring
          </h2>
          <p className="mt-3 text-[14px] text-[hsl(var(--blue-900))]/60 max-w-xl mx-auto">
            We scan for new or cancelled slots daily, every minute and our system books them instantly, even when we sleep.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-[hsl(var(--soft-bg))] rounded-3xl p-6"
          >
            <div className="text-center mb-4">
              <span className="text-[12px] font-bold text-[hsl(var(--blue-900))]/60 uppercase tracking-wider">
                {monthName}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((d) => (
                <div key={d} className="text-center text-[10px] font-bold text-[hsl(var(--blue-900))]/40 uppercase py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, i) => {
                const isDetected = day && DETECTED_SLOTS.includes(day);
                const isToday = day === new Date().getDate();
                return (
                  <div
                    key={i}
                    className={`aspect-square flex items-center justify-center rounded-lg text-[13px] font-medium relative ${
                      day ? 'text-[hsl(var(--blue-900))]' : ''
                    }`}
                  >
                    {day && (
                      <>
                        <span className={isToday ? 'text-[hsl(var(--accent))] font-bold' : ''}>
                          {day}
                        </span>
                        {isDetected && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent))]" />
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-[hsl(var(--blue-900))]/60">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[hsl(var(--accent))]" />
                <span>Detected with WeHive</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[hsl(var(--blue-900))]/20" />
                <span>No slots detected</span>
              </div>
            </div>
          </motion.div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-900))] rounded-2xl p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-[18px]">Instant Slot Alerts</h3>
                  <p className="mt-2 text-white/80 text-[13px] leading-relaxed">
                    Get notified the moment a slot opens up. Our system monitors 24/7 and books before others even know it exists.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[hsl(var(--soft-bg))] rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--blue-700))]/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-[hsl(var(--blue-700))]" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-[16px] text-[hsl(var(--blue-900))]">
                    Real-time Slot Detection
                  </h3>
                  <p className="mt-2 text-[hsl(var(--blue-900))]/60 text-[13px] leading-relaxed">
                    Presenting detected slots across the country. We scan every minute, even while you sleep.
                  </p>
                </div>
              </div>
            </div>

            <button className="w-full rounded-full bg-[hsl(var(--accent))] hover:bg-[hsl(var(--red-600))] text-white h-12 font-bold transition-colors">
              Reserve a Slot
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}