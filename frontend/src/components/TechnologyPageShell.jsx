import React from "react";
import PublicNavbar from "./PublicNavbar";
import PublicFooter from "./PublicFooter";

export default function TechnologyPageShell({ eyebrow, title, audience, intro, children }) {
  return (
    <div className="min-h-screen bg-[#0c031a] text-white font-sans overflow-x-hidden">
      <PublicNavbar />
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-[34rem] bg-gradient-to-b from-[#310c5a]/25 via-[#1c0836]/10 to-transparent blur-[140px]" />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="max-w-4xl pb-10 border-b border-white/[0.05]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
            {eyebrow}
          </span>
          <h1 className="mt-3 font-outfit text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          {audience ? (
            <p className="mt-4 text-sm font-bold text-indigo-200">{audience}</p>
          ) : null}
          <p className="mt-4 max-w-3xl text-sm text-slate-400 leading-relaxed">{intro}</p>
        </section>

        {children}
      </main>

      <PublicFooter />
    </div>
  );
}
