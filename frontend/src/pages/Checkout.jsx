import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Phone,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  Image as ImageIcon,
  CreditCard,
  Building,
  Upload
} from "lucide-react";
import { getPackageById } from "../data/packagesData";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function Checkout() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const { user, checkSubscription } = useAuth();
  
  const selectedPackage = getPackageById(packageId);
  const [billingCycle, setBillingCycle] = useState("annual");
  
  // Payment methods fetched from admin
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState(null);

  // Form inputs
  const [senderPhone, setSenderPhone] = useState(user?.phone_number || "");
  const [transactionId, setTransactionId] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [screenshotIsPdf, setScreenshotIsPdf] = useState(false);
  
  // States
  const [copiedText, setCopiedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(""); // 'pending', 'under_review', etc.
  const [_pendingSubmission, setPendingSubmission] = useState(null);

  // API payment states
  const [apiError, setApiError] = useState("");
  const [pollingState, setPollingState] = useState(""); // 'waiting', 'success', 'error'
  const [pollIntervalId, setPollIntervalId] = useState(null);

  const amount = useMemo(() => {
    if (!selectedPackage) return "$0.00";
    if (billingCycle === "monthly" && selectedPackage.monthlyPrice) {
      return selectedPackage.monthlyPrice;
    }
    return selectedPackage.annualPrice;
  }, [billingCycle, selectedPackage]);

  const numericAmount = useMemo(() => {
    if (!selectedPackage) return 0;
    if (billingCycle === "monthly" && selectedPackage.monthly_price != null) {
      return selectedPackage.monthly_price;
    }
    return selectedPackage.annual_price ?? 0;
  }, [billingCycle, selectedPackage]);

  // Load active payment methods
  useEffect(() => {
    const fetchMethods = async () => {
      setLoadingMethods(true);
      try {
        const res = await api.get("/api/payments_system/methods");
        setPaymentMethods(res.data);
        if (res.data.length > 0) {
          const apiMethods = res.data.filter((method) => method.mode === "api" && method.api_status !== "disabled");
          const recommendedApi = apiMethods.find((method) => method.is_recommended);
          const recommended = res.data.find(m => m.is_recommended);
          setSelectedMethod(recommendedApi || apiMethods[0] || recommended || res.data[0]);
        }
      } catch (err) {
        console.error("Failed to load payment methods", err);
      } finally {
        setLoadingMethods(false);
      }
    };
    fetchMethods();
  }, []);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalId) clearInterval(pollIntervalId);
    };
  }, [pollIntervalId]);

  // After an automatic payment request, poll the submission status until the
  // provider (or its webhook) confirms — then unlock access immediately.
  const startPolling = (submissionId) => {
    let attempts = 0;
    const maxAttempts = 30; // 60 seconds max
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        setPollingState("error");
        setApiError("Codsigu waa uu dhacay. Fadlan isku day markale. (Request timed out. Please try again.)");
        setIsProcessing(false);
        return;
      }

      try {
        const res = await api.get(`/api/payments_system/status/${submissionId}`);
        const status = res.data.status;
        
        if (status === "approved") {
          clearInterval(interval);
          setPollingState("success");
          await checkSubscription();
          setIsProcessing(false);
        } else if (status === "insufficient_balance") {
          clearInterval(interval);
          setPollingState("error");
          setApiError("Haraagaagu kuma filna. Fadlan ku shubo oo isku day markale. (Insufficient balance. Please top up your account and try again.)");
          setIsProcessing(false);
        } else if (status === "cancelled") {
          clearInterval(interval);
          setPollingState("error");
          setApiError("Kala iibsiga waa la joojiyey. (Transaction was cancelled by user.)");
          setIsProcessing(false);
        } else if (status === "failed") {
          clearInterval(interval);
          setPollingState("error");
          setApiError("Lacag bixintu waa ay guuldareystay. (Payment failed. Please try again.)");
          setIsProcessing(false);
        }
      } catch (err) {
        console.error("Error polling status", err);
      }
    }, 2000);

    setPollIntervalId(interval);
    return interval;
  };

  // Pre-fill amount paid when selected package or billing cycle changes
  useEffect(() => {
    if (numericAmount) {
      setAmountPaid(numericAmount.toString());
    }
  }, [numericAmount]);

  if (!selectedPackage) {
    return (
      <div className="min-h-screen bg-[#0c031a] text-white flex items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-slate-800 bg-[#130b24] p-8 text-center">
          <h1 className="text-xl font-bold">Package not found</h1>
          <p className="mt-2 text-sm text-slate-400">Please choose a valid package.</p>
          <button
            onClick={() => navigate("/packages")}
            className="mt-6 rounded-xl bg-indigo-650 px-5 py-3 text-xs font-bold text-white"
          >
            Back to packages
          </button>
        </div>
      </div>
    );
  }

  const supportsMonthly = Boolean(selectedPackage.monthlyPrice);

  // Compute USSD formula based on type.
  // USSD dialers reject spaces and international prefixes, so normalize the
  // admin's receiving number to the local format (e.g. "+252 61 270.." → "61270..").
  const getUssdCode = (method, recvNum, price) => {
    if (!method) return "";
    let num = String(recvNum || "").replace(/\D/g, "");
    if (num.startsWith("252")) num = num.slice(3);
    recvNum = num;
    const type = method.method_type;
    if (type === `${String.fromCharCode(101, 118, 99)}_plus`) {
      return `*712*${recvNum}*${price}#`;
    } else if (type === "zaad") {
      return `*889*${recvNum}*${price}#`;
    } else if (type === "sahal") {
      return `*912*${recvNum}*${price}#`;
    } else if (type === "edahab") {
      return `*101*${recvNum}*${price}#`;
    }
    return "";
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(""), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Faylka waa inuu ka yaraadaa 5MB. (File size must be under 5MB.)");
      return;
    }

    // Validate type: jpg/jpeg/png/webp images or PDF
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      alert("Fadlan soo gali sawir (JPG, PNG, WEBP) ama PDF. (Only JPG, PNG, WEBP or PDF allowed.)");
      return;
    }

    setScreenshotFile(file);
    setScreenshotIsPdf(file.type === "application/pdf");
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (isProcessing) return;

    if (!senderPhone.trim()) {
      alert("Fadlan geli nambarka aad lacagta ka dirtay.");
      return;
    }
    if (!transactionId.trim()) {
      alert("Fadlan geli aqoonsiga kala iibsiga (Transaction ID).");
      return;
    }
    if (!screenshotFile) {
      alert("Fadlan soo gali sawirka caddaynta (Screenshot).");
      return;
    }

    setIsProcessing(true);
    setMessage("");

    try {
      // 1) Upload the actual receipt file to the protected backend store.
      //    The backend validates type/size and returns an opaque file_key.
      const formData = new FormData();
      formData.append("file", screenshotFile);
      const uploadRes = await api.post(
        "/api/payments_system/upload-receipt",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const fileKey = uploadRes.data.file_key;

      // 2) Create the submission referencing the stored receipt key.
      const res = await api.post("/api/payments_system/submit-manual", {
        package_id: selectedPackage.id,
        package_name: selectedPackage.displayTitle || selectedPackage.title,
        package_price: parseFloat(amountPaid),
        package_duration_months: billingCycle === "monthly" ? 1 : 12,
        payment_method: selectedMethod.method_type,
        admin_receiving_account: selectedMethod.receiving_number,
        sender_phone: senderPhone.trim(),
        amount_paid: parseFloat(amountPaid),
        currency: selectedMethod.currency,
        transaction_id: transactionId.trim(),
        screenshot_url: fileKey
      });

      setPaymentStatus("pending");
      setPendingSubmission(res.data);
      setMessage("Lacag bixintaada waa la gudbiyey! Maamulka ayaa dib u eegi doona hadda.");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Gudbinta lacag bixinta waa ay guuldareystay.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApiPaymentSubmit = async (e) => {
    e.preventDefault();
    if (isProcessing) return;

    if (!senderPhone.trim()) {
      alert("Fadlan geli nambarkaaga.");
      return;
    }

    setIsProcessing(true);
    setApiError("");
    setPollingState("waiting");

    try {
      const res = await api.post("/api/payments_system/submit-api", {
        package_id: selectedPackage.id,
        package_name: selectedPackage.displayTitle || selectedPackage.title,
        package_price: numericAmount,
        package_duration_months: billingCycle === "monthly" ? 1 : 12,
        payment_method: selectedMethod.method_type,
        sender_phone: senderPhone.trim(),
        admin_receiving_account: selectedMethod.receiving_number,
        currency: selectedMethod.currency
      });

      const submission = res.data;
      setPendingSubmission(submission);

      if (submission.status === "approved") {
        // Live gateway confirmed synchronously (student entered PIN).
        setPaymentStatus("approved");
        setPollingState("success");
        setMessage("Lacag bixintaada waa la xaqiijiyey! (Payment verified!) Access unlocked.");
        await checkSubscription();
        setIsProcessing(false);
      } else if (["failed", "rejected"].includes(submission.status)) {
        setApiError(
          submission.admin_note ||
            "Lacag bixintu waa ay guuldareystay. Fadlan isku day markale. (Payment failed. Please try again.)"
        );
        setPollingState("error");
        setIsProcessing(false);
      } else {
        // Pending: confirmation arrives via provider webhook — keep watching.
        setPaymentStatus("pending");
        setMessage("Codsiga waa la diray. Geli PIN-kaaga telefoonka. (Request sent — enter your PIN on your phone.)");
        startPolling(submission.id);
      }
    } catch (err) {
      console.error(err);
      setApiError(err.response?.data?.detail || "Gudbinta lacag bixinta waa ay guuldareystay.");
      setPollingState("error");
      setIsProcessing(false);
    }
  };

  // Prefer the exact package price so the dial code is complete the moment
  // the page loads; the student's typed amount (if any) takes precedence.
  const dialAmount =
    amountPaid ||
    (numericAmount > 0 ? numericAmount : String(amount).replace(/[^0-9.]/g, ""));
  const ussdCode = selectedMethod
    ? getUssdCode(selectedMethod, selectedMethod.receiving_number, dialAmount)
    : "";
  // tel: URI so one tap opens the phone dialer with the code pre-filled.
  // '#' must be percent-encoded or the dialer drops everything after it.
  const ussdDialHref = ussdCode ? `tel:${ussdCode.replace(/#/g, "%23")}` : "";

  return (
    <div className="min-h-screen bg-[#0c031a] text-white font-sans overflow-x-hidden">
      <header className="border-b border-slate-800 bg-[#130b24]/70 backdrop-blur-md sticky top-0 z-15">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button
            onClick={() => navigate("/packages")}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-850"
          >
            <ArrowLeft className="h-4 w-4" />
            Xir (Cancel)
          </button>
          <span className="text-xs font-bold text-indigo-400">SomPrep AI Subscription Portal</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Payment request created; access remains locked until confirmation */}
        {paymentStatus ? (
          <div className="max-w-2xl mx-auto rounded-3xl border border-slate-850 bg-[#130b24] p-8 text-center space-y-6">
            <div className="h-16 w-16 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto animate-bounce">
              <Clock className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold font-outfit text-white">Lacag Bixintu Waxay Sugaysaa Xaqiijin</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {message || "Codsiga lacag bixinta waa la diray. Waxaan sugaynaa xaqiijin. (Payment request sent. Waiting for confirmation.) Paid lessons stay locked until the payment is verified."}
              </p>
            </div>

            {/* Timeline status block */}
            <div className="py-6 max-w-md mx-auto">
              <div className="relative flex items-center justify-between">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 -z-10" />
                
                {/* Step 1 */}
                <div className="flex flex-col items-center">
                  <div className="h-7 w-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs">✓</div>
                  <span className="text-[9px] font-bold text-slate-500 mt-2">Gudbiyey (Sent)</span>
                </div>
                
                {/* Step 2 */}
                <div className="flex flex-col items-center">
                  <div className="h-7 w-7 rounded-full bg-indigo-650 text-white flex items-center justify-center font-bold text-xs animate-pulse">2</div>
                  <span className="text-[9px] font-bold text-indigo-400 mt-2">Xaqiijinta (Reviewing)</span>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col items-center">
                  <div className="h-7 w-7 rounded-full bg-slate-800 text-slate-550 flex items-center justify-center font-bold text-xs">3</div>
                  <span className="text-[9px] font-bold text-slate-500 mt-2">Firfircoon (Active)</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-850 pt-5 flex items-center justify-center gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => { setPaymentStatus(""); setPendingSubmission(null); }}
                className="px-5 py-3 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition"
              >
                Submit another receipt
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left panel: Package summary */}
            <section className="lg:col-span-5 rounded-3xl border border-slate-850 bg-[#130b24] p-6 space-y-6 h-fit">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/25">
                  Subscription Package
                </span>
                <h1 className="mt-4 font-outfit text-2xl font-extrabold text-white">
                  {selectedPackage.displayTitle || selectedPackage.title}
                </h1>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">{selectedPackage.audience}</p>
              </div>

              {/* Price card */}
              <div className="rounded-2xl border border-indigo-500/25 bg-indigo-550/10 p-5 space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{amount}</span>
                  <span className="text-xs font-bold text-slate-400">
                    / {billingCycle === "monthly" ? "month" : "12 months"}
                  </span>
                </div>
                <p className="text-[10px] text-indigo-300">
                  Access duration: {billingCycle === "monthly" ? "30 Days Full Access" : "365 Days Unlimited Access"}
                </p>
              </div>

              {/* User details */}
              <div className="border-t border-slate-850 pt-4 space-y-1.5 text-xs text-slate-400">
                <p><span className="font-bold text-slate-500">Student Name:</span> <span className="text-white">{user?.full_name}</span></p>
                <p><span className="font-bold text-slate-500">Login Mobile/ID:</span> <span className="text-white">{user?.phone_number}</span></p>
              </div>

              <ul className="space-y-2.5 pt-4 border-t border-slate-850">
                {(selectedPackage.packageFeatures || selectedPackage.features).slice(0, 6).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-slate-350">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-indigo-400 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Right panel: Payment method selector and USSD forms */}
            <section className="lg:col-span-7 rounded-3xl border border-slate-850 bg-[#130b24] p-8 space-y-8">
              {/* Method select */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dooro Habka Lacag Bixinta (Payment Method)</h3>
                
                {loadingMethods ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  </div>
                ) : paymentMethods.length === 0 ? (
                  <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/5 text-center text-xs text-red-400">
                    Nidaamka lacag bixinta hadda diyaar ma aha. Fadlan la xiriir maamulka.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {paymentMethods.map((method) => {
                      const isSel = selectedMethod?.id === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedMethod(method)}
                          className={`rounded-2xl border p-4 text-center transition flex flex-col items-center justify-center gap-2 ${
                            isSel
                              ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                              : "border-slate-850 bg-slate-900/30 text-slate-400 hover:text-white"
                          }`}
                        >
                          {method.method_type === "bank_transfer" ? (
                            <Building className="h-6 w-6" />
                          ) : (
                            <Smartphone className="h-6 w-6" />
                          )}
                          <span className="text-[10px] font-bold uppercase truncate w-full">
                            {method.method_type.replace("_", " ")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Billing Cycle select */}
              {supportsMonthly && (
                <div className="space-y-3">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Billing Options
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBillingCycle("annual")}
                      className={`rounded-2xl border p-4 text-left transition ${
                        billingCycle === "annual"
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-slate-850 bg-slate-900/30"
                      }`}
                    >
                      <span className="block text-xs font-bold text-white">Annual access</span>
                      <span className="mt-1 block text-[10px] text-slate-550">{selectedPackage.annualLabel}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBillingCycle("monthly")}
                      className={`rounded-2xl border p-4 text-left transition ${
                        billingCycle === "monthly"
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-slate-850 bg-slate-900/30"
                      }`}
                    >
                      <span className="block text-xs font-bold text-white">Monthly access</span>
                      <span className="mt-1 block text-[10px] text-slate-550">{selectedPackage.monthlyLabel}</span>
                    </button>
                  </div>
                </div>
              )}              {/* Payment Instructions visual */}
              {selectedMethod && selectedMethod.mode === "manual" && (
                <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-5 space-y-4">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2 border-b border-slate-850 pb-2">
                    <span>Hanuuninta Bixinta: {selectedMethod.account_name}</span>
                  </h4>
                  
                  {/* Instructions text */}
                  <p className="text-[11px] text-slate-350 leading-relaxed whitespace-pre-line">{selectedMethod.instructions}</p>

                  {/* USSD Box for mobile money — one tap dials, one tap copies */}
                  {ussdCode && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/25 space-y-3">
                      <div className="text-center sm:text-left">
                        <span className="text-[9px] font-bold text-emerald-400 uppercase block mb-1">
                          Si degdeg ah ugu bixi — garaac lambarkan (Fastest way to pay)
                        </span>
                        <span className="text-lg font-black font-mono text-indigo-300 tracking-wide break-all">{ussdCode}</span>
                        <span className="text-[10px] text-slate-500 block mt-1">
                          Kadib geli PIN-kaaga oo xaqiiji. (Then enter your PIN and confirm.)
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <a
                          href={ussdDialHref}
                          className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>Garaac Hadda (Dial Now)</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(ussdCode, "ussd")}
                          className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                        >
                          {copiedText === "ussd" ? <Check className="h-3.5 w-3.5 text-emerald-350" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedText === "ussd" ? "Copied" : "Copy Code"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Account detail row */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Receiving Number / Account</span>
                      <span className="font-extrabold text-white font-mono">{selectedMethod.receiving_number}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedMethod.receiving_number, "number")}
                      className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                    >
                      {copiedText === "number" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>Copy Number</span>
                    </button>
                  </div>
                </div>
              )}

              {selectedMethod && selectedMethod.mode === "api" && (
                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 space-y-2">
                  <h4 className="text-xs font-black text-white flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>Lacag bixin toos ah oo degdeg ah (Fast API Checkout)</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Nidaamkani wuxuu lacagta toos uga gooyaa nambarkaaga marka aad xaqiijiso. Kaliya geli nambarkaaga hoos ku yaal, guji "Pay Now", ka dibna PIN-kaaga geli talefankaaga.
                  </p>
                </div>
              )}

              {/* API Checkout Form */}
              {selectedMethod && selectedMethod.mode === "api" && (
                <form onSubmit={handleApiPaymentSubmit} className="space-y-6">
                  {/* Phone input */}
                  <div className="space-y-1">
                    <label htmlFor="api_phone" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Nambarkaaga Mobile Money (Payment Number)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">+252</span>
                      <input
                        id="api_phone"
                        type="text"
                        required
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        placeholder="61xxxxxxx"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-14 pr-4 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Geli 9 lambar oo ku bilaabma 61, 62, 63, 64, 65, 68, ama 90. (Enter 9-digit number.)
                    </p>
                  </div>

                  {/* Safety PIN Notice alert */}
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-850 bg-slate-900/30 p-4">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-indigo-400 shrink-0 animate-pulse" />
                    <div className="text-[10px] text-slate-400 leading-relaxed space-y-1">
                      <p>
                        Wadarta guud ee biilka waa <strong className="text-white">{amount}</strong>.
                      </p>
                      <p>
                        Marka aad gujiso <strong>"Pay Now"</strong>, waxaad heli doontaa fariin xaqiijin ah oo ku soo dhacaysa talefankaaga. Fadlan geli PIN-kaaga si toos ah oo kaliya talefankaaga dhexdiisa si aad u xaqiijiso.
                      </p>
                    </div>
                  </div>

                  {apiError && (
                    <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/5 text-xs text-red-400 font-semibold leading-relaxed">
                      {apiError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-sm font-bold text-white hover:bg-indigo-750 transition disabled:opacity-50 shadow-lg shadow-indigo-600/10"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gudbinaya codsiga...
                      </>
                    ) : (
                      `Bixi Hadda (Pay Now ${amount})`
                    )}
                  </button>
                </form>
              )}

              {/* Receipt Upload Form */}
              {selectedMethod && selectedMethod.mode === "manual" && (
                <form onSubmit={handleSubmitPayment} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="sender_phone" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Nambarka laga soo diray (Sender Phone)
                      </label>
                      <input
                        id="sender_phone"
                        type="text"
                        required
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        placeholder="tusaale: 61xxxxxxx"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 px-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="trans_id" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Aqoonsiga kala iibsiga (Transaction ID)
                      </label>
                      <input
                        id="trans_id"
                        type="text"
                        required
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="tusaale: TXN784920"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 px-4 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="amount_paid" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Xaddiga la bixiyey (Amount Paid)
                      </label>
                      <input
                        id="amount_paid"
                        type="number"
                        step="0.01"
                        required
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 px-4 text-xs text-white focus:outline-none"
                      />
                    </div>

                    {/* Image Receipt File upload picker */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Soo geli Caddaynta / Sawirka (Upload Receipt)
                      </label>
                      <div className="relative">
                        <input
                          id="file-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="file-upload"
                          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-800 bg-slate-900 py-3 px-4 text-xs text-slate-400 cursor-pointer hover:bg-slate-850 hover:text-white transition"
                        >
                          <Upload className="h-4 w-4 text-indigo-400" />
                          <span>{screenshotFile ? screenshotFile.name : "Select Screenshot"}</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Screenshot / PDF Preview */}
                  {screenshotPreview && (
                    <div className="rounded-xl overflow-hidden border border-slate-800 p-2 bg-slate-950 flex flex-col items-center">
                      <span className="text-[9px] font-bold text-slate-500 mb-2 uppercase block">Selected File Preview</span>
                      {screenshotIsPdf ? (
                        <div className="flex items-center gap-2 px-4 py-6 text-slate-300">
                          <ImageIcon className="h-5 w-5 text-indigo-400" />
                          <span className="text-xs font-bold">{screenshotFile?.name || "receipt.pdf"} (PDF)</span>
                        </div>
                      ) : (
                        <img src={screenshotPreview} alt="Receipt Preview" className="max-h-48 object-contain rounded" />
                      )}
                    </div>
                  )}

                  {/* Safety PIN Notice alert */}
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-850 bg-slate-900/30 p-4">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-indigo-400 shrink-0 animate-pulse" />
                    <p className="text-[10px] text-slate-450 leading-relaxed">
                      Nidaamka SomPrep AI <strong>waligiis ma weydiinayo PIN-kaaga Mobile Money-ga</strong> websaydka dhexdiisa. PIN-kaaga kaliya geli taleefankaaga USSD screen-kiisa gaarka ah marka aad lacagta dirayso.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-sm font-bold text-white hover:bg-indigo-750 transition disabled:opacity-50 shadow-lg shadow-indigo-600/10"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gudbinaya caddaynta...
                      </>
                    ) : (
                      "Gudbi Caddaynta Lacag Bixinta (Submit Verification)"
                    )}
                  </button>
                </form>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Premium Polling Overlay */}
      {isProcessing && pollingState === "waiting" && (
        <div className="fixed inset-0 bg-[#0c031af0] backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl border border-slate-800 bg-[#130b24] p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-indigo-500/10 blur-xl"></div>
            <div className="absolute -bottom-12 -right-12 w-24 h-24 rounded-full bg-purple-500/10 blur-xl"></div>
            
            <div className="relative">
              <div className="h-20 w-20 bg-indigo-650/10 border border-indigo-500/25 rounded-3xl flex items-center justify-center text-indigo-400 mx-auto animate-pulse">
                <Loader2 className="h-10 w-10 animate-spin" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black font-outfit text-white">Xaqiijinta Lacag Bixinta ee Tooska ah</h3>
              <p className="text-xs text-slate-450 leading-relaxed">
                Fadlan ku xaqiiji bixinta lacagta talefankaaga gacanta.
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-850 text-left space-y-3 text-[11px] text-slate-350">
              <div className="flex gap-2.5 items-start">
                <span className="h-4.5 w-4.5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[9px] shrink-0">1</span>
                <p>Codsiga lacag bixinta ee <strong className="text-white">{amount}</strong> ayaa loo soo diray nambarkaaga.</p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="h-4.5 w-4.5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[9px] shrink-0">2</span>
                <p>Geli 4-ta nambar ee PIN-kaaga marka uu talefankaagu ku weydiiyo.</p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="h-4.5 w-4.5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[9px] shrink-0">3</span>
                <p>Koorsadu ma furmayso ilaa bixinta lacagta la xaqiijiyo.</p>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 italic animate-pulse">
              Sugaya xaqiijinta provider-ka lacag bixinta...
            </p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {pollingState === "success" && (
        <div className="fixed inset-0 bg-[#0c031af0] backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl border border-emerald-500/30 bg-[#130b24] p-8 text-center space-y-6 shadow-2xl relative">
            <div className="h-20 w-20 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="h-12 w-12" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black font-outfit text-white">Lacag Bixintu Waa La Xaqiijiyey!</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hambalyo! Lacag bixintaada waa la xaqiijiyey, koorsadaaduna hadda waa firfircoon tahay.
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-850 text-left space-y-2 text-[11px] text-slate-350">
              <p><span className="font-bold text-slate-500">Qorshaha (Package):</span> <span className="text-white font-bold">{selectedPackage.displayTitle || selectedPackage.title}</span></p>
              <p><span className="font-bold text-slate-500">Muddada (Duration):</span> <span className="text-white">{billingCycle === "monthly" ? "30 Maalmood" : "1 Sannad"}</span></p>
              <p><span className="font-bold text-slate-500">Maqaamka (Status):</span> <span className="text-emerald-400 font-bold uppercase">Active (Firfircoon)</span></p>
            </div>

            <button
              onClick={() => {
                navigate("/dashboard");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 py-4 text-sm font-bold text-white transition shadow-lg shadow-emerald-600/10"
            >
              <span>Bilow Barashada (Start Learning)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
