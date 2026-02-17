"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Download, CheckCircle, AlertCircle, Loader2, RefreshCw, X } from "lucide-react";

type UpdateInfo = {
  status: "checking" | "available" | "downloading" | "downloaded" | "up-to-date" | "error";
  version?: string;
  percent?: number;
  message?: string;
};

export default function UpdateStatus() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [appVersion, setAppVersion] = useState<string>("");

  useEffect(() => {
    const api = (window as unknown as { electronAPI?: {
      onUpdaterStatus: (cb: (data: UpdateInfo) => void) => () => void;
      getVersion: () => Promise<string>;
    } }).electronAPI;

    if (!api) return; // Not running in Electron

    api.getVersion().then(setAppVersion).catch(() => {});

    const unsub = api.onUpdaterStatus((data: UpdateInfo) => {
      setInfo(data);
      setDismissed(false); // Show again on new events
    });

    return () => { unsub(); };
  }, []);

  const handleManualCheck = useCallback(() => {
    const api = (window as unknown as { electronAPI?: {
      checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
    } }).electronAPI;

    if (!api) return;
    setInfo({ status: "checking" });
    setDismissed(false);
    api.checkForUpdates();
  }, []);

  // Don't render anything in browser or if dismissed
  if (typeof window !== "undefined" && !(window as unknown as Record<string, unknown>).electronAPI) return null;
  if (dismissed) return null;
  if (!info) return null;

  // Don't show the "up-to-date" status unless it just finished a manual check
  // (auto-check results are silent when up-to-date)
  if (info.status === "up-to-date") {
    // Show briefly then auto-dismiss
    setTimeout(() => setDismissed(true), 3000);
  }

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg border shadow-xl text-xs font-medium backdrop-blur-md transition-all",
      info.status === "error"
        ? "bg-red-950/90 border-red-800/60 text-red-300"
        : info.status === "downloaded"
        ? "bg-green-950/90 border-green-800/60 text-green-300"
        : "bg-zinc-900/90 border-zinc-700/60 text-zinc-300"
    )}>
      {/* Icon */}
      {info.status === "checking" && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />}
      {info.status === "available" && <Download className="w-3.5 h-3.5 text-amber-400" />}
      {info.status === "downloading" && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />}
      {info.status === "downloaded" && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
      {info.status === "up-to-date" && <CheckCircle className="w-3.5 h-3.5 text-zinc-500" />}
      {info.status === "error" && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}

      {/* Message */}
      <span>
        {info.status === "checking" && "Checking for updates…"}
        {info.status === "available" && `Update v${info.version} available`}
        {info.status === "downloading" && `Downloading update… ${info.percent ?? 0}%`}
        {info.status === "downloaded" && `v${info.version} ready — restart to install`}
        {info.status === "up-to-date" && `v${appVersion} is up to date`}
        {info.status === "error" && `Update error: ${info.message}`}
      </span>

      {/* Retry button on error */}
      {info.status === "error" && (
        <button
          onClick={handleManualCheck}
          className="p-1 rounded hover:bg-red-800/50 text-red-400"
          title="Retry update check"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="p-0.5 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 ml-1"
        title="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
