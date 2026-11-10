import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "luxury" | "outline";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-emerald-100 text-emerald-800 border-emerald-200",
    secondary: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-teal-50 text-teal-700 border-teal-200",
    warning: "bg-amber-100 text-amber-900 border-amber-300",
    luxury: "bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-800 border-amber-200/80 font-semibold",
    outline: "border-slate-300 text-slate-700 bg-white/80",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

