import React from "react";
import { Loader2 } from "lucide-react";

export default function LoadingState({ label = "Loading...", fullScreen = true }) {
  const shellClass = fullScreen
    ? "flex min-h-screen items-center justify-center bg-[#0f172a] text-white"
    : "flex items-center justify-center py-20 text-white";

  return (
    <div className={shellClass}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        {label ? <p className="text-xs font-semibold text-slate-400">{label}</p> : null}
      </div>
    </div>
  );
}
