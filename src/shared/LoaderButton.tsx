import React from "react";
import { RefreshCw } from "lucide-react";

interface LoaderButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
}

const LoaderButton: React.FC<LoaderButtonProps> = ({
  children,
  loading = false,
  className = "",
  type = "button",
  onClick,
}) => {
  return (
    <button
      type={type}
      disabled={loading}
      onClick={onClick}
      className={`
        relative flex items-center justify-center 
        px-4 py-2 rounded-md font-medium
        transition-all duration-200
        ${loading ? "opacity-70 cursor-not-allowed" : ""}
        ${className}
      `}
    >
      {/* Loader */}
      {loading && (
        <RefreshCw
          className="w-5 h-5 mr-2 animate-spin text-white"
        />
      )}
      {children}
    </button>
  );
};

export default LoaderButton;