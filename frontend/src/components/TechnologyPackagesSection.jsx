import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Cpu, FileText } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import usePackageCatalog from "../hooks/usePackageCatalog";
import { handlePackageSelect } from "../utils/packageSelection";

export default function TechnologyPackagesSection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const icons = [FileText, Cpu];
  const { packages } = usePackageCatalog();
  const technologyPackages = packages.filter((pkg) => pkg.category === "technology");

  return (
    <section id="technology-packages" className="max-w-6xl mx-auto mt-20">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
          Practical Digital Skills
        </span>
        <h2 className="mt-2 font-outfit text-3xl font-extrabold text-white">
          Technology Skills Packages
        </h2>
        <p className="mt-3 text-sm text-slate-400 leading-relaxed">
          Separate learning bundles for school digital skills and professional technology development.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {technologyPackages.map((pkg, index) => {
          const Icon = icons[index] || Cpu;
          return (
            <div
              key={pkg.id}
              className="rounded-3xl border border-indigo-500/20 bg-[#1a1130]/50 p-8 flex flex-col justify-between shadow-xl"
            >
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                      {pkg.audience}
                    </span>
                    <h3 className="mt-2 text-xl font-extrabold text-white font-outfit">{pkg.title}</h3>
                    {pkg.target ? (
                      <p className="mt-2 text-xs text-slate-400">{pkg.target}</p>
                    ) : null}
                  </div>
                  <div className="h-12 w-12 rounded-xl border border-indigo-500/20 bg-indigo-500/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-indigo-300" />
                  </div>
                </div>

                <div className="py-3 border-y border-slate-800/80 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-3xl font-black text-white font-outfit">{pkg.annualPrice}</span>
                  <span className="text-slate-500 text-[11px] font-semibold ml-1.5">
                    / 12 months
                  </span>
                  <span className="text-[11px] font-bold text-indigo-300">
                    or {pkg.monthlyPrice} monthly
                  </span>
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(pkg.packageFeatures || pkg.features).map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[11px] text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-[#6366f1] shrink-0 mt-0.5" />
                      <span className="leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pkg.detailsPath ? (
                  <Link
                    to={pkg.detailsPath}
                    className="w-full rounded-xl border border-white/[0.05] bg-[#130b24]/40 hover:bg-[#1a1130]/30 py-3.5 text-center text-xs font-bold text-slate-200 hover:border-slate-700 transition"
                  >
                    {pkg.id === "office-skills" ? "Explore Office Skills" : "Explore Professional Skills"}
                  </Link>
                ) : null}
                <button
                  onClick={() => handlePackageSelect({ packageId: pkg.id, user, navigate })}
                  className="w-full rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] py-3.5 text-xs font-bold text-white transition duration-200 active:scale-[0.98] btn-shimmer relative overflow-hidden"
                >
                  {pkg.button}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
