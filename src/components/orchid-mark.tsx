export function OrchidMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M32 32C32 32 34 18 44 14C50 11.5 55 15 53 21C50.5 29 40 31 32 32Z" fillOpacity="0.16" fill="currentColor" />
        <path d="M32 32C32 32 30 18 20 14C14 11.5 9 15 11 21C13.5 29 24 31 32 32Z" fillOpacity="0.16" fill="currentColor" />
        <path d="M32 32C32 32 41 24 48 27C53 29.2 53.5 35 48 37.5C40.5 41 34 35 32 32Z" fillOpacity="0.16" fill="currentColor" />
        <path d="M32 32C32 32 23 24 16 27C11 29.2 10.5 35 16 37.5C23.5 41 30 35 32 32Z" fillOpacity="0.16" fill="currentColor" />
        <path d="M32 32C32 32 27 42 32 52C35 47 36 40 32 32Z" fillOpacity="0.28" fill="currentColor" />
        <circle cx="32" cy="31" r="4.5" fillOpacity="0.9" fill="currentColor" />
      </g>
    </svg>
  );
}
