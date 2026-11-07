import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { handlePackageSelect } from "../utils/packageSelection";
import { 
  GraduationCap, 
  Menu, 
  X, 
  ChevronDown, 
  Globe, 
  Phone, 
  Mail, 
  Facebook, 
  Twitter, 
  Github,
  Linkedin,
  LayoutDashboard
} from "lucide-react";

export default function PublicNavbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [lang, setLang] = useState("en");

  const toggleDropdown = (name) => {
    if (activeDropdown === name) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(name);
    }
  };

  return (
    <header className="w-full relative z-50">
      {/* Top slim information bar */}
      <div className="hidden md:block w-full bg-[#1c1230] border-b border-white/[0.08] text-[11px] text-slate-350 py-2.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-row items-center justify-between">
          {/* Left: Contact Info */}
          <div className="flex items-center gap-4 sm:gap-6">
            <a href="tel:+252618105346" className="flex items-center gap-1.5 hover:text-white transition">
              <Phone className="h-3 w-3 text-indigo-400" />
              <span>+252 61 810 5346</span>
            </a>
            <a href="https://wa.me/905531714783" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white transition">
              <span className="text-emerald-400 font-bold">WA:</span>
              <span>+90 553 171 4783</span>
            </a>
            <a href="mailto:mohamedqadar280@gmail.com" className="flex items-center gap-1.5 hover:text-white transition">
              <Mail className="h-3 w-3 text-indigo-400" />
              <span>mohamedqadar280@gmail.com</span>
            </a>
          </div>

          {/* Right: Social and language controls */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex items-center gap-2.5 text-slate-400">
              <a href="https://www.facebook.com/Mohamedibrahimabdi280" target="_blank" rel="noopener noreferrer" className="hover:text-white transition" title="Facebook"><Facebook className="h-3.5 w-3.5" /></a>
              <a href="https://x.com/mohamedqadar280" target="_blank" rel="noopener noreferrer" className="hover:text-white transition" title="X (Twitter)"><Twitter className="h-3.5 w-3.5" /></a>
              <a href="https://github.com/Mohamed-Qadar" target="_blank" rel="noopener noreferrer" className="hover:text-white transition" title="GitHub"><Github className="h-3.5 w-3.5" /></a>
              <a href="https://www.linkedin.com/in/mohamed-ibrahim-abdi-572475232/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition" title="LinkedIn"><Linkedin className="h-3.5 w-3.5" /></a>
            </div>
            
            {/* Language Selection */}
            <div className="flex items-center gap-1 border-l border-slate-700/60 pl-3">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <button 
                onClick={() => setLang(lang === "en" ? "so" : "en")}
                className="font-bold hover:text-white text-indigo-400 transition ml-0.5"
              >
                {lang === "en" ? "Somali (so)" : "English (en)"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="w-full bg-[#120826]/90 backdrop-blur-md border-b border-white/[0.05] sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo and tagline */}
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366f1] to-indigo-700 shadow-lg group-hover:scale-105 transition">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-outfit text-lg font-black tracking-tight text-white leading-none">
                  SomPrep <span className="text-indigo-400">AI</span>
                </span>
                <span className="text-[9px] text-slate-400 tracking-wider font-semibold uppercase mt-0.5">
                  waxbarashada dhijitaalka ah
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden xl:flex items-center gap-5 text-xs font-bold text-slate-200">
              <Link to="/" className="hover:text-white transition">Home</Link>
              
              {/* High-Fidelity Wide Dropdown for Packages */}
              <div className="relative">
                <button 
                  onClick={() => toggleDropdown('packages')}
                  onMouseEnter={() => setActiveDropdown('packages')}
                  className="flex items-center gap-1 hover:text-white transition py-4"
                >
                  <span>Packages</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${activeDropdown === 'packages' ? 'rotate-180' : ''}`} />
                </button>
                
                {activeDropdown === 'packages' && (
                  <div 
                    onMouseLeave={() => setActiveDropdown(null)}
                    className="absolute top-full left-1/2 -translate-x-1/2 w-[560px] mt-1 bg-[#1c1230] border border-white/[0.08] rounded-2xl shadow-2xl p-6 grid grid-cols-4 gap-5 animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    {/* Col 1 */}
                    <div className="space-y-3">
                      <span className="block text-[9px] font-black uppercase text-indigo-400 tracking-widest border-b border-white/[0.05] pb-1.5">Academic Packages</span>
                      <div className="flex flex-col space-y-2">
                        <Link to="/packages" className="hover:text-white text-slate-300 text-[11px] font-medium text-indigo-300 transition">Academic Packages</Link>
                        <button onClick={() => handlePackageSelect({ packageId: "academic", user, navigate })} className="text-left hover:text-white text-slate-300 text-[11px] transition">Academic Exam Prep (G1-12)</button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <span className="block text-[9px] font-black uppercase text-indigo-400 tracking-widest border-b border-white/[0.05] pb-1.5">Technology Packages</span>
                      <div className="flex flex-col space-y-2">
                        <Link to="/packages/technology" className="hover:text-white text-slate-300 text-[11px] font-medium text-indigo-300 transition">Technology Packages</Link>
                        <button onClick={() => handlePackageSelect({ packageId: "office-skills", user, navigate })} className="text-left hover:text-white text-slate-300 text-[11px] transition">Office Skills for Students</button>
                        <button onClick={() => handlePackageSelect({ packageId: "professional-tech", user, navigate })} className="text-left hover:text-white text-slate-300 text-[11px] transition">Professional Technology Skills</button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <span className="block text-[9px] font-black uppercase text-indigo-400 tracking-widest border-b border-white/[0.05] pb-1.5">School License</span>
                      <div className="flex flex-col space-y-2">
                        <Link to="/schools" className="hover:text-white text-slate-300 text-[11px] transition">School Bulk Licenses</Link>
                        <Link to="/academic-quality" className="hover:text-white text-slate-300 text-[11px] transition">Teacher Review Audit</Link>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <span className="block text-[9px] font-black uppercase text-indigo-400 tracking-widest border-b border-white/[0.05] pb-1.5">Sponsored Access</span>
                      <div className="flex flex-col space-y-2">
                        <Link to="/social-impact" className="hover:text-white text-slate-300 text-[11px] transition">Sponsored Access</Link>
                        <Link to="/contact" className="hover:text-white text-slate-300 text-[11px] transition">Sponsor a Classroom</Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button 
                  onClick={() => toggleDropdown('technology')}
                  onMouseEnter={() => setActiveDropdown('technology')}
                  className="flex items-center gap-1 hover:text-white transition py-4"
                >
                  <span>Technology Skills</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${activeDropdown === 'technology' ? 'rotate-180' : ''}`} />
                </button>
                
                {activeDropdown === 'technology' && (
                  <div 
                    onMouseLeave={() => setActiveDropdown(null)}
                    className="absolute top-full left-0 w-56 mt-1 bg-[#1c1230] border border-white/[0.08] rounded-xl shadow-xl p-2 py-3 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    <Link to="/technology-skills/office" className="block px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition text-[11px]">Office Skills for Students</Link>
                    <Link to="/technology-skills/data-analysis" className="block px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition text-[11px]">Data Analysis</Link>
                    <Link to="/technology-skills/programming" className="block px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition text-[11px]">Programming</Link>
                    <Link to="/technology-skills/machine-learning" className="block px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition text-[11px]">Machine Learning</Link>
                    <Link to="/technology-skills/professional" className="block px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition text-[11px]">Career Skills</Link>
                  </div>
                )}
              </div>

              <Link to="/sample-videos" className="hover:text-white transition">Sample Videos</Link>

              {/* Explore Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => toggleDropdown('explore')}
                  onMouseEnter={() => setActiveDropdown('explore')}
                  className="flex items-center gap-1 hover:text-white transition py-4"
                >
                  <span>Explore</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${activeDropdown === 'explore' ? 'rotate-180' : ''}`} />
                </button>
                
                {activeDropdown === 'explore' && (
                  <div 
                    onMouseLeave={() => setActiveDropdown(null)}
                    className="absolute top-full right-0 w-52 mt-1 bg-[#1c1230] border border-white/[0.08] rounded-xl shadow-xl p-2 py-3 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    <Link to="/features" className="block px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition text-[11px]">Platform Features</Link>
                    <Link to="/schools" className="block px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition text-[11px]">For Schools</Link>
                    <Link to="/social-impact" className="block px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition text-[11px]">Social Impact</Link>
                    <div className="border-t border-white/[0.05] my-1" />
                    <Link to="/about" className="block px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition text-[11px]">About SomPrep AI</Link>
                    <Link to="/academic-quality" className="block px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition text-[11px]">Academic Quality</Link>
                    <Link to="/team" className="block px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition text-[11px]">Our Team</Link>
                    <Link to="/contact" className="block px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition text-[11px]">Contact Us</Link>
                  </div>
                )}
              </div>
            </div>

            {/* CTAs */}
            <div className="hidden sm:flex items-center gap-4 shrink-0">
              {user ? (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="rounded-xl bg-gradient-to-r from-[#6366f1] to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#6366f1]/10 transition flex items-center gap-1.5"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Go to Dashboard</span>
                </button>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="text-xs font-bold text-slate-200 hover:text-white transition px-2 py-1"
                  >
                    Login
                  </Link>
                  <button
                    onClick={() => navigate("/register")}
                    className="rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#6366f1]/10 transition active:scale-[0.98]"
                  >
                    Register / Get Started
                  </button>
                </>
              )}
            </div>

            {/* Mobile hamburger menu */}
            <div className="flex xl:hidden items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:text-white focus:outline-none"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="xl:hidden w-full border-t border-slate-850 bg-[#120826] px-4 py-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col space-y-2">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 hover:bg-slate-800 rounded-lg text-sm text-slate-200 font-bold">Home</Link>
              
              <div>
                <button 
                  onClick={() => toggleDropdown('packages-mobile')}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-800 rounded-lg text-sm text-slate-200 font-bold"
                >
                  <span>Packages</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${activeDropdown === 'packages-mobile' ? 'rotate-180' : ''}`} />
                </button>
                
                {activeDropdown === 'packages-mobile' && (
                  <div className="pl-6 pr-2 py-2 space-y-1.5 border-l border-slate-800 ml-4 mt-1">
                    <Link to="/packages" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-indigo-400 hover:text-white">Academic Packages</Link>
                    <button onClick={() => { setMobileMenuOpen(false); handlePackageSelect({ packageId: "academic", user, navigate }); }} className="block text-left text-xs text-slate-400 hover:text-white">Academic Exam Prep (G1-12)</button>
                    <Link to="/packages/technology" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-indigo-400 hover:text-white">Technology Packages</Link>
                    <button onClick={() => { setMobileMenuOpen(false); handlePackageSelect({ packageId: "office-skills", user, navigate }); }} className="block text-left text-xs text-slate-400 hover:text-white">Office Skills for Students</button>
                    <button onClick={() => { setMobileMenuOpen(false); handlePackageSelect({ packageId: "professional-tech", user, navigate }); }} className="block text-left text-xs text-slate-400 hover:text-white">Professional Technology Skills</button>
                    <Link to="/schools" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-slate-400 hover:text-white">School License</Link>
                    <Link to="/social-impact" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-slate-400 hover:text-white">Sponsored Access</Link>
                  </div>
                )}
              </div>

              <div>
                <button 
                  onClick={() => toggleDropdown('technology-mobile')}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-800 rounded-lg text-sm text-slate-200 font-bold"
                >
                  <span>Technology Skills</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${activeDropdown === 'technology-mobile' ? 'rotate-180' : ''}`} />
                </button>
                
                {activeDropdown === 'technology-mobile' && (
                  <div className="pl-6 pr-2 py-2 space-y-1.5 border-l border-slate-800 ml-4 mt-1">
                    <Link to="/technology-skills/office" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-slate-400 hover:text-white">Office Skills for Students</Link>
                    <Link to="/technology-skills/data-analysis" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-slate-400 hover:text-white">Data Analysis</Link>
                    <Link to="/technology-skills/programming" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-slate-400 hover:text-white">Programming</Link>
                    <Link to="/technology-skills/machine-learning" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-slate-400 hover:text-white">Machine Learning</Link>
                    <Link to="/technology-skills/professional" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-slate-400 hover:text-white">Career Skills</Link>
                  </div>
                )}
              </div>

              <Link to="/sample-videos" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 hover:bg-slate-800 rounded-lg text-sm text-slate-200 font-bold">Sample Videos</Link>
              
              <div>
                <button 
                  onClick={() => toggleDropdown('explore-mobile')}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-800 rounded-lg text-sm text-slate-200 font-bold"
                >
                  <span>Explore</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${activeDropdown === 'explore-mobile' ? 'rotate-180' : ''}`} />
                </button>
                
                {activeDropdown === 'explore-mobile' && (
                  <div className="pl-6 pr-2 py-2 space-y-1.5 border-l border-slate-800 ml-4 mt-1">
                    <Link to="/features" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-slate-400 hover:text-white">Platform Features</Link>
                    <Link to="/schools" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-slate-400 hover:text-white">For Schools</Link>
                    <Link to="/social-impact" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-slate-400 hover:text-white">Social Impact</Link>
                    <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-slate-400 hover:text-white">About SomPrep AI</Link>
                    <Link to="/academic-quality" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-slate-400 hover:text-white">Academic Quality</Link>
                    <Link to="/team" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-slate-400 hover:text-white">Our Team</Link>
                    <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-slate-400 hover:text-white">Contact Us</Link>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2">
              {!user ? (
                <>
                  <Link 
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center rounded-xl border border-slate-800 bg-[#1e293b]/60 py-3 text-xs font-bold text-slate-200"
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center rounded-xl bg-[#6366f1] py-3 text-xs font-bold text-white shadow-md"
                  >
                    Register / Get Started
                  </Link>
                </>
              ) : (
                <Link 
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center rounded-xl bg-gradient-to-r from-[#6366f1] to-indigo-600 py-3 text-xs font-bold text-white"
                >
                  Student Dashboard
                </Link>
              )}
            </div>

            {/* Contact & Social Info in Mobile Menu */}
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <span className="block text-[9px] font-black uppercase text-indigo-400 tracking-widest">
                Contact Info
              </span>
              <div className="flex flex-col space-y-2.5 text-xs text-slate-350">
                <a href="tel:+252618105346" className="flex items-center gap-2 hover:text-white transition">
                  <Phone className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span>+252 61 810 5346</span>
                </a>
                <a href="https://wa.me/905531714783" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition">
                  <span className="text-emerald-400 font-bold text-[10px]">WA:</span>
                  <span>+90 553 171 4783</span>
                </a>
                <a href="mailto:mohamedqadar280@gmail.com" className="flex items-center gap-2 hover:text-white transition">
                  <Mail className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span>mohamedqadar280@gmail.com</span>
                </a>
              </div>
              <div className="flex items-center gap-3 text-slate-400 pt-2">
                <a href="https://www.facebook.com/Mohamedibrahimabdi280" target="_blank" rel="noopener noreferrer" className="hover:text-white transition"><Facebook className="h-4.5 w-4.5" /></a>
                <a href="https://x.com/mohamedqadar280" target="_blank" rel="noopener noreferrer" className="hover:text-white transition"><Twitter className="h-4.5 w-4.5" /></a>
                <a href="https://github.com/Mohamed-Qadar" target="_blank" rel="noopener noreferrer" className="hover:text-white transition"><Github className="h-4.5 w-4.5" /></a>
                <a href="https://www.linkedin.com/in/mohamed-ibrahim-abdi-572475232/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition"><Linkedin className="h-4.5 w-4.5" /></a>
              </div>
              
              {/* Language Selection */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                <Globe className="h-4 w-4 text-slate-400" />
                <button 
                  onClick={() => setLang(lang === "en" ? "so" : "en")}
                  className="text-xs font-bold text-indigo-400 hover:text-white transition"
                >
                  {lang === "en" ? "Somali (so)" : "English (en)"}
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
