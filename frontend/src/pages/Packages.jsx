import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import TechnologyPackagesSection from "../components/TechnologyPackagesSection";
import { CheckCircle2, CreditCard } from "lucide-react";
import usePackageCatalog from "../hooks/usePackageCatalog";

export default function Packages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { packages: allPackages, byId: packageMap } = usePackageCatalog();
  const packages = allPackages.filter((pkg) => pkg.category === "academic");
  const requestedLevel = searchParams.get("level");
  const requestedTarget = searchParams.get("target");
  const activePkgId = packageMap[requestedLevel]
    ? requestedLevel
    : requestedTarget === "g8"
    ? "middle"
    : requestedTarget === "g12"
    ? "secondary"
    : "academic";

  return (
    <div className="min-h-screen bg-[#0c031a] text-white font-sans overflow-x-hidden pb-20 sm:pb-0">
      <PublicNavbar />
      <div className="pointer-events-none absolute -top-48 -left-48 h-[36rem] w-[36rem] rounded-full bg-[#6366f1]/[0.05] blur-[120px]" />

      <section className="relative mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-8 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Simple Transparent Pricing
          </span>
          <h1 className="font-outfit text-4xl font-extrabold text-white">
            Affordable Learning Packages
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            The full Academic Exam Prep Bundle covers Primary, Middle, and Secondary learning
            for <strong className="text-white">$7.50 USD / 12 months</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 max-w-6xl mx-auto items-stretch">
          {packages.map((pkg) => {
            const isActive = pkg.id === activePkgId;
            return (
              <div
                key={pkg.id}
                className={`rounded-3xl border p-8 flex flex-col justify-between hover:border-slate-500 transition duration-300 ${
                  isActive
                    ? "border-[#6366f1] bg-gradient-to-b from-[#1c1230] to-[#0c031a] sm:scale-105 shadow-xl relative"
                    : "border-white/[0.05] bg-[#130b24]/40 hover:bg-[#1a1130]/30"
                }`}
              >
                {isActive && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#6366f1] px-4 py-1 text-[9px] font-bold uppercase tracking-widest text-white shadow-md">
                    {pkg.popular ? "Recommended" : "Selected"}
                  </span>
                )}

                <div className="space-y-5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {pkg.target}
                    </span>
                    <span className="block text-[10px] font-semibold text-slate-550 mt-2">
                      {pkg.audience}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1 font-outfit">{pkg.title}</h3>
                  </div>

                  <div className="py-3 border-y border-slate-800/80 flex items-baseline">
                    <span className="text-3xl font-black text-white font-outfit">{pkg.annualPrice}</span>
                    <span className="text-slate-500 text-[11px] font-semibold ml-1.5">
                      / 12 months
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Included Features
                    </span>
                    <ul className="space-y-2.5">
                      {pkg.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5 text-[11px] text-slate-305">
                          <CheckCircle2 className="h-4 w-4 text-[#6366f1] shrink-0 mt-0.5" />
                          <span className="leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={() => navigate(`/register?package=${pkg.id}`)}
                    className={`w-full rounded-xl py-3.5 text-xs font-bold transition duration-200 active:scale-[0.98] ${
                      isActive
                        ? "bg-[#6366f1] hover:bg-[#4f46e5] text-white shadow-md shadow-[#6366f1]/20 btn-shimmer relative overflow-hidden"
                        : "bg-[#1e293b] border border-slate-850 text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {pkg.button}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <TechnologyPackagesSection />

        <div className="max-w-4xl mx-auto mt-24 rounded-3xl border border-white/[0.05] bg-[#1a1130]/20 p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/[0.05] pb-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-outfit">Mobile Money Payment</h3>
              <p className="text-xs text-slate-400">
                Choose a package, log in if needed, then enter your payment phone number at checkout.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
            <div className="space-y-4">
              <h4 className="font-bold text-white font-outfit">1. Mobile Money phone-number checkout</h4>
              <p className="text-slate-400 leading-relaxed">
                The checkout page is designed for mobile-money payment requests. Real payment confirmation
                will be completed after admin integration.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-white font-outfit">2. School and sponsored access</h4>
              <p className="text-slate-400 leading-relaxed">
                Schools and sponsors can coordinate access through vouchers or bulk license workflows.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/[0.05] bg-[#1a1130]/20 p-6 hover:border-slate-700 transition">
            <span className="text-xs font-bold text-white block font-outfit">School Licenses</span>
            <p className="text-[11px] text-slate-450 leading-relaxed mt-2">
              Contact our support team for school license planning and bulk access.
            </p>
            <Link to="/schools" className="mt-4 inline-block text-xs font-bold text-indigo-400 hover:text-indigo-300">
              Contact school team
            </Link>
          </div>

          <div className="rounded-2xl border border-white/[0.05] bg-[#1a1130]/20 p-6 hover:border-slate-700 transition">
            <span className="text-xs font-bold text-white block font-outfit">Sponsored Access</span>
            <p className="text-[11px] text-slate-450 leading-relaxed mt-2">
              Sponsors can support student access for academic and technology learning paths.
            </p>
            <Link to="/contact" className="mt-4 inline-block text-xs font-bold text-indigo-400 hover:text-indigo-300">
              Sponsor a classroom
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />

      {/* Sticky Bottom CTA for Mobile screens */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#120826]/95 backdrop-blur-md border-t border-white/[0.08] p-4 flex items-center justify-between shadow-2xl">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ready to prep?</span>
          <span className="text-[11px] text-emerald-400 font-black mt-0.5">$7.50 USD / 12 Months</span>
        </div>
        <Link
          to={user ? "/dashboard" : "/register"}
          className="rounded-xl bg-[#6366f1] px-5 py-3 text-xs font-bold text-white shadow-md active:scale-95 transition"
        >
          Start Learning Now
        </Link>
      </div>
    </div>
  );
}
