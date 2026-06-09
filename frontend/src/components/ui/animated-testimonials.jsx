'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote:
      "We Hive processed my US tourist visa in just 4 days. The team kept me updated at every step. Absolutely recommend for anyone looking for hassle-free visa service!",
    name: "Priya Sharma",
    location: "Bangalore, India",
    visaType: "USA Tourist Visa",
    rating: 5,
    avatar: "PS",
    color: "#0A2C8A",
  },
  {
    quote:
      "As a frequent business traveller, I need reliable visa support. We Hive has never let me down. Their express service for UK business visa is top-notch.",
    name: "Rajesh Mehta",
    location: "Mumbai, India",
    visaType: "UK Business Visa",
    rating: 5,
    avatar: "RM",
    color: "#E1212C",
  },
  {
    quote:
      "My daughter's student visa for Canada was handled perfectly. The documentation guidance was invaluable. We couldn't have done it without We Hive.",
    name: "Anita Desai",
    location: "Hyderabad, India",
    visaType: "Canada Student Visa",
    rating: 5,
    avatar: "AD",
    color: "#10B981",
  },
  {
    quote:
      "Got my Japan tourist visa in 3 days during peak season. The online tracking and WhatsApp updates made it so convenient. Will definitely use again!",
    name: "Vikram Singh",
    location: "Delhi, India",
    visaType: "Japan Tourist Visa",
    rating: 5,
    avatar: "VS",
    color: "#F59E0B",
  },
  {
    quote:
      "The Australia working holiday visa process was smooth and stress-free. The team handled everything professionally. Five stars!",
    name: "Kavitha Nair",
    location: "Chennai, India",
    visaType: "Australia Working Holiday",
    rating: 5,
    avatar: "KN",
    color: "#8B5CF6",
  },
  {
    quote:
      "Schengen visa for our Europe trip was processed without any hassle. The interview tips they provided were extremely helpful.",
    name: "Arun Patel",
    location: "Pune, India",
    visaType: "Schengen Visa",
    rating: 5,
    avatar: "AP",
    color: "#EC4899",
  },
];

function TestimonialCard({ testimonial, isActive, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: isActive ? 1 : 0, scale: isActive ? 1 : 0.9, y: isActive ? 0 : 20 }}
      transition={{ duration: 0.5 }}
      className={`absolute inset-0 flex items-center justify-center p-4 ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div className="bg-white rounded-3xl border border-black/5 shadow-xl p-6 sm:p-8 max-w-lg w-full relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
          style={{ backgroundColor: testimonial.color, filter: 'blur(40px)' }}
        />

        <div className="relative">
          <div className="flex items-start gap-4 mb-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-[16px] shadow-lg flex-shrink-0"
              style={{ backgroundColor: testimonial.color }}
            >
              {testimonial.avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-1">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <h4 className="font-display font-extrabold text-[16px] text-[hsl(var(--blue-900))]">
                {testimonial.name}
              </h4>
              <p className="text-[11px] text-[hsl(var(--blue-900))]/60">
                {testimonial.location} · {testimonial.visaType}
              </p>
            </div>
            <Quote className="w-6 h-6 text-[hsl(var(--blue-900))]/10 flex-shrink-0" />
          </div>

          <p className="text-[14px] sm:text-[15px] leading-relaxed text-[hsl(var(--blue-900))]/80 italic">
            "{testimonial.quote}"
          </p>

          <div
            className="mt-4 h-1 rounded-full bg-gradient-to-r"
            style={{
              backgroundImage: `linear-gradient(to right, ${testimonial.color}, ${testimonial.color}50)`,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function TestimonialIndicators({ total, active, onClick }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[...Array(total)].map((_, i) => (
        <button
          key={i}
          onClick={() => onClick(i)}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === active ? 'w-8 bg-[hsl(var(--accent))]' : 'w-2 bg-[hsl(var(--blue-900))]/20 hover:bg-[hsl(var(--blue-900))]/40'
          }`}
        />
      ))}
    </div>
  );
}

export default function AnimatedTestimonials() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(0);

  const handlePrev = () => {
    setDirection(-1);
    setActive((prev) => (prev === 0 ? TESTIMONIALS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setDirection(1);
    setActive((prev) => (prev === TESTIMONIALS.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1);
      setActive((prev) => (prev === TESTIMONIALS.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative py-16 sm:py-20 bg-[hsl(var(--soft-bg))] overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-3">
            <Star className="w-3.5 h-3.5" />
            Testimonials
          </div>
          <h2 className="font-display font-extrabold text-[26px] sm:text-[38px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
            What Our Travellers Say
          </h2>
          <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60 max-w-xl mx-auto">
            Real stories from real customers who trusted us with their visa journeys
          </p>
        </motion.div>

        <div className="relative max-w-2xl mx-auto">
          <div className="relative h-[320px] sm:h-[280px]">
            {TESTIMONIALS.map((testimonial, i) => (
              <TestimonialCard
                key={testimonial.name}
                testimonial={testimonial}
                isActive={i === active}
                index={i}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handlePrev}
              className="w-10 h-10 rounded-full bg-white border border-black/10 flex items-center justify-center hover:bg-[hsl(var(--blue-700))] hover:text-white hover:border-transparent transition-colors group"
            >
              <ChevronLeft className="w-5 h-5 text-[hsl(var(--blue-900))] group-hover:text-white" />
            </button>

            <TestimonialIndicators
              total={TESTIMONIALS.length}
              active={active}
              onClick={setActive}
            />

            <button
              onClick={handleNext}
              className="w-10 h-10 rounded-full bg-white border border-black/10 flex items-center justify-center hover:bg-[hsl(var(--blue-700))] hover:text-white hover:border-transparent transition-colors group"
            >
              <ChevronRight className="w-5 h-5 text-[hsl(var(--blue-900))] group-hover:text-white" />
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 flex flex-wrap items-center justify-center gap-6"
        >
          {[
            { label: '12,000+', sub: 'Visas Processed' },
            { label: '98.6%', sub: 'Success Rate' },
            { label: '4.9/5', sub: 'Customer Rating' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-display font-extrabold text-[24px] text-[hsl(var(--blue-900))]">
                {stat.label}
              </div>
              <div className="text-[11px] text-[hsl(var(--blue-900))]/60 font-semibold">
                {stat.sub}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}