import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Sparkles,
  LayoutDashboard,
  Video,
  FileSpreadsheet,
  User,
  LogOut,
  GraduationCap,
  Menu,
  X,
} from "lucide-react";

export default function TeacherLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const menuItems = [
    { name: "Dashboard", path: "/teacher", icon: LayoutDashboard },
    { name: "Koorsooyinka (Courses)", path: "/teacher/courses", icon: LayoutDashboard },
    { name: "Muuqaallada (Videos)", path: "/teacher/videos", icon: Video },
    { name: "Imtixaanada (Exams)", path: "/teacher/exams", icon: FileSpreadsheet },
    { name: "Ardayda (Students)", path: "/teacher/students", icon: User },
    { name: "Profile", path: "/teacher/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#0c031a] text-white flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-brand-border/60 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-indigo to-indigo-700 shadow-md">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="font-outfit text-xl font-extrabold tracking-tight">
                SomPrep <span className="bg-gradient-to-r from-brand-indigo to-indigo-400 bg-clip-text text-transparent">AI</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-primary/25 text-brand-primary border border-brand-primary/30 hidden sm:inline-block">
                Portal-ka Macallinka
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-white">{user?.full_name}</span>
              <span className="text-xs text-slate-500">{user?.subject || "General Teacher"}</span>
            </div>
            <div className="h-9 w-9 rounded-full bg-brand-indigo/10 border border-brand-indigo/35 flex items-center justify-center text-brand-indigo font-bold text-sm uppercase">
              {user?.full_name?.charAt(0) || "T"}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-0 sm:px-6 lg:px-8 relative">
        {/* Left Sidebar - Desktop */}
        <aside className="w-64 shrink-0 hidden lg:block py-8 pr-6 border-r border-brand-border/40">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all border ${
                    isActive
                      ? "bg-brand-primary/10 border-brand-primary/30 text-brand-primary shadow-lg shadow-brand-primary/5"
                      : "border-transparent text-slate-400 hover:text-white hover:bg-slate-900/50"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all border border-transparent text-slate-400 hover:text-brand-danger hover:bg-brand-danger/10 mt-8"
            >
              <LogOut className="h-4.5 w-4.5 shrink-0" />
              <span>Ka Bax (Logout)</span>
            </button>
          </nav>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            
            {/* Sidebar content */}
            <nav className="relative w-64 bg-[#0c031a] border-r border-brand-border h-full p-6 flex flex-col justify-between z-50 animate-slide-in">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-brand-primary" />
                    <span className="font-outfit font-black text-lg">SomPrep Portal</span>
                  </div>
                  <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all border ${
                          isActive
                            ? "bg-brand-primary/10 border-brand-primary/30 text-brand-primary"
                            : "border-transparent text-slate-400 hover:text-white hover:bg-slate-900/50"
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5 shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all border border-transparent text-slate-400 hover:text-brand-danger hover:bg-brand-danger/10"
              >
                <LogOut className="h-4.5 w-4.5 shrink-0" />
                <span>Ka Bax (Logout)</span>
              </button>
            </nav>
          </div>
        )}

        {/* Right Outlet Pane */}
        <main className="flex-1 min-w-0 py-8 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
