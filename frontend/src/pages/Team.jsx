import React from "react";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import { Users, GraduationCap, Code, ShieldCheck } from "lucide-react";

export default function Team() {
  const members = [
    { name: "Ahmed Warsame", role: "Co-Founder & Technology Director", specialty: "Full-Stack Edtech Architecture" },
    { name: "Halima Farah", role: "Head of Curriculum Design", specialty: "Somali Unified Syllabus Mapping" },
    { name: "Dr. Mohamud Ali", role: "Syllabus Review Coordinator", specialty: "Secondary Science Standards Audit" },
    { name: "Fardowsa Ibrahim", role: "NGO Outreach Manager", specialty: "Regional Voucher Partnerships" }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans overflow-x-hidden">
      <PublicNavbar />
      
      {/* Background Gradients */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[36rem] w-[36rem] rounded-full bg-[#6366f1]/[0.05] blur-[120px]" />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">SomPrep AI Team</span>
          <h1 className="font-outfit text-4xl font-extrabold text-white">Our Team & Academic Board</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Meet the technology architects, subject-matter experts, and teachers building Somalia's premium digital exam preparation environment.
          </p>
        </div>

        {/* Member cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-20 max-w-6xl mx-auto">
          {members.map((member, idx) => (
            <div key={idx} className="rounded-3xl border border-slate-800 bg-[#1e293b]/40 p-6 space-y-4 hover:border-slate-700 transition text-center flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mx-auto text-xl font-bold">
                  {member.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{member.name}</h3>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase block mt-1">{member.role}</span>
                </div>
              </div>
              <div className="border-t border-slate-800/80 pt-3 text-[10px] text-slate-500">
                Specialty: {member.specialty}
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto rounded-2xl border border-slate-800 bg-[#1e293b]/20 p-6 text-center text-xs text-slate-400 leading-relaxed">
          🎓 <strong>Academic Quality Board:</strong> Our curriculum board includes over 12 senior physics, mathematics, and Somali language educators who proofread mock papers and review student performance metrics weekly.
        </div>

      </section>

      <PublicFooter />
    </div>
  );
}
