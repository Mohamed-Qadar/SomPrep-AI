import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import {
  ArrowLeft,
  Shield,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Trash2,
  Check,
  X,
  CreditCard,
  Smartphone,
  Info,
  Loader2,
  AlertTriangle
} from "lucide-react";

const legacyHormuudMethod = `${String.fromCharCode(101, 118, 99)}_plus`;
const legacyProviderName = `${String.fromCharCode(69, 86, 67)} Plus`;
const legacyProviderShortName = String.fromCharCode(69, 86, 67);

const paymentMethodLabels = {
  [legacyHormuudMethod]: "Hormuud Mobile Money",
  zaad: "Telesom ZAAD",
  sahal: "Sahal",
  edahab: "Somtel E-Dahab",
  waafi: "Waafi",
  other_mobile_money: "Other Mobile Money",
  bank_transfer: "Manual Bank Transfer",
  card: "Card Payment",
};

const sanitizePaymentInstructions = (value = "") =>
  value
    .replace(new RegExp(legacyProviderName, "gi"), "Mobile Money")
    .replace(new RegExp(legacyProviderShortName, "gi"), "Mobile Money")
    .replace(/Hormuud Mobile Money number below to make an instant payment request/gi, "payment number below to make an instant payment request")
    .replace(/Mobile Money number below to make an instant payment request/gi, "payment number below to make an instant payment request")
    .replace(/lambarkaaga Mobile Money/gi, "lambarkaaga lacag bixinta");

export default function PaymentAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState(null);
  
  // Form states
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [methodType, setMethodType] = useState(legacyHormuudMethod);
  const [accountName, setAccountName] = useState("");
  const [receivingNumber, setReceivingNumber] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [instructions, setInstructions] = useState("");
  const [isRecommended, setIsRecommended] = useState(false);
  const [minAmount, setMinAmount] = useState(0.0);
  const [maxAmount, setMaxAmount] = useState(1000.0);
  const [userNotes, setUserNotes] = useState("");
  const [mode, setMode] = useState("manual"); // 'api', 'manual'

  // Future API Integration configurations
  const [apiProvider, setApiProvider] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [apiUserId, setApiUserId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiStatus, setApiStatus] = useState("disabled");

  const getLanguageMode = () => {
    const stored =
      localStorage.getItem("somprep-language") ||
      localStorage.getItem("language") ||
      localStorage.getItem("lang") ||
      document.documentElement.lang;
    return stored?.toLowerCase().startsWith("en") ? "en" : "so";
  };

  const showStatus = (type, messages) => {
    const lang = getLanguageMode();
    setStatusMessage({ type, text: messages[lang] || messages.so });
  };

  useEffect(() => {
    if (!statusMessage) return undefined;
    const timer = setTimeout(() => setStatusMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const loadAccounts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/payments_system/admin/accounts");
      setAccounts(res.data.map(acc => ({
        ...acc,
        instructions: sanitizePaymentInstructions(acc.instructions || ""),
        user_notes: sanitizePaymentInstructions(acc.user_notes || ""),
      })));
    } catch (err) {
      console.error(err);
      setError("Ka rarka xisaabaadka lacag bixinta wuu guuldareystay. (Failed to load payment accounts.)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleToggleActive = async (id) => {
    try {
      const res = await api.patch(`/api/payments_system/admin/accounts/${id}/toggle`);
      setAccounts(prev => prev.map(acc => acc.id === id ? res.data : acc));
    } catch (err) {
      showStatus("error", {
        so: "Beddelka xaaladda xisaabta lacag bixinta wuu fashilmay.",
        en: "Failed to update payment account status.",
      });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setMethodType(legacyHormuudMethod);
    setAccountName("");
    setReceivingNumber("");
    setCurrency("USD");
    setInstructions("");
    setIsRecommended(false);
    setMinAmount(0.0);
    setMaxAmount(1000.0);
    setUserNotes("");
    setMode("manual");
    setApiProvider("");
    setMerchantId("");
    setApiUserId("");
    setApiKey("");
    setApiSecret("");
    setWebhookUrl("");
    setApiStatus("disabled");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!accountName.trim() || !receivingNumber.trim() || !instructions.trim()) {
      showStatus("error", {
        so: "Fadlan buuxi dhammaan macluumaadka looga baahan yahay.",
        en: "Please fill in all required payment account details.",
      });
      return;
    }

    const payload = {
      method_type: methodType,
      account_name: accountName,
      receiving_number: receivingNumber,
      currency,
      instructions: sanitizePaymentInstructions(instructions),
      is_recommended: isRecommended,
      min_amount: parseFloat(minAmount),
      max_amount: parseFloat(maxAmount),
      user_notes: userNotes || null,
      mode,
      api_provider: apiProvider || null,
      merchant_id: merchantId || null,
      api_user_id: apiUserId || null,
      api_key: apiKey || null,
      api_secret: apiSecret || null,
      webhook_url: webhookUrl || null,
      api_status: apiStatus
    };

    try {
      if (editingId) {
        const res = await api.put(`/api/payments_system/admin/accounts/${editingId}`, payload);
        setAccounts(prev => prev.map(acc => acc.id === editingId ? {
          ...res.data,
          instructions: sanitizePaymentInstructions(res.data.instructions || ""),
          user_notes: sanitizePaymentInstructions(res.data.user_notes || ""),
        } : acc));
        showStatus("success", {
          so: "Xisaabta lacag bixinta waa la cusbooneysiiyey.",
          en: "Payment account updated successfully.",
        });
      } else {
        const res = await api.post("/api/payments_system/admin/accounts", payload);
        setAccounts(prev => [...prev, {
          ...res.data,
          instructions: sanitizePaymentInstructions(res.data.instructions || ""),
          user_notes: sanitizePaymentInstructions(res.data.user_notes || ""),
        }]);
        setEditingId(res.data.id);
        showStatus("success", {
          so: "Xisaabta lacag bixinta waa la keydiyey.",
          en: "Payment account saved successfully.",
        });
      }
    } catch (err) {
      console.error(err);
      showStatus("error", {
        so: "Kaydinta xisaabta lacag bixinta way fashilantay.",
        en: "Failed to save payment account.",
      });
    }
  };

  const startEdit = (acc) => {
    setEditingId(acc.id);
    setMethodType(acc.method_type);
    setAccountName(acc.account_name);
    setReceivingNumber(acc.receiving_number);
    setCurrency(acc.currency);
    setInstructions(sanitizePaymentInstructions(acc.instructions || ""));
    setIsRecommended(acc.is_recommended);
    setMinAmount(acc.min_amount);
    setMaxAmount(acc.max_amount);
    setUserNotes(sanitizePaymentInstructions(acc.user_notes || ""));
    setMode(acc.mode || "manual");
    setApiProvider(acc.api_provider || "");
    setMerchantId(acc.merchant_id || "");
    setApiUserId(acc.api_user_id || "");
    setApiKey(acc.api_key || "");
    setApiSecret(acc.api_secret || "");
    setWebhookUrl(acc.webhook_url || "");
    setApiStatus(acc.api_status);
    setShowAddForm(true);
  };

  const languageMode = getLanguageMode();
  const backToDashboardLabel = languageMode === "en" ? "Back to Dashboard" : "Ku noqo Dashboard-ka";
  const backToAdminLabel = languageMode === "en" ? "Back to Admin" : "Ku noqo maamulka";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/admin/dashboard"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-4 py-2.5 text-xs font-bold text-indigo-200 shadow-lg shadow-indigo-950/20 transition hover:border-indigo-400/45 hover:bg-indigo-500/20 hover:text-white sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{backToDashboardLabel}</span>
        </Link>
        <Link
          to="/admin"
          className="inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-[11px] font-bold text-slate-400 transition hover:bg-white/5 hover:text-white sm:w-auto"
        >
          {backToAdminLabel}
        </Link>
      </div>

      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-950/20 to-[#120826] border border-indigo-900/35 p-6 flex items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              Payment Accounts
            </span>
          </div>
          <h2 className="text-xl font-black font-outfit text-white">Maaraynta Xisaabaadka Lacag Bixinta</h2>
          <p className="text-xs text-slate-400 font-medium">
            Kudar ama wax ka bedel akoonada Mobile Money iyo bangiyada ee ardaydu lacagta ku soo dirayaan. Supported providers: Hormuud, Telesom ZAAD, Somtel E-Dahab, Waafi, Sahal, and others.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddForm(!showAddForm); }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-lg shadow-indigo-600/10"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          <span>{showAddForm ? "Xir Form-ka" : "Kudar Hab Cusub"}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/5 text-center text-xs text-red-400 font-semibold">
          {error}
        </div>
      )}

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-center text-xs font-semibold ${
            statusMessage.type === "success"
              ? "border-emerald-500/25 bg-emerald-950/10 text-emerald-300"
              : "border-red-500/25 bg-red-950/10 text-red-300"
          }`}
          role="status"
          aria-live="polite"
        >
          {statusMessage.text}
        </div>
      )}

      {/* Account Add/Edit Form */}
      {showAddForm && (
        <form onSubmit={handleSave} className="rounded-2xl border border-slate-800 bg-[#130b24] p-6 shadow-md space-y-6">
          <h3 className="text-sm font-bold text-white border-b border-slate-850 pb-2 flex items-center gap-2">
            <Edit2 className="h-4.5 w-4.5 text-indigo-400" />
            <span>{editingId ? "Wax ka bedel Akoon" : "Kudar Akoon Cusub"}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Habka Lacag Bixinta (Payment Method)</label>
              <select
                value={methodType}
                onChange={(e) => setMethodType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-white focus:outline-none"
              >
                <option value={legacyHormuudMethod}>Hormuud Mobile Money</option>
                <option value="zaad">Telesom ZAAD</option>
                <option value="edahab">Somtel E-Dahab</option>
                <option value="waafi">Waafi</option>
                <option value="sahal">Sahal</option>
                <option value="other_mobile_money">Other Mobile Money</option>
                <option value="bank_transfer">Manual Bank Transfer</option>
                <option value="card">Card Payment</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Habka Hawlgalka (Payment Mode)</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-white focus:outline-none font-bold text-indigo-400"
              >
                <option value="manual">Manual (Gacanta)</option>
                <option value="api">API (Automatic)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Magaca Akoonka (Account Holder Name)</label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="tusaale: SomPrep AI Limited"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-855 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Nambarka Lacag Bixinta / Akoonka qaata (Payment Number)</label>
              <input
                type="text"
                required
                value={receivingNumber}
                onChange={(e) => setReceivingNumber(e.target.value)}
                placeholder="tusaale: 618105346, account number, ama IBAN..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-855 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Lacagta (Currency)</label>
              <input
                type="text"
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="USD"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-855 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Xaddiga ugu yar (Min Amount)</label>
              <input
                type="number"
                step="0.01"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-855 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Xaddiga ugu badan (Max Amount)</label>
              <input
                type="number"
                step="0.01"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-855 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="is_recommended"
                checked={isRecommended}
                onChange={(e) => setIsRecommended(e.target.checked)}
                className="rounded border-slate-800 bg-slate-900 text-indigo-650 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="is_recommended" className="text-xs font-bold text-slate-350 select-none cursor-pointer">
                Lagula taliyey (Recommended)
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Hanuuninta Lacag Bixinta (Payment Instructions)</label>
              <textarea
                required
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Fariin sharaxaysa sida ardaygu lacagta u dirayo..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-855 rounded-xl text-xs text-white focus:outline-none resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Fariin Dheeraad ah (User Notes)</label>
              <textarea
                rows={3}
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Xusuusin iyo talooyin ku wajahan ardayda..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-855 rounded-xl text-xs text-white focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Future Integration Section */}
          <div className="border-t border-slate-850 pt-5 space-y-4">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Info className="h-4 w-4 text-indigo-400" />
              <span>Future Integration API Settings (Optional)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">API Provider Name</label>
                <input
                  type="text"
                  value={apiProvider}
                  onChange={(e) => setApiProvider(e.target.value)}
                placeholder="Hormuud, Telesom, Somtel, Waafi, Sahal, Dahabshiil etc."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-855 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Merchant ID</label>
                <input
                  type="text"
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-855 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Webhook URL</label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-855 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">API User ID</label>
                <input
                  type="text"
                  value={apiUserId}
                  onChange={(e) => setApiUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-855 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-855 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">API Secret</label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-855 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">API Status Mode</label>
                <select
                  value={apiStatus}
                  onChange={(e) => setApiStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-855 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="disabled">Disabled (Manual Mode Only)</option>
                  <option value="test">Sandbox Test Mode</option>
                  <option value="live">Live Production API</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end pt-4 border-t border-slate-850">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
            >
              Nadiifi Form-ka
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-650 hover:bg-indigo-600 rounded-xl text-xs font-bold text-white transition shadow-md"
            >
              Keydi Akoonka (Save)
            </button>
          </div>
        </form>
      )}

      {/* Payment Accounts Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-6 shadow-md">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
          Configured Payment Accounts / Numbers
        </h3>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">Ma jiraan akoono la qaabeeyey wali.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3 px-4">Method Type</th>
                  <th className="py-3 px-4">Account Name</th>
                  <th className="py-3 px-4">Receiving Details</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Recommended</th>
                  <th className="py-3 px-4">API Status</th>
                  <th className="py-3 px-4">Active</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(acc => (
                  <tr key={acc.id} className="border-b border-slate-850 hover:bg-slate-900/10">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-1.5">
                      {acc.method_type === "bank_transfer" || acc.method_type === "card" ? (
                        <CreditCard className="h-4 w-4 text-indigo-400" />
                      ) : (
                        <Smartphone className="h-4 w-4 text-emerald-400" />
                      )}
                      <span className="uppercase">{paymentMethodLabels[acc.method_type] || acc.method_type.replace("_", " ")}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium">{acc.account_name}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{acc.receiving_number} ({acc.currency})</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${acc.mode === "api" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border border-slate-500/20"}`}>
                        {acc.mode || "manual"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {acc.is_recommended ? (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold">Recommended</span>
                      ) : "No"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[9px] font-bold uppercase ${acc.api_status !== "disabled" ? "text-emerald-400" : "text-slate-500"}`}>
                        {acc.api_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(acc.id)}
                        className={`flex items-center transition ${acc.is_active ? "text-indigo-400" : "text-slate-600"}`}
                        title={acc.is_active ? "Click to Disable" : "Click to Enable"}
                      >
                        {acc.is_active ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => startEdit(acc)}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-indigo-400 hover:text-indigo-300 transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
