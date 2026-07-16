import React from "react";
import classNames from "classnames";

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
};

const PageShell: React.FC<PageShellProps> = ({ children, className }) => {
  return <div className={classNames("mx-auto w-full max-w-[1380px] space-y-3", className)}>{children}</div>;
};

export default PageShell;
