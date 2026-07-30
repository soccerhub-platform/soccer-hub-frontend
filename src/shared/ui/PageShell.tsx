import React from "react";
import classNames from "classnames";

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
};

const PageShell: React.FC<PageShellProps> = ({ children, className }) => {
  return <div className={classNames("mx-auto flex w-full max-w-[1440px] flex-col gap-5", className)}>{children}</div>;
};

export default PageShell;
