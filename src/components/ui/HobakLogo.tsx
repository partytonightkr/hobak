interface HobakLogoProps {
  className?: string;
  color?: string;
}

export function HobakLogo({ className = "h-10 w-10", color = "currentColor" }: HobakLogoProps) {
  return (
    <svg
      viewBox="0 0 100 120"
      fill={color}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Dog head — large circle at top of tall left stroke */}
      <circle cx="22" cy="22" r="12" />

      {/* Left ear */}
      <path d="M 13 16 L 7 4 L 18 12 Z" />

      {/* Right ear */}
      <path d="M 26 12 L 37 4 L 31 16 Z" />

      {/* H-body: tall left stroke + arch (mid-height) + shorter right stroke */}
      <path d="
        M 10 32
        L 10 114
        L 30 114
        L 30 72
        Q 30 58, 48 54
        Q 64 50, 64 64
        L 64 114
        L 84 114
        L 84 56
        Q 84 38, 60 36
        Q 38 34, 30 52
        L 30 32
        Z
      " />

      {/* Tail — small curl */}
      <path d="
        M 84 50
        Q 88 36, 93 32
        Q 96 30, 95 34
        Q 91 42, 86 48
        Z
      " />
    </svg>
  );
}
