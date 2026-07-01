export function LogoSvg({ size = 40, className = '' }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      style={{ width: size, height: size }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="10" fill="#0a2c8a" />
      <path
        d="M20 6l11.18 6.5v13L20 32 8.82 25.5v-13L20 6z"
        fill="white"
        opacity="0.95"
      />
      <path
        d="M20 10l8.66 5v10L20 28l-8.66-5v-10L20 10z"
        fill="#e1212c"
        opacity="0.85"
      />
      <circle cx="20" cy="20" r="4" fill="white" />
      <path
        d="M17 20a3 3 0 016 0"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M20 17v-2M20 23v2"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="20" cy="20" r="6.5" stroke="white" strokeWidth="1.2" opacity="0.4" />
    </svg>
  );
}

export function LogoWordmark({ size = 28, className = '' }) {
  return (
    <svg
      viewBox="0 0 120 28"
      className={className}
      style={{ height: size }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="0"
        y="22"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="22"
        fontWeight="800"
        fill="#0a2c8a"
        letterSpacing="-0.03em"
      >
        We
      </text>
      <text
        x="0"
        y="22"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="22"
        fontWeight="800"
        fill="#e1212c"
        letterSpacing="-0.03em"
        dx="32"
      >
        Hive
      </text>
    </svg>
  );
}

export default LogoSvg;
