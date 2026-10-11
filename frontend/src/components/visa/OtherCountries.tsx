import { Link } from 'react-router-dom';

interface OtherCountry {
  id: string;
  name: string;
  image?: string;
  fees_usd?: number | string;
  fees?: number | string;
}

interface OtherCountriesProps {
  list: OtherCountry[];
}

export default function OtherCountries({ list }: OtherCountriesProps) {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <h2 className="font-display font-bold text-[28px] tracking-[-0.02em] text-[hsl(var(--blue-900))] mb-8 leading-tight">
          Other destinations travelers love
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {list.map((c) => (
            <Link key={c.id} to={`/visa/${c.id}`} className="group block">
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
                <img loading="lazy" decoding="async"
                  src={c.image}
                  alt={c.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <div className="text-[18px] font-display font-bold tracking-[-0.02em]">{c.name}</div>
                  <div className="text-[12px] text-white/90 font-semibold">${c.fees_usd ?? c.fees}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
