/** @type {import('tailwindcss').Config} */

// US-flag palette (design-system/we-hive/MASTER.md). Stock Tailwind hues are
// remapped so every blue-ish class renders Old Glory Blue and every red/pink
// class renders Old Glory Red. emerald/green/amber stay for status only.
const NAVY = {
  50: '#F0F4FA', 100: '#DCE5F2', 200: '#B9CBE5', 300: '#8FADD6', 400: '#5B86C0',
  500: '#1D4E89', 600: '#143E72', 700: '#0A3161', 800: '#072447', 900: '#0B1220', 950: '#050B16',
};
const FLAG_RED = {
  50: '#FDF2F4', 100: '#FBE3E8', 200: '#F5C2CD', 300: '#EC93A6', 400: '#DB5776',
  500: '#C42A51', 600: '#B31942', 700: '#8E1434', 800: '#6E1028', 900: '#4F0B1D', 950: '#2E0611',
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