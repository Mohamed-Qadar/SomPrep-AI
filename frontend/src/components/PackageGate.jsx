import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, ArrowRight } from "lucide-react";

export default function PackageGate({ grade, children }) {
  const { isGradeAllowed } = useAuth();
  const navigate = useNavigate();

  const allowed = isGradeAllowed(grade);
  const suggestedPackage = "academic";

  if (allowed) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-indigo-950/40 bg-gradient-to-b from-[#130b24] to-[#0d051a] p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl" />

        {/* Lock Icon */}
        <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto shrink-0 relative">
          <Lock className="h-6 w-6" />
          <div className="absolute inset-0 rounded-2xl bg-indigo-500/5 animate-ping opacity-45" />
        </div>

        {/* Messaging */}
        <div className="space-y-2.5">
          <h3 className="font-outfit text-lg font-bold text-white tracking-wide">
            Nuxurkan kuma jiro xirmooyinkaaga
          </h3>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed">
            This content is not in your current package
          </p>
          <p className="text-[10px] text-slate-500 leading-snug">
            Qorshahaaga hadda kuma jiraan casharada iyo imtixaanada fasalkan. Cusbooneysii xirmadaada si aad u hesho fasalkan.
            (Your current package does not cover this grade level. Upgrade your package to access these materials.)
          </p>
        </div>

        {/* Upgrade Button */}
        <button
          onClick={() => navigate(`/paywall?package=${suggestedPackage}&redirect=${encodeURIComponent(window.location.pathname)}`)}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3.5 text-xs font-bold text-white transition active:scale-[0.98] shadow-lg shadow-indigo-600/25"
        >
          <span>Bixi Hadda (Pay Now)</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
