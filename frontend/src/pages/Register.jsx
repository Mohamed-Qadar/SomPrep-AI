import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { packagesData } from "../data/packagesData";
import usePackageCatalog from "../hooks/usePackageCatalog";
import {
  UserPlus,
  User,
  Phone,
  Lock,
  AlertCircle,
  Loader2,
  CheckCircle,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  CreditCard,
  GraduationCap
} from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { packages: allPackages, byId: packageMap } = usePackageCatalog();

  // Wizard Steps
  const [step, setStep] = useState(1);

  // Form States - Step 1
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Form States - Step 2
  const [packageType, setPackageType] = useState(() => {
    const pkg = searchParams.get("package");
    return (packageMap?.[pkg] || packagesData[pkg]) ? pkg : "academic";
  });
  const defaultGradeForPackage = (pkg) => {
    if (pkg === "primary") return 4;
    if (pkg === "middle") return 8;
    return 12;
  };
  const [gradeLevel, setGradeLevel] = useState(() => defaultGradeForPackage(searchParams.get("package")));

  // Form States - Step 3
  const [paymentPhone, setPaymentPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Sync a safe default grade when the selected package changes.
  useEffect(() => {
    setGradeLevel(defaultGradeForPackage(packageType));
  }, [packageType]);

  // Pre-fill payment phone with registration phone on step 3 transition
  useEffect(() => {
    if (step === 3 && !paymentPhone) {
      setPaymentPhone(phoneNumber);
    }
  }, [step, phoneNumber, paymentPhone]);

  // Step 1 Validation
  const validateStep1 = () => {
    setError("");
    if (!fullName.trim() || !phoneNumber.trim() || !password.trim()) {
      setError("Fadlan buuxi dhammaan meelaha bannaan. (Please fill all fields.)");
      return false;
    }
    if (password.length < 6) {
      setError("Ereyga sirta ah waa inuu ka koobnaadaa ugu yaraan 6 xaraf. (Password must be >= 6 chars.)");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Ereyada sirta ah isma laha. (Passwords do not match.)");
      return false;
    }
    return true;
  };

  const handleNextStep1 = (e) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  // Step 3: Final register, then continue to the easy automatic payment screen.
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!paymentPhone.trim()) {
      setError("Fadlan geli lambarkaaga lacag bixinta. (Please enter your payment number.)");
      return;
    }
    if (!gradeLevel || Number.isNaN(Number(gradeLevel))) {
      setError("Fadlan dooro fasal sax ah. (Please select a valid grade.)");
      return;
    }

    setIsSubmitting(true);

    // 1. Create User & Log in automatically
    const regResult = await register(
      fullName.trim(),
      phoneNumber.trim(),
      password.trim(),
      "Federal", // default region
      parseInt(gradeLevel, 10),
      packageType
    );

    if (!regResult.success) {
      setError(regResult.error || "Diiwaangelintu waa guuldareystay. (Registration failed.)");
      setIsSubmitting(false);
      return;
    }

    localStorage.setItem("selectedPackage", packageType);
    localStorage.setItem("pendingPaymentPhone", paymentPhone.trim());
    setSuccessMsg("Akoonka waa la sameeyey! Waxaa laguu gudbinayaa bogga lacag bixinta. (Account created! Opening payment page.)");
    setIsSubmitting(false);
    setTimeout(() => {
      navigate(`/paywall?package=${encodeURIComponent(packageType)}&redirect=${encodeURIComponent("/dashboard")}`);
    }, 700);
  };

  const getGradesForPackage = () => {
    const scope = packageMap[packageType]?.access_scope || packageType;
    if (scope === "academic") return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    if (scope === "primary") return [1, 2, 3, 4];
    if (scope === "middle") return [5, 6, 7, 8];
    if (scope === "secondary") return [9, 10, 11, 12];
    return [12];
  };

  const getPackageInfo = () => {
    const pkg = packageMap[packageType] || packagesData[packageType];
    if (pkg) return { name: pkg.name || pkg.title, target: pkg.target || pkg.audience || "" };
    return { name: "Ma dooran (Not Selected)", target: "" };
  };

  const pkgInfo = getPackageInfo();
  const selectedPackage = packageMap[packageType] || packagesData[packageType];
  const selectedPrice = selectedPackage?.annualPrice || "$2.50";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c031a] text-white px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-xl space-y-8">
        
        {/* Branding header */}
        <div className="text-center">
          <h2 className="font-outfit text-4xl font-extrabold tracking-tight text-white">
            SomPrep <span className="bg-gradient-to-r from-indigo-500 to-indigo-300 bg-clip-text text-transparent">AI</span>
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Diiwaangeli akoonkaaga waxbarasho saddex talaabo oo sahlan.
          </p>
        </div>

        {/* Wizard Steps indicator */}
        <div className="flex justify-between items-center max-w-xs mx-auto mb-4">
          {[1, 2, 3].map((num) => (
            <div key={num} className="flex items-center gap-1.5">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                  step === num
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
                    : step > num
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                {step > num ? <CheckCircle2 className="h-4 w-4" /> : num}
              </div>
              {num < 3 && <div className={`h-0.5 w-12 ${step > num ? "bg-emerald-500/30" : "bg-slate-800"}`} />}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="rounded-3xl border border-slate-800 bg-[#130b24]/90 p-8 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-400">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* STEP 1: PERSONAL INFO */}
          {step === 1 && (
            <form onSubmit={handleNextStep1} className="space-y-4">
              <div className="border-b border-slate-850 pb-3">
                <h3 className="font-outfit text-base font-bold text-white">Talaabada 1aad: Macluumaadka Shaqsiga</h3>
                <p className="text-[10px] text-slate-500">Geli magacaaga, telefoonkaaga iyo passkey-ga.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Magacaaga oo Buuxa (Full Name)
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Mohamud Ali"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full rounded-xl border border-slate-800 bg-slate-950/80 py-3.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Lambarka Taleefanka (Phone Number)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="+25261xxxxxxx"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="block w-full rounded-xl border border-slate-800 bg-slate-950/80 py-3.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Ereyga Sirta ah (Password)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="Ugu yaraan 6 xaraf"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-xl border border-slate-800 bg-slate-950/80 py-3.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Hubi Password-ka
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="Hubi ereyga sirta ah"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full rounded-xl border border-slate-800 bg-slate-950/80 py-3.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3.5 text-xs font-bold text-white transition active:scale-[0.98] mt-6"
              >
                <span>Talaabada Xigta (Next Step)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* STEP 2: CHOOSE PACKAGE & GRADE */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="border-b border-slate-850/60 pb-3">
                <h3 className="font-outfit text-base font-bold text-white">Talaabada 2aad: Dooro Xirmada & Fasalka</h3>
                <p className="text-[10px] text-slate-500 font-medium">Dooro xirmada kugu haboon iyo fasalkaaga si aad u hesho casharada saxda ah.</p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Dooro Xirmada Waxbarashada (Choose Package)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {allPackages.map((pkg) => {
                    const isSelected = packageType === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setPackageType(pkg.id)}
                        className={`rounded-2xl border p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 relative ${
                          isSelected
                            ? "border-indigo-500 bg-[#1d152e]/80 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-500/20"
                            : "border-slate-800 bg-slate-950/40 hover:border-slate-700/80"
                        }`}
                      >
                        <div className="space-y-2.5">
                          <span className="inline-block text-[9px] font-extrabold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            {pkg.target}
                          </span>
                          <h4 className="text-[11px] font-black text-white leading-tight">{pkg.title}</h4>
                          <span className="block text-[9px] font-bold text-slate-500 mt-1">
                            {pkg.audience}
                          </span>
                          <span className="block text-emerald-400 font-black text-[11px] mt-1.5">
                            {pkg.annualPrice} / 12 Months
                          </span>
                          <ul className="space-y-1.5 pt-2 border-t border-slate-800/40 mt-2">
                            {pkg.features.slice(0, 3).map((feat) => (
                              <li key={feat} className="flex items-start gap-1.5 text-[9px] text-slate-400 leading-normal">
                                <CheckCircle2 className="h-3 w-3 text-indigo-400 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {packageType && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Dooro Fasalkaaga (Select Grade Level)
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <select
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value ? parseInt(e.target.value) : "")}
                      className="block w-full rounded-xl border border-slate-800 bg-slate-950/80 py-3.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition"
                    >
                      <option value="">-- Dooro Fasalka (Choose Grade) --</option>
                      {getGradesForPackage().map((g) => (
                        <option key={g} value={g}>
                          Grade {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-800 hover:bg-slate-900 py-3.5 text-xs font-bold text-slate-300 transition"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Dib u noqo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!packageType || !gradeLevel}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 py-3.5 text-xs font-bold text-white transition active:scale-[0.98] shadow-lg shadow-indigo-600/10"
                >
                  <span>Talaabada Xigta</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRM & PAY */}
          {step === 3 && (
            <form onSubmit={handleFinalSubmit} className="space-y-5">
              <div className="border-b border-slate-850 pb-3">
                <h3 className="font-outfit text-base font-bold text-white">Talaabada 3aad: Hubi & Bixi Lacagta</h3>
                <p className="text-[10px] text-slate-500">Hubi macluumaadkaaga oo bixi khidmadda biilka.</p>
              </div>

              <div className="rounded-2xl border border-indigo-500/10 bg-indigo-950/20 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-slate-850/60 pb-2">
                  <span className="text-slate-500 font-bold">Magaca (Name):</span>
                  <span className="text-white font-bold">{fullName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850/60 pb-2">
                  <span className="text-slate-500 font-bold">Xirmada (Package):</span>
                  <span className="text-indigo-400 font-extrabold">{pkgInfo.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850/60 pb-2">
                  <span className="text-slate-500 font-bold">Fasalka (Grade):</span>
                  <span className="text-white font-bold">Grade {gradeLevel}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500 font-bold">Khidmadda (Price):</span>
                  <span className="text-emerald-400 font-black text-sm">{selectedPrice} USD / 12 Months</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Lambarka Lacag-bixinta (Payment Number)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="+25261xxxxxxx"
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                    className="block w-full rounded-xl border border-slate-700 bg-slate-950 py-3.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition"
                  />
                </div>
                <span className="text-[9px] text-slate-500 leading-tight block">
                  Bogga lacag bixinta ayaa kuu diri doona codsi lacag bixin toos ah lambarkan.
                </span>
              </div>

              <div className="flex gap-3 mt-6 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-800 hover:bg-slate-900 py-3.5 text-xs font-bold text-slate-300 transition disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Dib u noqo</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3.5 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-indigo-600/25"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  <span>{isSubmitting ? "Diiwaangelinaya..." : `Dhamaystir & Bixi (${selectedPrice})`}</span>
                </button>
              </div>
            </form>
          )}

          {/* Bottom Login Redirect Link */}
          {step === 1 && (
            <div className="border-t border-slate-850/60 pt-6 text-center text-xs text-slate-400">
              Hadii aad leedahay akoon?{" "}
              <Link
                to="/login"
                className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Gasho halkan (Login)
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
