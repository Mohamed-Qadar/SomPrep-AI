import React, { useState } from "react";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import { Mail, Phone, MapPin, Send, MessageSquare } from "lucide-react";

export default function Contact() {
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    role: "Student",
    message: ""
  });
  const [status, setStatus] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phoneNumber || !formData.message) {
      setStatus("Please fill in your name, phone, and message.");
      return;
    }
    setStatus("Thank you! Your message was received successfully. The SomPrep AI team will get in touch with you shortly.");
    setFormData({ fullName: "", phoneNumber: "", role: "Student", message: "" });
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans overflow-x-hidden">
      <PublicNavbar />
      
      {/* Background Gradients */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[36rem] w-[36rem] rounded-full bg-[#6366f1]/[0.05] blur-[120px]" />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Support Center</span>
          <h1 className="font-outfit text-4xl font-extrabold text-white">Get in Touch with Us</h1>
          <p className="text-sm text-slate-400 leading-relaxed font-medium">
            Have questions about student packages, mobile-money payment prompts, or school bulk licensing? Write to us below.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start max-w-5xl mx-auto">
          
          {/* Contact Details (Left) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-[#1e293b]/20 p-8 space-y-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Contact Info</h3>
              
              <div className="space-y-4 text-xs text-slate-350">
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-bold text-white">Call Support</span>
                    <a href="tel:+252618105346" className="block text-[11px] text-slate-400 mt-0.5 hover:text-white transition">+252 61 810 5346</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-bold text-white">WhatsApp Support</span>
                    <a href="https://wa.me/905531714783" target="_blank" rel="noopener noreferrer" className="block text-[11px] text-emerald-400 mt-0.5 hover:text-white transition">+90 553 171 4783</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-bold text-white">Email Address</span>
                    <a href="mailto:mohamedqadar280@gmail.com" className="block text-[11px] text-slate-400 mt-0.5 hover:text-white transition">mohamedqadar280@gmail.com</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-bold text-white">Mogadishu Headquarters</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">Wadada Maka Al Mukarama, Mogadishu, Somalia</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Lead Form (Right) */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-[#1e293b]/35 p-8 shadow-xl space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="h-4.5 w-4.5 text-indigo-400" />
              Send a Message
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Abdirahman Warsame"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="+252 61 XXX XXXX"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Your Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="Student" className="bg-[#1e293b]">Student</option>
                  <option value="Parent" className="bg-[#1e293b]">Parent</option>
                  <option value="Teacher" className="bg-[#1e293b]">Teacher</option>
                  <option value="School" className="bg-[#1e293b]">School Administrator</option>
                  <option value="Partner" className="bg-[#1e293b]">Partner / Sponsor</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows="4"
                  placeholder="Detail your inquiry here..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none transition resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] py-3.5 text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send Message</span>
              </button>
            </form>

            {status && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-center text-xs text-indigo-300 animate-in fade-in duration-200">
                {status}
              </div>
            )}
          </div>

        </div>

      </section>

      <PublicFooter />
    </div>
  );
}
