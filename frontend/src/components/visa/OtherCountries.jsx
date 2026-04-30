import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

export default function OtherCountries({ list }) {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))] mb-8">
          Other destinations travelers love
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {list.map((c) => (
            <Link key={c.id} to={`/visa/${c.id}`} className="group block">
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
                <img
                  src={c.image}
                  alt={c.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <div className="text-[18px] font-display font-extrabold tracking-[-0.02em]">{c.name}</div>
                  <div className="text-[12px] text-white/70 font-semibold">${c.fees_usd ?? c.fees}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

OtherCountries.propTypes = {
  list: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      image: PropTypes.string,
      fees_usd: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      fees: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    }),
  ).isRequired,
};
