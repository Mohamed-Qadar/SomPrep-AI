import React from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Facebook, Twitter, Github, Linkedin, Mail, Phone, MapPin } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="bg-[#0b0f19] border-t border-slate-800 text-slate-400 text-xs py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        
        {/* Brand Column */}
        <div className="lg:col-span-2 space-y-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366f1] to-indigo-700 shadow-md">
              <GraduationCap className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-outfit text-lg font-extrabold tracking-tight text-white">
              SomPrep <span className="text-indigo-400">AI</span>
            </span>
          </Link>
          <p className="text-slate-400 leading-relaxed max-w-sm">
            SomPrep AI is a Somalia-focused digital learning and exam preparation platform built for local curriculum needs, low-cost access, and AI-supported student progress.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <a href="https://www.facebook.com/Mohamedibrahimabdi280" target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition" title="Facebook"><Facebook className="h-4 w-4" /></a>
            <a href="https://x.com/mohamedqadar280" target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition" title="X (Twitter)"><Twitter className="h-4 w-4" /></a>
            <a href="https://github.com/Mohamed-Qadar" target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition" title="GitHub"><Github className="h-4 w-4" /></a>
            <a href="https://www.linkedin.com/in/mohamed-ibrahim-abdi-572475232/" target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition" title="LinkedIn"><Linkedin className="h-4 w-4" /></a>
          </div>
        </div>

        {/* Link Column 1: Packages */}
        <div className="space-y-3">
          <h5 className="font-bold text-white uppercase tracking-wider text-[10px]">Learning Packages</h5>
          <ul className="space-y-2.5">
            <li><Link to="/packages?level=primary" className="hover:text-white transition">Primary / Grade 1–4</Link></li>
            <li><Link to="/packages?level=middle" className="hover:text-white transition">Middle / Grade 5–8</Link></li>
            <li><Link to="/packages?level=secondary" className="hover:text-white transition">Secondary / Grade 9–12</Link></li>
            <li><Link to="/packages?target=g8" className="hover:text-white transition">Grade 8 Exam Prep</Link></li>
            <li><Link to="/packages?target=g12" className="hover:text-white transition">Grade 12 National Exam Prep</Link></li>
          </ul>
        </div>

        {/* Link Column 2: Solutions */}
        <div className="space-y-3">
          <h5 className="font-bold text-white uppercase tracking-wider text-[10px]">Platform & Impact</h5>
          <ul className="space-y-2.5">
            <li><Link to="/features" className="hover:text-white transition">Features & AI Coach</Link></li>
            <li><Link to="/schools" className="hover:text-white transition">For Schools</Link></li>
            <li><Link to="/social-impact" className="hover:text-white transition">Social Impact</Link></li>
            <li><Link to="/academic-quality" className="hover:text-white transition">Academic Quality</Link></li>
            <li><Link to="/sample-videos" className="hover:text-white transition">Sample Lesson Videos</Link></li>
          </ul>
        </div>

        {/* Link Column 3: Contact & Info */}
        <div className="space-y-3">
          <h5 className="font-bold text-white uppercase tracking-wider text-[10px]">Contact Us</h5>
          <ul className="space-y-2.5 text-[11px]">
            <li className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <a href="tel:+252618105346" className="hover:text-white transition">Call: +252 61 810 5346</a>
                <a href="https://wa.me/905531714783" target="_blank" rel="noopener noreferrer" className="hover:text-white transition text-emerald-400">WhatsApp: +90 553 171 4783</a>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <a href="mailto:mohamedqadar280@gmail.com" className="hover:text-white transition">mohamedqadar280@gmail.com</a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>Mogadishu, Somalia</span>
            </li>
            <li className="pt-2">
              <Link to="/contact" className="inline-block px-3 py-1.5 rounded-lg border border-slate-800 hover:border-indigo-500 hover:text-white transition">
                Send a Message
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
        <p>© {new Date().getFullYear()} SomPrep AI. Somalia-focused digital learning and exam preparation.</p>
        <div className="flex gap-4">
          <Link to="/login" className="hover:text-slate-300 transition">Student Login</Link>
          <span>·</span>
          <Link to="/register" className="hover:text-slate-300 transition">Register Account</Link>
          <span>·</span>
          <Link to="/about" className="hover:text-slate-300 transition">About</Link>
        </div>
      </div>
    </footer>
  );
}
