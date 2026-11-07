import React from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import usePackageCatalog from "../hooks/usePackageCatalog";
import { handlePackageSelect } from "../utils/packageSelection";

export default function PackagesPreview({ user, navigate }) {
  const { packages: allPackages } = usePackageCatalog();
  const packages = allPackages.filter((pkg) => pkg.category === "academic").slice(0, 4);

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-b border-white/[0.05]">
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 inline-block">
          Affordable Quality Learning
        </span>
        <h2 className="font-outfit text-3xl font-extrabold text-white">
          Affordable Learning Packages
        </h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          Diiwaangeli oo hel 12 bilood oo buuxda oo casharro, tijaabooyin, iyo AI coach ah. Ka dooro xirmada ku habboon heerkaaga waxbarasho.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto items-stretch">
        {packages.map((pkg) => (
          <div
            key={pkg.title}
            className={`rounded-3xl border p-8 flex flex-col justify-between hover:border-slate-500 transition duration-300 ${
              pkg.popular
                ? "border-[#6366f1] bg-gradient-to-b from-[#1c1230] to-[#0c031a] sm:scale-105 shadow-xl relative"
                : "border-white/[0.05] bg-[#130b24]/40 hover:bg-[#1a1130]/30"
            }`}
          >
            {pkg.popular && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#6366f1] px-4 py-1 text-[9px] font-bold uppercase tracking-widest text-white shadow-md">
                Recommended
              </span>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                  {pkg.target}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 block">
                  {pkg.audience}
                </span>
                <h3 className="text-base font-bold text-white font-outfit">{pkg.title}</h3>
              </div>

              <div className="py-3.5 border-y border-slate-800/80 flex items-baseline">
                <span className="text-3xl font-black text-white font-outfit">{pkg.annualPrice}</span>
                <span className="text-slate-500 text-[11px] font-semibold ml-1.5">
                  / 12 months
                </span>
              </div>

              <ul className="space-y-2.5 pt-2">
                {pkg.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-[11px] text-slate-350">
                    <CheckCircle2 className="h-4 w-4 text-[#6366f1] shrink-0 mt-0.5" />
                    <span className="leading-snug">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-8">
              <button
                onClick={() => handlePackageSelect({ packageId: pkg.id, user, navigate })}
                className={`w-full rounded-xl py-3.5 text-xs font-bold transition duration-200 active:scale-[0.98] ${
                  pkg.popular
                    ? "bg-[#6366f1] hover:bg-[#4f46e5] text-white shadow-md shadow-[#6366f1]/20 btn-shimmer relative overflow-hidden"
                    : "bg-[#1e293b] border border-slate-850 text-slate-200 hover:bg-slate-800"
                }`}
              >
                {pkg.button}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Trust factors footer */}
      <div className="mt-16 border-t border-white/[0.03] pt-12 flex flex-col md:flex-row items-center justify-between gap-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 text-left">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Payment Amni ah & Fudud</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
              Ku bixi si toos ah Mobile Money, bank transfer, ama biilka caadiga ah. Ma jiro khidmad qarsoon.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <span>Mobile Money</span>
          <span className="text-slate-650">•</span>
          <span>Sahal Wallet</span>
          <span className="text-slate-650">•</span>
          <span>Premier Bank</span>
          <span className="text-slate-650">•</span>
          <span>Somali support</span>
        </div>
      </div>
    </section>
  );
}
