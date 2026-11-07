import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../services/endpoints";
import api from "../services/api";
import { packagesData } from "../data/packagesData";
import usePackageCatalog from "../hooks/usePackageCatalog";
import {
  CreditCard,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Phone,
  Clock,
  RefreshCw,
  XCircle
} from "lucide-react";

export default function PaywallPage() {
  const { user, checkSubscription, logout } = useAuth();
  const _navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  const requestedPackage = searchParams.get("package") || localStorage.getItem("selectedPackage");
  const { packages: allPackages, byId: packageMap } = usePackageCatalog();

  // States
  const [selectedPackageId, setSelectedPackageId] = useState(
    (packageMap?.[requestedPackage] || packagesData[requestedPackage]) ? requestedPackage : user?.package_type || "academic"
  );
  const [paymentPhone, setPaymentPhone] = useState(() => {
    const pendingPhone = localStorage.getItem("pendingPaymentPhone");
    return pendingPhone || user?.phone_number || "";
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(""); // '', 'pending', 'awaiting_confirmation', 'failed'
  const [message, setMessage] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [_packageDetails, setPackageDetails] = useState(null);
  const [selectedApiMethod, setSelectedApiMethod] = useState(null);
  const [loadingPaymentMethod, setLoadingPaymentMethod] = useState(true);
  const pollIntervalRef = useRef(null);

  // Fetch package details on mount
  useEffect(() => {
    const fetchPkg = async () => {
      try {
        const res = await authApi.myPackage();
        setPackageDetails(res.data);
        if (!requestedPackage && res.data?.package_type) {
          setSelectedPackageId(res.data.package_type);
        }
      } catch (err) {
        console.error("Failed to fetch package details", err);
      }
    };
    fetchPkg();
  }, [requestedPackage]);

  useEffect(() => {
    const fetchPaymentMethod = async () => {
      setLoadingPaymentMethod(true);
      try {
        const res = await api.get("/api/payments_system/methods");
        const apiMethods = (res.data || []).filter(
          (method) => method.mode === "api" && method.is_active && method.api_status !== "disabled"
        );
        const recommended = apiMethods.find((method) => method.is_recommended) || apiMethods[0] || null;
        setSelectedApiMethod(recommended);
      } catch (err) {
        console.error("Failed to load automatic payment method", err);
        setSelectedApiMethod(null);
      } finally {
        setLoadingPaymentMethod(false);
      }
    };

    fetchPaymentMethod();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const selectedPackage = useMemo(() => {
    return packageMap[selectedPackageId] || packagesData[selectedPackageId] || packagesData.academic;
  }, [packageMap, selectedPackageId]);

  const packagePrice = selectedPackage.annual_price ?? 2.5;
  const packagePriceLabel = selectedPackage.annualPrice || `$${packagePrice.toFixed(2)}`;

  // After an automatic payment request, poll the submission status until the
  // provider (or its webhook) confirms — then unlock access immediately.
  const startPaymentPolling = (submissionId) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    let attempts = 0;
    pollIntervalRef.current = setInterval(async () => {
      attempts += 1;

      if (attempts > 35) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        setPaymentStatus("failed");
        setMessage("Codsiga lacag bixinta wuu dhacay. Fadlan isku day markale. (Payment request timed out. Please try again.)");
        setCheckingStatus(false);
        return;
      }

      try {
        const res = await api.get(`/api/payments_system/status/${submissionId}`);
        const status = res.data?.status;

        if (status === "approved") {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setPaymentStatus("active");
          setCheckingStatus(false);
          setMessage("Lacag bixintaada si guul leh ayaa loo xaqiijiyey! (Payment successfully verified!) Redirecting...");
          await checkSubscription();
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 1500);
        } else if (["failed", "cancelled", "insufficient_balance", "rejected"].includes(status)) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setPaymentStatus("failed");
          setCheckingStatus(false);
          const failureMessages = {
            insufficient_balance: "Haraagaagu kuma filna. Fadlan ku shubo oo isku day markale. (Insufficient balance. Please top up and try again.)",
            cancelled: "Lacag bixinta waa la joojiyey. (Payment was cancelled.)",
            rejected: "Lacag bixinta lama aqbalin. (Payment was rejected.)",
            failed: "Lacag bixintu waa guuldareysatay. (Payment failed. Please try again.)",
          };
          setMessage(failureMessages[status] || "Lacag bixintu waa guuldareysatay. (Payment failed. Please try again.)");
        }
      } catch (err) {
        console.error("Payment status polling failed:", err);
      }
    }, 2000);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (isProcessing) return;

    if (!paymentPhone.trim()) {
      setMessage("Fadlan geli lambarkaaga lacag bixinta. (Enter your payment phone number.)");
      setPaymentStatus("failed");
      return;
    }

    if (!selectedApiMethod) {
      setMessage(
        "Hab lacag bixin toos ah lama diyaarin. Fadlan maamulka ha dhigo account-ka API/Sandbox Test Mode. (No automatic payment account is configured.)"
      );
      setPaymentStatus("failed");
      return;
    }

    setIsProcessing(true);
    setPaymentStatus("pending");
    setMessage("Sending payment request...");

    try {
      // 1. If student switches package selection, sync it with backend
      if (user?.package_type !== selectedPackageId) {
        await authApi.selectPackage({ package_type: selectedPackageId });
      }

      // 2. Dispatch automatic mobile-money merchant payment request.
      // In live mode the gateway call is synchronous (the student's phone
      // pops the PIN prompt and the response confirms real payment), so the
      // returned submission may already be approved.
      const res = await api.post("/api/payments_system/submit-api", {
        package_id: selectedPackageId,
        package_name: selectedPackage.displayTitle || selectedPackage.title || selectedPackage.name,
        package_price: packagePrice,
        package_duration_months: 12,
        payment_method: selectedApiMethod.method_type,
        admin_receiving_account: selectedApiMethod.receiving_number,
        sender_phone: paymentPhone.trim(),
        currency: selectedApiMethod.currency || "USD",
      });

      localStorage.removeItem("pendingPaymentPhone");
      localStorage.removeItem("selectedPackage");

      const submission = res.data;
      if (submission.status === "approved") {
        setPaymentStatus("active");
        setMessage("Lacag bixintaada si guul leh ayaa loo xaqiijiyey! (Payment successfully verified!) Redirecting...");
        await checkSubscription();
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1500);
      } else if (["failed", "rejected"].includes(submission.status)) {
        setPaymentStatus("failed");
        setMessage(
          submission.admin_note ||
            "Lacag bixintu waa guuldareysatay. Fadlan isku day markale. (Payment failed. Please try again.)"
        );
      } else {
        // Pending: confirmation arrives via provider webhook — keep watching.
        setPaymentStatus("awaiting_confirmation");
        setCheckingStatus(true);
        setMessage(
          "Codsiga lacag bixinta waa la diray. Geli PIN-kaaga telefoonka, xaqiijintuna si toos ah ayay u imanaysaa. (Payment request sent — enter your PIN on your phone; confirmation is automatic.)"
        );
        startPaymentPolling(submission.id);
      }
    } catch (err) {
      console.error("Paywall payment failed:", err);
      setPaymentStatus("failed");
      setMessage(
        err.response?.data?.detail ||
          "Qalad ayaa dhacay intii lagu guda jiray lacag bixinta. (Failed to reach the mobile-money service.)"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyStatus = async () => {
    if (checkingStatus) return;
    setCheckingStatus(true);
    try {
      const active = await checkSubscription();
      if (active) {
        setMessage("Lacag bixintaada si guul leh ayaa loo xaqiijiyey! (Payment successfully verified!) Redirecting...");
        setPaymentStatus("active");
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1500);
      } else {
        setMessage("Wali lama xaqiijin lacag bixinta. Koorsadu way xirnaanaysaa ilaa bixinta la xaqiijiyo. (Payment is not verified yet. Access stays locked until confirmation.)");
      }
    } catch (err) {
      console.error("Verification failed:", err);
    } finally {
      if (paymentStatus !== "awaiting_confirmation") {
        setCheckingStatus(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0c031a] text-white font-sans overflow-x-hidden flex flex-col justify-between">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[35rem] h-[35rem] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute top-[-10%] right-[20%] w-[30rem] h-[30rem] rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      {/* Mini-Header */}
      <header className="border-b border-slate-900 bg-[#130b24]/40 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="font-outfit text-xl font-extrabold tracking-tight">
            SomPrep <span className="bg-gradient-to-r from-indigo-500 to-indigo-300 bg-clip-text text-transparent">AI</span>
          </Link>
          <button
            onClick={logout}
            className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            Ka Bax (Logout)
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-10 sm:px-6 lg:px-8 space-y-10">
        
        {/* Banner Expired warning */}
        <div className="rounded-3xl border border-red-500/25 bg-red-500/5 p-6 md:p-8 text-center space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl" />
          <div className="mx-auto h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="font-outfit text-2xl font-black text-white">
            Xirmooyinkaaga waa dhacday ama lama hawlgelin
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Your premium learning package has expired or is inactive. To restore access to classes, assignments, and mock simulations, choose your package below and complete mobile-money verification.
          </p>
        </div>

        {/* 2-Column Checkout Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Packages selection column */}
          <section className="lg:col-span-7 space-y-4">
            <div className="border-b border-slate-900 pb-2">
              <h3 className="font-outfit text-sm font-bold text-slate-400 uppercase tracking-wider">
                1. Dooro Xirmada (Choose Prep Bundle)
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {allPackages.map((pkg) => {
                const isSelected = selectedPackageId === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => {
                      if (paymentStatus !== "awaiting_confirmation") {
                        setSelectedPackageId(pkg.id);
                        setPaymentStatus("");
                        setMessage("");
                      }
                    }}
                    className={`rounded-2xl border p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? "border-indigo-500 bg-[#1d152e] ring-1 ring-indigo-500/20"
                        : "border-slate-800 bg-slate-950/40 hover:border-slate-700/80"
                    } ${paymentStatus === "awaiting_confirmation" ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <div className="space-y-3">
                      <span className="inline-block text-[8px] font-extrabold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {pkg.target}
                      </span>
                      <h4 className="text-[11px] font-black text-white leading-tight">{pkg.title}</h4>
                      <p className="text-[9px] text-slate-500">{pkg.audience}</p>
                      <span className="block text-emerald-400 font-extrabold text-[11px] pt-1">
                        {pkg.annualPrice} / 12 Mo.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected package features preview */}
            <div className="rounded-2xl border border-slate-850 bg-[#130b24]/40 p-5 space-y-3">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Features included in {selectedPackage.title}:
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedPackage.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-[10px] text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Mobile Money Payment Form column */}
          <section className="lg:col-span-5 rounded-3xl border border-slate-850 bg-[#130b24]/70 p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-850 pb-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-outfit text-base font-bold text-white">2. Bixi Mobile Money</h3>
                  <p className="text-[10px] text-slate-500">
                    Quick pay through {selectedApiMethod?.account_name || "the active mobile-money provider"}
                  </p>
                </div>
              </div>

              {/* Status summary */}
              <div className="rounded-xl border border-slate-850 bg-slate-950/40 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Package:</span>
                  <span className="text-indigo-400 font-extrabold text-[11px]">{selectedPackage.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Khidmadda:</span>
                  <span className="text-emerald-400 font-black">
                    {packagePriceLabel} {selectedApiMethod?.currency || "USD"} / 12 Months
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-900 pt-2 mt-2">
                  <span className="text-slate-500 font-bold">Payment Status:</span>
                  <span className="font-bold uppercase tracking-wider text-[9px] inline-flex items-center gap-1.5">
                    {paymentStatus === "pending" && (
                      <>
                        <Loader2 className="h-3 w-3 text-indigo-400 animate-spin" />
                        <span className="text-indigo-400">Sending</span>
                      </>
                    )}
                    {paymentStatus === "awaiting_confirmation" && (
                      <>
                        <Clock className="h-3 w-3 text-amber-400" />
                        <span className="text-amber-400">Waiting Confirmation</span>
                      </>
                    )}
                    {paymentStatus === "failed" && (
                      <>
                        <XCircle className="h-3 w-3 text-red-400" />
                        <span className="text-red-400">Failed</span>
                      </>
                    )}
                    {paymentStatus === "active" && (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Active</span>
                      </>
                    )}
                    {!paymentStatus && <span className="text-slate-400">Ready</span>}
                  </span>
                </div>
              </div>

              {/* Form inputs */}
              {paymentStatus !== "awaiting_confirmation" && paymentStatus !== "active" ? (
                <form onSubmit={handleSubmitPayment} className="space-y-4">
                  {!loadingPaymentMethod && !selectedApiMethod && (
                    <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-[10px] font-semibold leading-relaxed text-red-300">
                      Hab lacag bixin toos ah lama diyaarin. Fadlan maamulka ha kaydiyo account API ah oo firfircoon.
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Lambarka Lacag Bixinta (+25261xxxxxxx)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="+25261xxxxxxx"
                        value={paymentPhone}
                        onChange={(e) => setPaymentPhone(e.target.value)}
                        className="block w-full rounded-xl border border-slate-800 bg-slate-950 py-3 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing || loadingPaymentMethod || !selectedApiMethod}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-indigo-600/10"
                  >
                    {isProcessing || loadingPaymentMethod ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{loadingPaymentMethod ? "Loading payment..." : "Sending Request..."}</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        <span>Bixi Hada ({packagePriceLabel} {selectedApiMethod?.currency || "USD"})</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-950/50 p-4 border border-slate-850 space-y-3 text-center">
                    <Clock className="h-8 w-8 text-amber-400 mx-auto" />
                    <h4 className="text-xs font-bold text-white">Sugaya Xaqiijin (Waiting for confirmation)</h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Codsiga lacag bixinta waa la diray. Waxaan sugaynaa xaqiijin. Koorsadu way xirnaanaysaa ilaa lacagta la xaqiijiyo.
                    </p>
                  </div>

                  <button
                    onClick={handleVerifyStatus}
                    disabled={checkingStatus}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-emerald-600/10"
                  >
                    {checkingStatus ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Hubinayaa...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        <span>Xaqiiji Lacag Bixinta (Verify Payment)</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (pollIntervalRef.current) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                      }
                      setCheckingStatus(false);
                      setPaymentStatus("");
                      setMessage("");
                    }}
                    className="w-full text-center text-[10px] text-slate-500 hover:text-slate-400 font-bold transition"
                  >
                    Ku noqo foomka lacag-bixinta (Go back)
                  </button>
                </div>
              )}

              {/* Status Message */}
              {message && (
                <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-[10px] leading-relaxed ${
                  paymentStatus === "active"
                    ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-400"
                    : "bg-amber-500/5 border-amber-500/25 text-amber-400"
                }`}>
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{message}</span>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2.5 rounded-2xl border border-slate-850 bg-slate-950/20 p-4 mt-6">
              <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-[9px] text-slate-500 leading-relaxed">
                Verification requests are processed securely. Account access activates only after provider verification or admin confirmation.
              </p>
            </div>
          </section>

        </div>
      </main>

      {/* Mini-Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-[10px] text-slate-600">
        <p>© {new Date().getFullYear()} SomPrep AI. All rights reserved. Bulk and institutional inquiries: support@somprep.ai</p>
      </footer>
    </div>
  );
}
