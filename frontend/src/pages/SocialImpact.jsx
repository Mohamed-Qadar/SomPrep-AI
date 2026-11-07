import React from "react";
import { useNavigate } from "react-router-dom";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import { CheckCircle2, Heart, Award, Users, BookOpen } from "lucide-react";

export default function SocialImpact() {
  const navigate = useNavigate();

  const impactAreas = [
    { title: "Graduate Content Writers", desc: "We hire top-performing Somali university graduates to draft, sequence, and code curriculum nodes into the roadmap." },
    { title: "Academic Proofreading Slots", desc: "Employs senior secondary school instructors as editors to audit question banks before publication." },
    { title: "Local Language Media Recording", desc: "Invests in high-quality digital video filming studios and local translators to build standard learning files in Af-Somali." },
    { title: "NGO & Bulk Sponsor Programs", desc: "Coordinates voucher distribution with local foundations to grant platform access to students in displacement camps." }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans overflow-x-hidden">
      <PublicNavbar />
      
      {/* Background Gradients */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[36rem] w-[36rem] rounded-full bg-[#6366f1]/[0.05] blur-[120px]" />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Social Enterprise Model</span>
          <h1 className="font-outfit text-4xl font-extrabold text-white">Our Social Impact & Mission</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            SomPrep AI is built as a social enterprise. Discover how our operations stimulate youth employment and fund local educational content creation.
          </p>
        </div>

        {/* Impact areas grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 max-w-5xl mx-auto">
          {impactAreas.map((area, idx) => (
            <div key={idx} className="rounded-3xl border border-slate-800 bg-[#1e293b]/40 p-8 space-y-3 hover:border-slate-700 transition">
              <span className="block text-xs font-bold text-indigo-400 uppercase tracking-widest text-[9px]">Impact Pillar {idx + 1}</span>
              <h3 className="text-base font-bold text-white">{area.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{area.desc}</p>
            </div>
          ))}
        </div>

        {/* Narrative Section */}
        <div className="max-w-4xl mx-auto rounded-3xl border border-slate-800 bg-[#1e293b]/20 p-8 space-y-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-400 fill-red-400/20" />
            Funding Somalia's Digital Content Factory
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Creating high-quality learning content for Grade 1 through Grade 12 requires continuous updates, translations, and video recordings. Rather than outsourcing this development, SomPrep AI maintains a Mogadishu-based digital content factory. 
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every subscription price paid ($2.50 USD) helps directly fund job stipends for trained Somali university graduates. These graduates work as video script writers, graphic artists, and educational coordinators, developing local capacities and providing high-quality digital career starting slots for local youth.
          </p>
          <div className="pt-2 text-center sm:text-left">
            <button
              onClick={() => navigate("/contact")}
              className="rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] px-6 py-3.5 text-xs font-bold text-white shadow-md transition"
            >
              Partner with Us
            </button>
          </div>
        </div>

      </section>

      <PublicFooter />
    </div>
  );
}
