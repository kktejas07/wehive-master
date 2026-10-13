/** @type {import('tailwindcss').Config} */

// US-flag palette (design-system/we-hive/MASTER.md). Stock Tailwind hues are
// remapped so every blue-ish class renders Old Glory Blue and every red/pink
// class renders Old Glory Red. emerald/green/amber stay for status only.
const NAVY = {
  50: '#EEF2FB', 100: '#DCE4F6', 200: '#B8C8EC', 300: '#8AA4DD', 400: '#4F72C4',
  500: '#1F45A6', 600: '#0A3196', 700: '#00247D', 800: '#0A3161', 900: '#0B1220', 950: '#050B16',
};
const FLAG_RED = {
  50: '#FEF2F3', 100: '#FDE3E5', 200: '#FAC5CA', 300: '#F4949D', 400: '#EA5966',
  500: '#E0303F', 600: '#CF1426', 700: '#B31942', 800: '#8E1434', 900: '#6E1028', 950: '#2E0611',
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