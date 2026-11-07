import React, { useState } from "react";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import { CheckCircle2, ShieldCheck, Mail, Phone, Users, Landmark } from "lucide-react";

export default function Schools() {
  const [formData, setFormData] = useState({
    schoolName: "",
    contactName: "",
    email: "",
    phone: "",
    studentCount: "50-100",
    message: ""
  });
  const [status, setStatus] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.schoolName || !formData.contactName || !formData.email || !formData.phone) {
      setStatus("Please fill in all contact fields.");
      return;
    }
    setStatus("Thank you! Your institutional licensing inquiry was logged. A school coordinator will contact you shortly.");
    setFormData({ schoolName: "", contactName: "", email: "", phone: "", studentCount: "50-100", message: "" });
  };

  const schoolFeatures = [
    { title: "Class Performance Dashboard", desc: "Allows teachers to inspect individual and group level study metrics, completion rates, and average speeds." },
    { title: "Push Blueprint Assessments", desc: "Push standardized mock exam blueprints or specific topic quizzes to selected classrooms as home assignments." },
    { title: "Student Risk Detection", desc: "Algorithms flag students who are falling behind in syllabus progress or showing consecutive low mock marks." },
    { title: "Topic Weakness Heatmaps", desc: "See where the entire class is struggling. Adjust your physical classroom lectures based on real mastery data." }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans overflow-x-hidden">
      <PublicNavbar />
      
      {/* Background Gradients */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[36rem] w-[36rem] rounded-full bg-[#6366f1]/[0.05] blur-[120px]" />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Institutional Partnerships</span>
          <h1 className="font-outfit text-4xl font-extrabold text-white">For Schools & Digital Teachers</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Equip your school, teachers, and classrooms with SomPrep AI's structured curricula, student diagnostic grids, and homework assignment managers.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 max-w-5xl mx-auto">
          {schoolFeatures.map((feat, idx) => (
            <div key={idx} className="rounded-3xl border border-slate-800 bg-[#1e293b]/40 p-8 space-y-3 hover:border-slate-700 transition">
              <span className="block text-xs font-bold text-indigo-400 uppercase tracking-widest">Feature {idx + 1}</span>
              <h3 className="text-base font-bold text-white">{feat.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>

        {/* School Sales Form */}
        <div className="max-w-xl mx-auto rounded-3xl border border-slate-800 bg-[#1e293b]/30 p-8 shadow-xl space-y-6">
          <div className="text-center space-y-1">
            <h2 className="font-outfit text-xl font-extrabold text-white">Institutional Licensing Request</h2>
            <p className="text-xs text-slate-400">Submit this form to request a callback from our Mogadishu operations team.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-slate-400">School Name</label>
                <input
                  type="text"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  placeholder="Mogadishu Academy"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Contact Person Name</label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="Ali Mohamed"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Official Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@school.so"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+252 61 XXX XXXX"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-400">Approximate Student Count</label>
              <select
                value={formData.studentCount}
                onChange={(e) => setFormData({ ...formData, studentCount: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="50-100" className="bg-[#1e293b]">50 - 100 Students</option>
                <option value="100-300" className="bg-[#1e293b]">100 - 300 Students</option>
                <option value="300-500" className="bg-[#1e293b]">300 - 500 Students</option>
                <option value="500+" className="bg-[#1e293b]">500+ Students</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-400">Message / Request Details</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows="4"
                placeholder="Inquire about bulk voucher pricing plans..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] py-3.5 text-xs font-bold text-white shadow-md transition"
            >
              Submit Licensing Inquiry
            </button>
          </form>

          {status && (
            <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-4 text-center text-xs text-indigo-300">
              {status}
            </div>
          )}
        </div>

      </section>

      <PublicFooter />
    </div>
  );
}
