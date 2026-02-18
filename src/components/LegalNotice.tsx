"use client";

import React, { useState, useEffect } from "react";

const TOS_VERSION = "1.0.0";
const PRIVACY_VERSION = "1.0.0";
const ACCEPTED_KEY = "materialililil-legal-accepted";

interface LegalAcceptance {
  tosVersion: string;
  privacyVersion: string;
  acceptedAt: string;
}

function getAcceptance(): LegalAcceptance | null {
  try {
    const raw = localStorage.getItem(ACCEPTED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveAcceptance() {
  const acceptance: LegalAcceptance = {
    tosVersion: TOS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  localStorage.setItem(ACCEPTED_KEY, JSON.stringify(acceptance));
}

function needsAcceptance(): boolean {
  const prev = getAcceptance();
  if (!prev) return true;
  return prev.tosVersion !== TOS_VERSION || prev.privacyVersion !== PRIVACY_VERSION;
}

export default function LegalNotice() {
  const [show, setShow] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);

  useEffect(() => {
    if (needsAcceptance()) {
      const prev = getAcceptance();
      setIsUpdate(!!prev);
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const handleAccept = () => {
    saveAcceptance();
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-[90vw] max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="relative w-7 h-7 flex-shrink-0">
              <div className="absolute inset-0 rounded bg-amber-500/20 rotate-6" />
              <div className="absolute inset-0 rounded bg-amber-500/40 rotate-3" />
              <div className="absolute inset-0 rounded bg-amber-500 flex items-center justify-center">
                <span className="text-black font-bold text-[10px] font-mono">m</span>
              </div>
            </div>
            <h2 className="text-base font-semibold text-zinc-100">
              {isUpdate ? "Updated Legal Terms" : "Welcome to materialililil"}
            </h2>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {isUpdate ? (
            <p className="text-sm text-zinc-300 leading-relaxed">
              Our Terms of Service and/or Privacy Policy have been updated.
              Please review the changes before continuing.
            </p>
          ) : (
            <p className="text-sm text-zinc-300 leading-relaxed">
              Before you get started, please review our terms.
            </p>
          )}

          <div className="space-y-2">
            <a
              href="https://github.com/dev-doshi/materialililil/blob/main/TERMS_OF_SERVICE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors"
            >
              Terms of Service
              <span className="text-zinc-600 text-xs ml-2">v{TOS_VERSION}</span>
            </a>
            <a
              href="https://github.com/dev-doshi/materialililil/blob/main/PRIVACY_POLICY.md"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors"
            >
              Privacy Policy
              <span className="text-zinc-600 text-xs ml-2">v{PRIVACY_VERSION}</span>
            </a>
          </div>

          <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              <strong className="text-zinc-400">Summary:</strong> materialililil
              runs entirely on your device. We do not collect, store, or transmit
              any of your data. The only network request is checking GitHub for
              app updates. The software is provided as-is under the MIT License.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-[10px] text-zinc-600">
            By continuing, you agree to these terms.
          </p>
          <button
            onClick={handleAccept}
            className="px-5 py-2 rounded-lg bg-amber-500 text-black text-sm font-medium hover:bg-amber-400 transition-colors"
          >
            I Agree
          </button>
        </div>
      </div>
    </div>
  );
}
