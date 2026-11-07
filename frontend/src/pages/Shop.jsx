import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CheckCircle2, GraduationCap } from "lucide-react";
import usePackageCatalog from "../hooks/usePackageCatalog";
import { handlePackageSelect } from "../utils/packageSelection";

export default function Shop() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { packages } = usePackageCatalog();

  return (
    <div className="relative min-h-screen bg-[#0f172a] text-white">
      <header className="border-b border-slate-800 bg-[#1e293b]/60 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-md">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-outfit text-xl font-extrabold tracking-tight">
              SomPrep <span className="text-indigo-400">AI</span>
            </span>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold hover:bg-slate-700 transition"
          >
            Dashboard
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Package Checkout
          </span>
          <h1 className="mt-3 font-outfit text-4xl font-extrabold tracking-tight">
            Choose Your SomPrep AI Package
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-400 leading-relaxed">
            Select an academic or technology learning package. Payment continues through the secure mobile-money payment screen.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((pkg) => {
            return (
              <div key={pkg.id} className="rounded-3xl border border-slate-800 bg-[#1e293b]/60 p-7 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                    {pkg.category}
                  </span>
                  <h2 className="mt-2 text-xl font-extrabold text-white">
                    {pkg.displayTitle || pkg.title}
                  </h2>
                  <p className="mt-2 text-xs text-slate-400">{pkg.audience}</p>
                  <div className="mt-5 rounded-2xl border border-slate-800 bg-[#0f172a]/50 p-4">
                    <span className="text-2xl font-black text-white">{pkg.annualPrice}</span>
                    <span className="ml-1 text-xs text-slate-500">/ 12 months</span>
                    {pkg.monthlyPrice ? (
                      <span className="block mt-1 text-xs font-bold text-indigo-300">
                        or {pkg.monthlyPrice} monthly
                      </span>
                    ) : null}
                  </div>
                  <ul className="mt-5 space-y-2">
                    {(pkg.packageFeatures || pkg.features).slice(0, 5).map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => handlePackageSelect({ packageId: pkg.id, user, navigate })}
                  className="mt-7 w-full rounded-xl bg-[#6366f1] py-3.5 text-xs font-bold text-white hover:bg-[#4f46e5] transition"
                >
                  {pkg.button}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
