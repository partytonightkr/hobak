interface HobakLogoProps {
  className?: string;
  color?: string;
}

export function HobakLogo({ className = "h-10 w-10", color = "currentColor" }: HobakLogoProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill={color}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Lowercase "h" as dog silhouette — head+ear on left, tail on right */}
      <path d="
        M 15 110
        L 15 42
        L 19 30
        L 26 14
        Q 28 9, 31 12
        L 33 16
        Q 35 20, 35 24
        L 35 26
        L 38 24
        Q 42 22, 46 22
        Q 55 22, 62 30
        Q 70 38, 70 52
        L 70 110
        L 52 110
        L 52 56
        Q 52 48, 48 44
        Q 44 40, 40 44
        Q 36 48, 36 56
        L 36 110
        Z
      " />
      {/* Tail — small curl on right side */}
      <path d="
        M 70 52
        Q 70 40, 76 32
        Q 80 26, 84 24
        Q 88 22, 90 26
        Q 91 30, 88 34
        Q 84 40, 82 46
        Q 80 50, 78 52
        L 70 52
        Z
      " />
      {/* Ear tip detail */}
      <path d="
        M 26 14
        Q 24 10, 26 8
        Q 28 6, 30 9
        L 31 12
        L 26 14
        Z
      " />
    </svg>
  );
}
