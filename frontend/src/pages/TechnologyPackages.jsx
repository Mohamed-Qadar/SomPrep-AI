import React from "react";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import TechnologyPackagesSection from "../components/TechnologyPackagesSection";

export default function TechnologyPackages() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans overflow-x-hidden">
      <PublicNavbar />
      <section className="relative mx-auto max-w-7xl px-4 pt-10 pb-20 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Technology Skills Pricing
          </span>
          <h1 className="font-outfit text-4xl font-extrabold text-white">
            Technology Packages
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Practical technology bundles for students, university learners, graduates, unemployed
            youth, field workers, and working professionals.
          </p>
        </div>
        <TechnologyPackagesSection />
      </section>
      <PublicFooter />
    </div>
  );
}
