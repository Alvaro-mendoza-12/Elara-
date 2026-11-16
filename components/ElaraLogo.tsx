export function ElaraLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className="shrink-0">
      <rect width="64" height="64" rx="20" fill="#6654D9" />
      <path d="M45 36.5C43.2 43.4 37 47.1 30 45.4C22 43.5 18.3 35.5 21.1 28.1C23.7 21.1 31.7 17.6 38.4 21.1C42.4 23.1 44.7 26.8 44.8 31.2H20.5" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 43C4 34 45 6 53 17C56 21 51 27 48 30" stroke="#C6BCFF" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="15" r="4" fill="#CFF5E4" />
    </svg>
  );
}
