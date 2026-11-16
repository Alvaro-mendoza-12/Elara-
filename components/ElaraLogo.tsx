export function ElaraLogo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="32" height="32" rx="9" fill="#131B2B" stroke="#26334D" />
      <path
        d="M16 5.5L18.6 13.4L26.5 16L18.6 18.6L16 26.5L13.4 18.6L5.5 16L13.4 13.4L16 5.5Z"
        fill="#38BDF8"
      />
      <circle cx="16" cy="16" r="2.2" fill="#0B0E14" />
    </svg>
  );
}
