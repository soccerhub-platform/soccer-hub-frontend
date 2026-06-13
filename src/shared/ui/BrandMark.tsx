import React from "react";

interface BrandMarkProps {
  className?: string;
  compact?: boolean;
}

const BrandMark: React.FC<BrandMarkProps> = ({ className = "", compact = false }) => {
  const sizeClass = compact ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl";

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#d1fae5_0%,#99f6e4_32%,#0f766e_100%)] shadow-[0_12px_30px_-18px_rgba(15,118,110,0.85)] ${sizeClass} ${className}`}
      aria-hidden="true"
    >
      <span className="absolute inset-[18%] rounded-[30%] border border-white/60" />
      <span className="absolute h-[54%] w-[54%] rotate-45 rounded-[28%] bg-white/90" />
      <span className="absolute h-[22%] w-[22%] rounded-full bg-teal-700" />
      <span className="absolute left-[14%] top-[20%] h-[14%] w-[14%] rounded-full bg-white/65" />
    </div>
  );
};

export default BrandMark;
