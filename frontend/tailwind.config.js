/** @type {import('tailwindcss').Config} */

// We Hive brand palette (see --wehive-* in src/index.css). Stock Tailwind hues are
// remapped so every blue-ish class renders brand blue and every red/pink class
// renders brand red. emerald/green/amber stay for status only.
// Anchors: 50 ice blue, 100 sky mist, 500 electric blue, 700 royal blue, 900 midnight navy.
const NAVY = {
  50: '#EEF1FF', 100: '#E9EEFF', 200: '#C9D2FF', 300: '#9AA8FF', 400: '#5B6BFF',
  500: '#0518FE', 600: '#0216D9', 700: '#011CB5', 800: '#071790', 900: '#0B1240', 950: '#060A26',
};
// 400 signal red (decoration only, 3.99:1 on white); 500 festive red is the lightest text-safe red.
const FLAG_RED = {
  50: '#FFF1F0', 100: '#FFDFDD', 200: '#FFBDB9', 300: '#FF8A84', 400: '#FF0302',
  500: '#E10600', 600: '#C80500', 700: '#B80500', 800: '#8F0400', 900: '#660300', 950: '#3A0200',
};

module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['var(--font-body)'],
  			display: ['var(--font-heading)'],
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			blue: NAVY, sky: NAVY, indigo: NAVY, cyan: NAVY, teal: NAVY, violet: NAVY, purple: NAVY,
  			red: FLAG_RED, rose: FLAG_RED, pink: FLAG_RED, fuchsia: FLAG_RED, orange: FLAG_RED,
  			marigold: 'hsl(var(--marigold))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};