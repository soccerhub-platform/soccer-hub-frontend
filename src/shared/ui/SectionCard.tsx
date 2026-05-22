import React from "react";
import classNames from "classnames";

type SectionCardProps = {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  icon,
  children,
  className,
  bodyClassName,
}) => {
  return (
    <section className={classNames("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      {title ? (
        <div className="mb-4 flex items-start gap-2">
          {icon ? <div className="mt-0.5 shrink-0 text-slate-500">{icon}</div> : null}
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            {description ? <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div> : null}
          </div>
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
};

export default SectionCard;
