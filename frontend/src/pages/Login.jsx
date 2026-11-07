import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import {
  LogIn,
  UserPlus,
  Phone,
  Lock,
  User,
  AlertCircle,
  Sparkles,
  Loader2,
  ShieldCheck,
  GraduationCap,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Brain,
  Zap,
  Trophy,
} from "lucide-react";


// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates a Somali phone number.
 * Accepts: 61-69xxxxxxx, 77xxxxxxx, 90xxxxxxx
 * With optional prefix: 0, +252, 252
 */
const validateSomaliPhone = (phone) => {
  const clean = phone.replace(/[\s\-()]/g, "");
  return /^(?:\+?252|0)?(?:6[1-9]|77|90)\d{7}$/.test(clean);
};

/**
 * Returns a password strength descriptor (level 0–4, label, color class).
 */
const getPasswordStrength = (pwd) => {
  if (!pwd) return { level: 0, label: "", colorClass: "" };
  const checks = [
    pwd.length >= 6,
    pwd.length >= 10,
    /[A-Z]/.test(pwd) && /[a-z]/.test(pwd),
    /\d/.test(pwd),
    /[^A-Za-z0-9]/.test(pwd),
  ];
  const score = checks.filter(Boolean).length;

  if (score <= 1) return { level: 1, label: "Daciif · Weak",          colorClass: "bg-red-500"     };
  if (score <= 2) return { level: 2, label: "Dhexdhexaad · Fair",     colorClass: "bg-amber-400"   };
  if (score <= 3) return { level: 3, label: "Wanaagsan · Good",       colorClass: "bg-blue-400"    };
  return           { level: 4, label: "Xoog badan · Strong",         colorClass: "bg-emerald-400" };
};

/** Feature pills shown in Register mode. */
const REGISTER_FEATURES = [
  { icon: Brain,   label: "AI Coach bilingual" },
  { icon: Zap,     label: "Gamified roadmap"   },
  { icon: Trophy,  label: "Easy mobile payment" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Animated input wrapper with left icon and optional right icon slot. */
function InputField({ id, label, type, autoComplete, placeholder, value, onChange, leftIcon: LeftIcon, rightSlot, borderClass }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <div className="group relative">
        {/* Left icon */}
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 transition-colors duration-150 group-focus-within:text-brand-indigo">
          <LeftIcon className="h-4 w-4" />
        </span>

        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`block w-full rounded-xl border bg-slate-900/60 py-3.5 pl-11 ${rightSlot ? "pr-11" : "pr-4"} text-sm text-white placeholder-slate-600 transition-all duration-200 focus:outline-none focus:ring-2 ${borderClass}`}
        />

        {/* Right slot (eye toggle, check/x icon, etc.) */}
        {rightSlot && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-3.5">
            {rightSlot}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Login() {
  const { login, register } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();

  // ── Mode ──────────────────────────────────────────────────────────────────
  const [isRegister, setIsRegister] = useState(location.pathname === "/register");

  // ── Form fields ───────────────────────────────────────────────────────────
  const [fullName,     setFullName]     = useState("");
  const [phoneNumber,  setPhoneNumber]  = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("Federal");
  const [gradeLevel,     setGradeLevel]     = useState(12);
  const [educationLevel, setEducationLevel] = useState("Secondary");
  const [learningGoal,   setLearningGoal]   = useState("Grade 12 National Exam Prep");

  const gradesByLevel = {
    Primary: [1, 2, 3, 4],
    Middle: [5, 6, 7, 8],
    Secondary: [9, 10, 11, 12]
  };

  // Adjust grade list when level changes
  useEffect(() => {
    if (isRegister) {
      const allowed = gradesByLevel[educationLevel];
      if (allowed && !allowed.includes(gradeLevel)) {
        setGradeLevel(allowed[0]);
      }
    }
  }, [educationLevel, isRegister]);

  // Adjust learning goal when grade changes
  useEffect(() => {
    if (isRegister) {
      if (gradeLevel === 8) {
        setLearningGoal("Grade 8 Exam Prep");
      } else if (gradeLevel === 12) {
        setLearningGoal("Grade 12 National Exam Prep");
      } else {
        setLearningGoal("Daily Learning");
      }
    }
  }, [gradeLevel, isRegister]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [error,       setError]       = useState("");
  const [errorKey,    setErrorKey]    = useState(0);   // re-triggers shake anim
  const [isAdminError, setIsAdminError] = useState(false); // admin tried student login
  const [isSubmitting,setIsSubmitting]= useState(false);
  const [phoneValid,  setPhoneValid]  = useState(null); // null | true | false

  // ── Sync mode with URL (back/forward navigation) ──────────────────────────
  useEffect(() => {
    setIsRegister(location.pathname === "/register");
    setError("");
  }, [location.pathname]);

  // ── Live phone validation ─────────────────────────────────────────────────
  useEffect(() => {
    if (!phoneNumber) { setPhoneValid(null); return; }
    setPhoneValid(validateSomaliPhone(phoneNumber));
  }, [phoneNumber]);

  // ── Mode toggle ───────────────────────────────────────────────────────────
  const toggleMode = (targetRegister) => {
    setError("");
    setFullName("");
    setPhoneNumber("");
    setPassword("");
    setShowPassword(false);
    setPhoneValid(null);
    setIsRegister(targetRegister);
    const searchParams = new URLSearchParams(location.search);
    const redirectUrl = searchParams.get("redirect");
    const path = targetRegister ? "/register" : "/login";
    navigate(redirectUrl ? `${path}?redirect=${encodeURIComponent(redirectUrl)}` : path, { replace: true });
  };

  // ── Form submission ───────────────────────────────────────────────────────
  const triggerError = (msg) => {
    setError(msg);
    setErrorKey((k) => k + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (isRegister && !fullName.trim()) {
      triggerError("Fadlan geli magacaaga oo buuxa · Please enter your full name.");
      return;
    }
    if (!phoneNumber.trim()) {
      triggerError("Fadlan geli lambarka taleefankaaga · Please enter your phone number.");
      return;
    }
    if (!validateSomaliPhone(phoneNumber)) {
      triggerError("Lambarka taleefanku ma sax ahayn · Use a valid Somali format (e.g. 61xxxxxxx or +25261xxxxxxx).");
      return;
    }
    if (!password) {
      triggerError("Fadlan geli ereyga sirta ah · Please enter your password.");
      return;
    }
    if (password.length < 6) {
      triggerError("Ereyga sirta ah waa inuu ahaadaa ugu yaraan 6 xaraf · Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    const selectedPackageType = isRegister ? "academic" : undefined;
    const result = isRegister
      ? await register(fullName.trim(), phoneNumber, password, selectedRegion, gradeLevel, selectedPackageType, educationLevel, learningGoal)
      : await login(phoneNumber, password);
    setIsSubmitting(false);

    if (result.success) {
      const searchParams = new URLSearchParams(location.search);
      const redirectParam = searchParams.get("redirect");
      if (isRegister) {
        localStorage.setItem("selectedPackage", selectedPackageType);
        localStorage.setItem("pendingPaymentPhone", phoneNumber.trim());
        navigate(`/paywall?package=${selectedPackageType}&redirect=${encodeURIComponent(redirectParam || "/dashboard")}`, { replace: true });
        return;
      }
      if (redirectParam) localStorage.removeItem("selectedPackage");
      return;
    } else {
      // The backend rejects admin accounts here by design — guide the admin
      // to their own login page instead of showing a scary error.
      const adminBlocked = /loginasadmin|admin account/i.test(result.error || "");
      setIsAdminError(adminBlocked);
      triggerError(
        adminBlocked
          ? "This is an admin account. Please use Admin Login. (Akoonkan waa mid maamule — fadlan isticmaal Admin Login.)"
          : result.error
      );
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const pwdStrength = isRegister && password ? getPasswordStrength(password) : null;

  // Phone border class (green / red / default)
  const phoneBorderClass = phoneValid === true
    ? "border-brand-emerald focus:border-brand-emerald focus:ring-brand-emerald/20"
    : phoneValid === false
    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
    : "border-slate-700 focus:border-brand-indigo focus:ring-brand-indigo/20";

  // Password border class (default, or red if too short on blur)
  const pwdBorderClass = "border-slate-700 focus:border-brand-indigo focus:ring-brand-indigo/20";

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0c031a] flex flex-col justify-between text-white font-sans overflow-x-hidden">
      <PublicNavbar />
      <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden px-4 py-16 sm:px-6">

      {/* ── Ambient decorative orbs ───────────────────────────────────────── */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[36rem] w-[36rem] rounded-full bg-brand-indigo/[0.09] blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-48 h-[36rem] w-[36rem] rounded-full bg-brand-emerald/[0.06] blur-[130px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[70rem] w-[70rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-indigo/[0.025] blur-[180px]" />

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-md animate-fade-in">

        {/* ── Brand header ────────────────────────────────────────────────── */}
        <div className="mb-8 text-center">
          {/* AI badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-indigo/25 bg-brand-indigo/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-indigo">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>AI-Powered Exam Prep</span>
          </div>

          {/* Logo mark */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-indigo to-indigo-700 shadow-xl shadow-brand-indigo/30 ring-1 ring-white/10">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Wordmark */}
          <h1 className="font-outfit text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            SomPrep{" "}
            <span className="bg-gradient-to-r from-brand-indigo to-indigo-400 bg-clip-text text-transparent">
              AI
            </span>
          </h1>

          {/* Tagline — switches with mode */}
          <p className="mx-auto mt-3 max-w-[18rem] text-sm leading-relaxed text-slate-400">
            {isRegister
              ? "Samee akoon cusub oo bilow safarka barashada · Create your free account today."
              : "Ku soo dhowow! Geli xogta akoonkaaga si aad u sii wadato."}
          </p>
        </div>

        {/* ── Auth card ───────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/80 shadow-2xl shadow-black/30 backdrop-blur-xl">

          {/* ── Tab switcher ──────────────────────────────────────────────── */}
          <div className="flex border-b border-slate-700/70 bg-slate-900/40">
            {[
              { reg: false, icon: LogIn,    primary: "Gasho",          sub: "Login"    },
              { reg: true,  icon: UserPlus, primary: "Isdiiwaangeli",  sub: "Register" },
            ].map(({ reg, icon: Icon, primary, sub }) => (
              <button
                key={String(reg)}
                type="button"
                onClick={() => toggleMode(reg)}
                className={`relative flex flex-1 items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors duration-200 ${
                  isRegister === reg
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>
                  {primary}
                  <span className="ml-1 text-xs font-normal opacity-60">({sub})</span>
                </span>
                {/* Sliding active underline */}
                {isRegister === reg && (
                  <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r from-brand-indigo to-indigo-400" />
                )}
              </button>
            ))}
          </div>

          {/* ── Form ──────────────────────────────────────────────────────── */}
          <form className="space-y-5 p-6 sm:p-8" onSubmit={handleSubmit} noValidate>

            {/* ── Redirect State Warning banner ──────────────────────────── */}
            {location.state?.message && !error && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-400 animate-fade-in">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span className="leading-relaxed">{location.state.message}</span>
              </div>
            )}

            {/* ── Error banner ──────────────────────────────────────────── */}
            {error && (
              <div
                key={errorKey}
                className={`rounded-xl border p-4 text-sm animate-error-shake ${
                  isAdminError
                    ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                    : "border-red-500/25 bg-red-500/10 text-red-400"
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${isAdminError ? "text-indigo-400" : "text-red-400"}`} />
                  <span className="leading-relaxed">{error}</span>
                </div>
                {isAdminError && (
                  <button
                    type="button"
                    onClick={() => navigate("/loginasadmin")}
                    className="mt-3 w-full rounded-lg bg-brand-indigo hover:bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition"
                  >
                    Go to Admin Login →
                  </button>
                )}
              </div>
            )}

            {/* ── Register feature pills ────────────────────────────────── */}
            {isRegister && (
              <div className="flex flex-wrap items-center justify-center gap-2 animate-fade-in">
                {REGISTER_FEATURES.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-indigo/20 bg-brand-indigo/10 px-3 py-1 text-xs font-medium text-brand-indigo"
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* ── Full Name (Register only) ─────────────────────────────── */}
            {isRegister && (
              <div className="space-y-4 animate-fade-in">
                <InputField
                  id="fullName"
                  label="Magacaaga oo Buuxa · Full Name"
                  type="text"
                  autoComplete="name"
                  placeholder="Axmed Cali Xasan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  leftIcon={User}
                  borderClass="border-slate-700 focus:border-brand-indigo focus:ring-brand-indigo/20"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="regionSelect" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Gobolka · Region
                    </label>
                    <select
                      id="regionSelect"
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      className="block w-full rounded-xl border border-slate-700 bg-slate-900 py-3.5 px-3 text-sm text-white focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
                    >
                      <option value="Federal">Federal (MoECHE)</option>
                      <option value="Puntland">Puntland (PSCE)</option>
                      <option value="Somaliland">Somaliland Track</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="educationLevelSelect" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Heerka · Level
                    </label>
                    <select
                      id="educationLevelSelect"
                      value={educationLevel}
                      onChange={(e) => setEducationLevel(e.target.value)}
                      className="block w-full rounded-xl border border-slate-700 bg-slate-900 py-3.5 px-3 text-sm text-white focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
                    >
                      <option value="Primary">Primary (Hoose)</option>
                      <option value="Middle">Middle (Dhexe)</option>
                      <option value="Secondary">Secondary (Sare)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="gradeSelect" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Fasalka · Grade
                    </label>
                    <select
                      id="gradeSelect"
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(parseInt(e.target.value))}
                      className="block w-full rounded-xl border border-slate-700 bg-slate-900 py-3.5 px-3 text-sm text-white focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
                    >
                      {gradesByLevel[educationLevel]?.map((g) => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="goalSelect" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Hadafka · Goal
                    </label>
                    <select
                      id="goalSelect"
                      value={learningGoal}
                      onChange={(e) => setLearningGoal(e.target.value)}
                      className="block w-full rounded-xl border border-slate-700 bg-slate-900 py-3.5 px-3 text-sm text-white focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
                    >
                      <option value="Daily Learning">Daily Learning</option>
                      <option value="Grade 8 Exam Prep">Grade 8 Exam Prep</option>
                      <option value="Grade 12 National Exam Prep">Grade 12 National Exam Prep</option>
                      <option value="Improve Weak Subjects">Improve Weak Subjects</option>
                      <option value="School Assigned Access">School Assigned Access</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── Phone Number ──────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <InputField
                id="phoneNumber"
                label="Lambarka Taleefanka · Phone Number"
                type="tel"
                autoComplete="tel"
                placeholder="61xxxxxxx · +25261xxxxxxx"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                leftIcon={Phone}
                borderClass={phoneBorderClass}
                rightSlot={
                  phoneValid !== null ? (
                    phoneValid
                      ? <CheckCircle2 className="h-4 w-4 text-brand-emerald" />
                      : <XCircle      className="h-4 w-4 text-red-400"       />
                  ) : null
                }
              />
              <p className="pl-1 text-[11px] text-slate-600">
                Qaabka sax ah: 61xxxxxxx · 77xxxxxxx · 90xxxxxxx · +252...
              </p>
            </div>

            {/* ── Password ──────────────────────────────────────────────── */}
            <div className="space-y-2">
              <InputField
                id="password"
                label="Ereyga Sirta ah · Password"
                type={showPassword ? "text" : "password"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder={isRegister ? "Ugu yaraan 6 xaraf · At least 6 chars" : "Geli ereyga sirta ah"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={Lock}
                borderClass={pwdBorderClass}
                rightSlot={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-slate-500 transition-colors hover:text-slate-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4" />
                      : <Eye    className="h-4 w-4" />
                    }
                  </button>
                }
              />

              {/* ── Password strength meter (register only) ──────────── */}
              {pwdStrength && (
                <div className="space-y-1.5 animate-fade-in px-0.5">
                  {/* 4-segment bar */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((seg) => (
                      <div
                        key={seg}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          pwdStrength.level >= seg ? pwdStrength.colorClass : "bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-[11px] font-medium ${
                    pwdStrength.level === 1 ? "text-red-400"     :
                    pwdStrength.level === 2 ? "text-amber-400"   :
                    pwdStrength.level === 3 ? "text-blue-400"    :
                                             "text-emerald-400"
                  }`}>
                    {pwdStrength.label}
                  </p>
                </div>
              )}
            </div>

            {/* ── Submit button ─────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-shimmer relative mt-2 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-brand-indigo to-indigo-500 py-4 text-sm font-bold text-white shadow-lg shadow-brand-indigo/25 transition-all duration-300 hover:from-indigo-500 hover:to-brand-indigo hover:shadow-brand-indigo/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>
                    {isRegister ? "Isdiiwaangelinta..." : "Xaqiijinta..."}
                  </span>
                </>
              ) : isRegister ? (
                <>
                  <UserPlus className="h-5 w-5" />
                  <span>Abuur Akoon · Create Account</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>Gasho Akoonka · Sign In</span>
                </>
              )}
            </button>

            {/* ── Inline mode-toggle link ───────────────────────────────── */}
            <p className="text-center text-xs text-slate-500">
              {isRegister ? "Horey u lahayd akoon?" : "Ma haysatid akoon?"}{" "}
              <button
                type="button"
                onClick={() => toggleMode(!isRegister)}
                className="font-semibold text-brand-indigo underline-offset-2 transition-colors hover:text-indigo-400 hover:underline"
              >
                {isRegister
                  ? "Gasho halkan · Sign in"
                  : "Isdiiwaangeli · Register free"}
              </button>
            </p>

            {/* ── Admin login shortcut ──────────────────────────────────── */}
            <p className="text-center text-xs text-slate-500">
              Ma tahay maamule?{" "}
              <button
                type="button"
                onClick={() => navigate("/loginasadmin")}
                className="font-semibold text-slate-400 underline-offset-2 transition-colors hover:text-brand-indigo hover:underline"
              >
                Admin Login
              </button>
            </p>
          </form>
        </div>

        {/* ── Trust badges ────────────────────────────────────────────────── */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-emerald" />
            <span>Amaan buuxda · Secure</span>
          </div>
          <div className="h-3.5 w-px bg-slate-700 max-sm:hidden" />
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-brand-indigo" />
            <span>AI Coach bilingual</span>
          </div>
          <div className="h-3.5 w-px bg-slate-700 max-sm:hidden" />
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <GraduationCap className="h-3.5 w-3.5 text-brand-indigo" />
            <span>$0.50 / bishii</span>
          </div>
        </div>

      </div>{/* /content */}
      </div>
      <PublicFooter />
    </div>
  );
}
