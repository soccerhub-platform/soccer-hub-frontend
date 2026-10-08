import React from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  coachId?: string | null;
  children: React.ReactNode;
  className?: string;
  showArrow?: boolean;
}

const CoachProfileLink: React.FC<Props> = ({ coachId, children, className = "", showArrow = true }) => {
  if (!coachId) return <span className={className}>{children}</span>;

  return (
    <Link
      to={`/admin/coaches/${coachId}`}
      onClick={(event) => event.stopPropagation()}
      className={`group/coach inline-flex min-w-0 items-center gap-1 font-medium text-slate-900 outline-hidden transition hover:text-admin-600 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-admin-600 focus-visible:ring-offset-2 ${className}`}
    >
      <span className="truncate">{children}</span>
      {showArrow ? <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover/coach:text-admin-600" /> : null}
    </Link>
  );
};

export default CoachProfileLink;
