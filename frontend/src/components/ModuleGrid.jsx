import React from "react";
import { CheckCircle2 } from "lucide-react";

export default function ModuleGrid({ title, modules }) {
  return (
    <section className="py-10 border-b border-white/[0.05]">
      <h2 className="font-outfit text-2xl font-extrabold text-white">{title}</h2>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => {
          const moduleTitle = typeof module === "string" ? module : module.title;
          const items = typeof module === "string" ? null : module.items;
          return (
            <div key={moduleTitle} className="rounded-2xl border border-white/[0.06] bg-[#1a1130]/40 p-5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">{moduleTitle}</h3>
              </div>
              {items ? (
                <ul className="mt-4 space-y-2">
                  {items.map((item) => (
                    <li key={item} className="text-xs text-slate-400">- {item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
