import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserInitials } from "../utils/packageLabels";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CreditCard,
  Wallet,
  MessageSquare,
  Shield,
  Activity,
  FileText,
  LogOut,
  Sparkles,
  Menu,
  X,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", path: "/admin", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Content",
    items: [
      { name: "Questions Bank", path: "/admin/manage?tab=questions", icon: BookOpen },
      { name: "Teachers", path: "/admin/manage?tab=teachers", icon: Users },
      { name: "Packages & Pricing", path: "/admin/manage?tab=packages", icon: CreditCard },
    ],
  },
  {
    label: "Payments",
    items: [
      { name: "Payment Review", path: "/admin/payment-review", icon: CreditCard },
      { name: "Payment Accounts", path: "/admin/payment-accounts", icon: Wallet, adminOnly: true },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Moderation", path: "/admin/moderation", icon: MessageSquare },
      { name: "Webhook Events", path: "/admin/webhook-events", icon: Activity, adminOnly: true },
      { name: "Audit Logs", path: "/admin/audit-logs", icon: Shield, adminOnly: true },
      { name: "System Health", path: "/admin/system-health", icon: Activity, adminOnly: true },
      { name: "Reviewer Portal", path: "/reviewer", icon: FileText },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isItemActive = (item) => {
    const [path, query] = item.path.split("?");
    if (item.exact) return location.pathname === path;
    if (location.pathname !== path) return location.pathname.startsWith(path + "/");
    if (!query) return true;
    // Distinguish the three /admin/manage tabs by their tab query param.
    const wanted = new URLSearchParams(query).get("tab");
    const current = new URLSearchParams(location.search).get("tab") || "questions";
    return wanted === current;
  };

  const NavList = ({ onNavigate }) => (
    <nav className="space-y-5">
      {NAV_SECTIONS.map((section) => {
        const items = section.items.filter((i) => !i.adminOnly || user?.role === "admin");
        if (items.length === 0) return null;
        return (
          <div key={section.label}>
            <p className="px-4 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
              {section.label}
            </p>
            <div className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                      active
                        ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 border-y-transparent border-r-transparent"
                        : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      <button
        onClick={logout}
        className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border border-transparent text-slate-400 hover:text-brand-danger hover:bg-brand-danger/10"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span>Ka Bax (Logout)</span>
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#0c031a] text-white flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-brand-border/40 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-indigo to-indigo-700 shadow-md">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="font-outfit text-xl font-extrabold tracking-tight">
                SomPrep <span className="bg-gradient-to-r from-brand-indigo to-indigo-400 bg-clip-text text-transparent">AI</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-danger/20 text-red-400 border border-brand-danger/30 hidden sm:inline-block">
                Maamulka · Admin Panel
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-indigo/20 text-brand-indigo border border-brand-indigo/30 font-mono hidden md:inline-block">
              Role: {user?.role}
            </span>
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-white">{user?.full_name || "Admin"}</span>
              <span className="text-[10px] text-slate-500">{user?.phone_number}</span>
            </div>
            <div className="h-9 w-9 rounded-full bg-brand-indigo/10 border border-brand-indigo/35 flex items-center justify-center text-brand-indigo font-bold text-sm uppercase">
              {getUserInitials(user?.full_name, "A")}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex max-w-[1400px] w-full mx-auto px-0 sm:px-6 lg:px-8 relative">
        {/* Left Sidebar - Desktop */}
        <aside className="w-60 shrink-0 hidden lg:block py-8 pr-6 border-r border-brand-border/40">
          <NavList />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <div className="relative w-64 bg-[#0c031a] border-r border-brand-border h-full p-6 overflow-y-auto z-50 animate-slide-in">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-brand-primary" />
                  <span className="font-outfit font-black text-lg">SomPrep Admin</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavList onNavigate={() => setMobileOpen(false)} />
            </div>
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
