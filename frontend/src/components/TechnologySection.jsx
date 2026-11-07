import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Cpu, Database, FileText, Presentation, Code2, BriefcaseBusiness } from "lucide-react";
import { homepageTechnologyCards } from "../data/technologySkills";
import { useAuth } from "../context/AuthContext";
import { packagesData } from "../data/packagesData";
import { handlePackageSelect } from "../utils/packageSelection";

const iconByIndex = [FileText, Database, Presentation, Cpu, Code2, BriefcaseBusiness];

export default function TechnologySection() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-b border-white/[0.05]">
      <div className="max-w-3xl mb-10">
        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
          Technology Skills Development
        </span>
        <h2 className="mt-3 font-outfit text-3xl font-extrabold text-white">
          Technology Skills for Somalia's Digital Future
        </h2>
        <p className="mt-4 text-sm text-slate-400 leading-relaxed">
          SomPrep AI also supports practical technology skills for students, graduates, and working
          professionals. Learners can build essential digital skills such as Microsoft Word, Excel,
          PowerPoint, data analysis, programming, and machine learning through structured lessons and
          practice-based learning.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {homepageTechnologyCards.map((card, cardIndex) => (
          <div
            key={card.title}
            className="rounded-3xl border border-white/[0.06] bg-[#1a1130]/40 p-7 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {card.audience}
                </span>
                <h3 className="mt-2 text-xl font-extrabold text-white">{card.title}</h3>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-2xl font-black text-white">
                    {packagesData[card.packageId]?.annualPrice}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">/ 12 months</span>
                  <span className="text-[11px] font-bold text-indigo-300">
                    or {packagesData[card.packageId]?.monthlyPrice} monthly
                  </span>
                </div>
              </div>
              <div className="h-11 w-11 rounded-xl border border-indigo-500/20 bg-indigo-500/10 flex items-center justify-center text-indigo-300">
                {React.createElement(iconByIndex[cardIndex], { className: "h-5 w-5" })}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {card.features.map((feature, index) => {
                const Icon = iconByIndex[index] || CheckCircle2;
                return (
                  <div key={feature} className="flex items-start gap-2 text-xs text-slate-300">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                    <span>{feature}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link
                to={card.path}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6366f1] px-5 py-3 text-xs font-bold text-white hover:bg-[#4f46e5] transition"
              >
                <span>{card.cta}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() => handlePackageSelect({ packageId: card.packageId, user, navigate })}
                className="inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-xs font-bold text-slate-200 hover:bg-white/[0.08] transition"
              >
                {packagesData[card.packageId]?.button}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
