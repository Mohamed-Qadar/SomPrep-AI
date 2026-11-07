import React, { useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPackageLabel, getUserInitials } from "../utils/packageLabels";
import {
  Home,
  BookOpen,
  Trophy,
  ClipboardList,
  Bookmark,
  Map,
  Brain,
  User,
  LogOut,
  GraduationCap,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Zap,
  Flame,
  MessageSquare
} from "lucide-react";

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(true);

  // Admins have their own control center — never show them the student
  // portal (it would display subscription paywalls that don't apply).
  if (user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  // Helper to determine active link
  const isLinkActive = (path) => {
    return location.pathname === path;
  };

  // Helper to get active page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Guddiga Waxbarashada (Dashboard)";
    if (path.startsWith("/dashboard/courses/grade")) {
      const gNum = path.replace("/dashboard/courses/grade", "");
      return `Maaddooyinka Fasalka ${gNum}aad (Grade ${gNum} Subjects)`;
    }
    if (path === "/dashboard/my-courses") return "Koorsooyinka Macallimiinta (My Courses)";
    if (path === "/dashboard/tech") return "Xirfadaha Teknoolojiyada (Technology Skills)";
    if (path === "/dashboard/exams") return "Imtixaanada Tijaabada ah (Mock Exams)";
    if (path === "/dashboard/teacher-exams") return "Imtixaanada Macallinka (Teacher Exams)";
    if (path === "/dashboard/community") return "Madasha Ardayda (Student Community)";
    if (path === "/dashboard/wrong-answers") return "Buugga Khalaadaadka (Wrong-Answer Notebook)";
    if (path === "/dashboard/roadmap") return "Khariidada Mawduucyada (Concept Roadmap)";
    if (path === "/dashboard/ai-coach") return "Falanqaynta AI (AI Coach Refik)";
    if (path === "/dashboard/profile") return "Profile-ka Ardayga (Student Profile)";
    return "SomPrep AI";
  };

  const getCourseLinks = () => {
    const pkg = user?.package_type || "academic";
    if (pkg === "academic") {
      return Array.from({ length: 12 }, (_, index) => ({
        grade: index + 1,
        label: `Grade ${index + 1} Subjects`,
      }));
    }
    if (pkg === "primary") {
      return [
        { grade: 1, label: "Grade 1 Subjects" },
        { grade: 2, label: "Grade 2 Subjects" },
        { grade: 3, label: "Grade 3 Subjects" },
        { grade: 4, label: "Grade 4 Subjects" },
      ];
    } else if (pkg === "middle") {
      return [
        { grade: 5, label: "Grade 5 Subjects" },
        { grade: 6, label: "Grade 6 Subjects" },
        { grade: 7, label: "Grade 7 Subjects" },
        { grade: 8, label: "Grade 8 Subjects" },
      ];
    } else {
      return [
        { grade: 9, label: "Grade 9 Subjects" },
        { grade: 10, label: "Grade 10 Subjects" },
        { grade: 11, label: "Grade 11 Subjects" },
        { grade: 12, label: "Grade 12 Subjects" },
      ];
    }
  };

  const mainNavItems = [
    { name: "Dashboard (Dashboard)", path: "/dashboard", icon: Home },
  ];

  const secondaryNavItems = [
    { name: "My Courses (Koorsooyin)", path: "/dashboard/my-courses", icon: GraduationCap },
    { name: "Mock Exams (Mock)", path: "/dashboard/exams", icon: Trophy },
    { name: "Teacher Exams (Macallin)", path: "/dashboard/teacher-exams", icon: ClipboardList },
    { name: "Community (Madasha)", path: "/dashboard/community", icon: MessageSquare },
    { name: "Wrong Notebook (Khalaad)", path: "/dashboard/wrong-answers", icon: Bookmark },
    { name: "Concept Roadmap (Khariidad)", path: "/dashboard/roadmap", icon: Map },
    { name: "AI Coach Refik (AI Coach)", path: "/dashboard/ai-coach", icon: Brain },
    { name: "Profile (Profile)", path: "/dashboard/profile", icon: User },
  ];

  const filteredSecondaryNavItems = secondaryNavItems.filter((item) => {
    if (item.path === "/dashboard/exams" || item.path === "/dashboard/community") {
      return user?.package_active === true || user?.role === "admin" || user?.role === "teacher";
    }
    return true;
  });

  const LinkItem = ({ item, onClick }) => {
    const Icon = item.icon;
    const active = isLinkActive(item.path);
    return (
      <Link
        to={item.path}
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all border ${
          active
            ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 border-y-transparent border-r-transparent"
            : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50"
        }`}
      >
        <Icon className="h-4.5 w-4.5 shrink-0" />
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#0c031a] text-white flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-brand-border/40 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
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
                Ardayga Portal-ka
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Gamification stats */}
            <div className="flex items-center gap-2.5">
              {user?.current_streak > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400" title="Streak Days">
                  <Flame className="h-3.5 w-3.5" />
                  <span className="text-xs font-bold">{user.current_streak}</span>
                </div>
              )}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400" title="XP Points">
                <Zap className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">{user?.total_xp_points?.toLocaleString() ?? 0} XP</span>
              </div>
            </div>

            {/* Profile Avatar Card */}
            <div className="flex items-center gap-2.5 border-l border-slate-800 pl-4">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-semibold text-white">{user?.full_name || "Student"}</span>
                <span className="text-[10px] text-slate-500">
                  {user?.package_active
                    ? getPackageLabel(user?.package_type)
                    : "No active package"}
                  {" · "}Class {user?.grade_level || 12}
                </span>
              </div>
              <div className="h-9 w-9 rounded-full bg-brand-indigo/10 border border-brand-indigo/35 flex items-center justify-center text-brand-indigo font-bold text-sm uppercase">
                {getUserInitials(user?.full_name)}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-0 sm:px-6 lg:px-8 relative">
        {/* Left Sidebar - Desktop */}
        <aside className="w-64 shrink-0 hidden lg:block py-8 pr-6 border-r border-brand-border/40">
          {/* Student Profile Overview */}
          <div className="mb-6 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold uppercase">
              {getUserInitials(user?.full_name)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.full_name || "Student"}</p>
              <p className="text-[10px] text-slate-500 font-medium">Grade {user?.grade_level || 12} Student</p>
              <p className={`text-[10px] font-semibold truncate ${user?.package_active ? "text-emerald-400" : "text-slate-500"}`}>
                {user?.package_active ? getPackageLabel(user?.package_type) : "No active package"}
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            {mainNavItems.map((item) => (
              <LinkItem key={item.path} item={item} />
            ))}

            {/* Collapsible Dropdown: Courses */}
            <div className="space-y-1">
              <button
                onClick={() => setCoursesOpen(!coursesOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all border border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4.5 w-4.5 shrink-0" />
                  <span>Courses (Casharada)</span>
                </div>
                {coursesOpen ? (
                  <ChevronDown className="h-4 w-4 text-slate-500 transition-transform duration-200" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500 transition-transform duration-200" />
                )}
              </button>

              {coursesOpen && (
                <div className="pl-6 space-y-1 border-l border-slate-800/60 ml-6 mt-1 mb-2">
                  {getCourseLinks().map((item) => (
                    <Link
                      key={item.grade}
                      to={`/dashboard/courses/grade${item.grade}`}
                      className={`flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                        location.pathname.startsWith(`/dashboard/courses/grade${item.grade}`)
                          ? "text-indigo-400 font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <GraduationCap className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {filteredSecondaryNavItems.map((item) => (
              <LinkItem key={item.path} item={item} />
            ))}

            <button
              onClick={logout}
              className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all border border-transparent text-slate-400 hover:text-brand-danger hover:bg-brand-danger/10 mt-6"
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
                    <span className="font-outfit font-black text-lg">SomPrep Arday</span>
                  </div>
                  <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {mainNavItems.map((item) => (
                    <LinkItem key={item.path} item={item} onClick={() => setMobileOpen(false)} />
                  ))}

                  {/* Courses submenu on mobile */}
                  <div className="space-y-1">
                    <button
                      onClick={() => setCoursesOpen(!coursesOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all border border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-4.5 w-4.5 shrink-0" />
                        <span>Courses (Casharada)</span>
                      </div>
                      {coursesOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                    </button>

                    {coursesOpen && (
                      <div className="pl-6 space-y-1 border-l border-slate-850 ml-6 mt-1 mb-2">
                        {getCourseLinks().map((item) => (
                          <Link
                            key={item.grade}
                            to={`/dashboard/courses/grade${item.grade}`}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold ${
                              location.pathname.startsWith(`/dashboard/courses/grade${item.grade}`)
                                ? "text-indigo-400 font-bold"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {filteredSecondaryNavItems.map((item) => (
                    <LinkItem key={item.path} item={item} onClick={() => setMobileOpen(false)} />
                  ))}
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
          {/* Header page title line */}
          <div className="mb-6">
            <h2 className="font-outfit text-xl font-bold text-white border-l-4 border-indigo-500 pl-3 leading-none">
              {getPageTitle()}
            </h2>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
