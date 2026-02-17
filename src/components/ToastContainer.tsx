"use client";

import React from "react";
import { useAppStore, Toast } from "@/store/appStore";
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<Toast["type"], React.ReactNode> = {
  info: <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />,
  success: <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />,
  error: <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
};

const bgMap: Record<Toast["type"], string> = {
  info: "bg-amber-950/90 border-amber-700/50",
  success: "bg-green-950/90 border-green-800/50",
  warning: "bg-yellow-950/90 border-yellow-800/50",
  error: "bg-red-950/90 border-red-800/50",
};

export default function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const dismissToast = useAppStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border shadow-xl backdrop-blur-sm",
            "text-zinc-200 text-xs font-medium",
            "animate-in slide-in-from-right-5 fade-in duration-300",
            "pointer-events-auto",
            bgMap[toast.type]
          )}
        >
          {iconMap[toast.type]}
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="p-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-200 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
