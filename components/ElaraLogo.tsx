export function ElaraLogo({ size = 24 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className="elara-logo shrink-0">
    <rect width="64" height="64" rx="19" fill="#6654D9" />
    <g fill="white">
      <path className="elara-fold" d="M30 11C33 10 35 12 35 15V23C35 26 33 28 30 28H20C17 28 16 26 18 23C20 18 25 13 30 11Z" />
      <path className="elara-fold" d="M30 11C33 10 35 12 35 15V23C35 26 33 28 30 28H20C17 28 16 26 18 23C20 18 25 13 30 11Z" transform="rotate(120 32 32)" />
      <path className="elara-fold" d="M30 11C33 10 35 12 35 15V23C35 26 33 28 30 28H20C17 28 16 26 18 23C20 18 25 13 30 11Z" transform="rotate(240 32 32)" />
    </g>
  </svg>;
}
