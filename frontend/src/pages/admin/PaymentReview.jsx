import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { downloadAuthenticatedFile } from "../../utils/downloadFile";
import {
  Shield,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  MessageSquare,
  FileSpreadsheet,
  FileText,
  X
} from "lucide-react";

// Loads a payment receipt through the access-controlled backend endpoint.
// Receipts are no longer public URLs — we fetch the file as an authenticated
// blob (the axios interceptor attaches the bearer token) and render it locally.
function ReceiptThumbnail({ submissionId, onOpen }) {
  const [objectUrl, setObjectUrl] = useState("");
  const [isPdf, setIsPdf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let createdUrl = "";
    const load = async () => {
      setLoading(true);
      setFailed(false);
      try {
        const res = await api.get(`/api/payments_system/receipt/${submissionId}`, {
          responseType: "blob",
        });
        createdUrl = URL.createObjectURL(res.data);
        if (!cancelled) {
          setObjectUrl(createdUrl);
          setIsPdf(res.data.type === "application/pdf");
        }
      } catch (err) {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [submissionId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 h-36 bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
      </div>
    );
  }
  if (failed) {
    return (
      <div className="rounded-xl border border-slate-800 h-36 bg-slate-950 flex flex-col items-center justify-center text-[10px] text-slate-500 gap-1">
        <AlertTriangle className="h-4 w-4 text-rose-400" />
        <span>No receipt</span>
      </div>
    );
  }
  return (
    <div
      onClick={() => onOpen(objectUrl, isPdf)}
      className="rounded-xl overflow-hidden border border-slate-800 cursor-pointer relative group h-36 bg-slate-950 flex items-center justify-center"
    >
      {isPdf ? (
        <div className="flex flex-col items-center justify-center text-slate-300 gap-1">
          <FileText className="h-8 w-8 text-indigo-400" />
          <span className="text-[10px] font-bold">PDF Receipt</span>
        </div>
      ) : (
        <img src={objectUrl} alt="Receipt" className="object-cover w-full h-full" />
      )}
      <div className="absolute inset-0 bg-slate-950/45 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition">
        <ExternalLink className="h-4.5 w-4.5 mr-1" />
        <span>Daawo (View)</span>
      </div>
    </div>
  );
}

export default function PaymentReview() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filtering & Search
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals
  const [activeScreenshot, setActiveScreenshot] = useState(null);
  const [rejectionSubmissionId, setRejectionSubmissionId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [resolvingId, setResolvingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const showStatus = (type, text) => {
    setStatusMessage({ type, text });
  };

  useEffect(() => {
    if (!statusMessage) return undefined;
    const timer = setTimeout(() => setStatusMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const loadSubmissions = async () => {
    setLoading(true);
    setError("");
    try {
      let url = "/api/payments_system/admin/submissions";
      const params = [];
      if (filterStatus) params.push(`status=${filterStatus}`);
      if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
      if (params.length > 0) url += "?" + params.join("&");

      const res = await api.get(url);
      setSubmissions(res.data);
    } catch (err) {
      console.error(err);
      setError("Ka rarka xogta lacag bixinta wuu guuldareystay. (Failed to load payment submissions.)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [filterStatus, searchQuery]);

  const handleResolve = async (id, action, note = "", reason = "") => {
    setResolvingId(id);
    try {
      await api.post(`/api/payments_system/admin/submissions/${id}/resolve`, {
        action,
        admin_note: note || null,
        rejection_reason: reason || null
      });
      showStatus("success", `Lacag bixinta waa la ${action === "approve" ? "ansaxiyey" : action}.`);
      const nextStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : action;
      const nextTransactionStatus = action === "approve"
        ? "approved"
        : action === "reject" || action === "duplicate"
          ? "failed"
          : "pending";
      setSubmissions(prev =>
        prev.map(sub => sub.id === id ? {
          ...sub,
          status: nextStatus,
          transaction_status: nextTransactionStatus,
          admin_note: note,
          rejection_reason: reason
        } : sub)
      );
      // Close modal
      setRejectionSubmissionId(null);
      setRejectionReason("");
      setAdminNote("");
    } catch (err) {
      console.error(err);
      showStatus("error", "Go'aanka lacag bixinta wuu guuldareystay.");
    } finally {
      setResolvingId(null);
    }
  };

  const triggerExportCsv = async () => {
    try {
      await downloadAuthenticatedFile(
        "/api/payments_system/admin/submissions/export",
        `payment-submissions-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch (err) {
      console.error("CSV export failed:", err);
      showStatus("error", "Dhoofinta CSV wuu guuldareystay. (CSV export failed.)");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">Successful</span>;
      case "rejected":
      case "failed":
        return <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold">Rejected</span>;
      case "under_review":
        return <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold">Under Review</span>;
      case "duplicate":
        return <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[9px] font-bold">Duplicate</span>;
      case "pending":
      default:
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold">Pending</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-950/20 to-[#120826] border border-indigo-900/35 p-6 flex items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              Payment Verification
            </span>
          </div>
          <h2 className="text-xl font-black font-outfit text-white">Xaqiijinta Lacag Bixinta (Payment Review)</h2>
          <p className="text-xs text-slate-400 font-medium">
            Dib u eeg, ansaxi, ama diid lacagaha ay ardaydu u soo direen akoonada Mobile Money iyo bangiyada.
          </p>
        </div>
        <button
          onClick={triggerExportCsv}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-md"
        >
          <FileSpreadsheet className="h-4.5 w-4.5 text-indigo-400" />
          <span>Dhoofso CSV (Export)</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-[#130b24] p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ka raadi Trans ID, arday, payer phone, merchant phone, xirmooyinka..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-650 focus:outline-none"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-slate-350 focus:outline-none shrink-0"
        >
          <option value="">Dhammaan Xaaladaha (All Statuses)</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="duplicate">Duplicate</option>
        </select>
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

      {/* Submissions List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-12 text-center space-y-2">
          <Clock className="h-8 w-8 text-slate-600 mx-auto" />
          <h4 className="text-xs font-bold text-white">No Submissions Found</h4>
          <p className="text-[11px] text-slate-500">Lama helin lacag bixinno u baahan dib-u-eegis oo waafaqsan xogtaan.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className={`rounded-2xl border p-5 bg-[#130b24] transition flex flex-col lg:flex-row gap-6 ${
                sub.is_suspicious && sub.status === "pending"
                  ? "border-yellow-500/50 bg-yellow-500/[0.02]"
                  : "border-slate-800 hover:border-slate-750"
              }`}
            >
              {/* Receipt Thumbnail (loaded via access-controlled endpoint) */}
              <div className="w-full lg:w-48 shrink-0 flex flex-col justify-between">
                <ReceiptThumbnail
                  submissionId={sub.id}
                  onOpen={(url, isPdf) => setActiveScreenshot({ url, isPdf })}
                />
              </div>

              {/* Submission Information details */}
              <div className="flex-1 space-y-4">
                {/* Header info */}
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-850 pb-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-white">{sub.user_name}</h4>
                    <p className="text-[10px] text-slate-500">Student Phone: {sub.user_email}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-bold text-indigo-300 font-mono">
                      {sub.amount_paid} {sub.currency}
                    </span>
                    <span className="block text-[9px] text-slate-500 mt-0.5">Paid for: {sub.package_name}</span>
                  </div>
                </div>

                {/* Suspicious Warning alert */}
                {sub.is_suspicious && sub.status === "pending" && (
                  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 flex items-start gap-2 text-[10px] text-yellow-350">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold uppercase tracking-wider block">Suspicious Activity Detected</span>
                      <span>Qoraalka (Transaction ID) ama sawirka lacag bixinta mar kale ayaa laga helay keydka. Fadlan si taxadar leh u hubi. (Duplicate reference or screenshot reuse detected!)</span>
                    </div>
                  </div>
                )}

                {/* Submited Reference info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px]">
                  <div>
                    <span className="block text-slate-550 font-bold uppercase text-[9px]">Payment Method</span>
                    <span className="mt-1 block text-white font-bold uppercase">{sub.payment_method.replace("_", " ")}</span>
                  </div>
                  <div>
                    <span className="block text-slate-550 font-bold uppercase text-[9px]">Payer Phone</span>
                    <span className="mt-1 block text-white font-bold font-mono">{sub.payer_phone || sub.sender_phone}</span>
                  </div>
                  <div>
                    <span className="block text-slate-550 font-bold uppercase text-[9px]">Merchant Receiving Phone</span>
                    <span className="mt-1 block text-white font-bold font-mono">{sub.merchant_phone || sub.admin_receiving_account}</span>
                  </div>
                  <div>
                    <span className="block text-slate-550 font-bold uppercase text-[9px]">Transaction ID</span>
                    <span className="mt-1 block text-indigo-300 font-bold font-mono truncate" title={sub.transaction_id}>{sub.transaction_id}</span>
                  </div>
                  <div>
                    <span className="block text-slate-550 font-bold uppercase text-[9px]">Payment Account ID</span>
                    <span className="mt-1 block text-white font-bold font-mono">{sub.payment_account_id || "Manual"}</span>
                  </div>
                  <div>
                    <span className="block text-slate-550 font-bold uppercase text-[9px]">Package Slug</span>
                    <span className="mt-1 block text-white font-bold font-mono">{sub.package_id}</span>
                  </div>
                  <div>
                    <span className="block text-slate-550 font-bold uppercase text-[9px]">Transaction Status</span>
                    <span className="mt-1 block">{getStatusBadge(sub.transaction_status || sub.status)}</span>
                  </div>
                  <div>
                    <span className="block text-slate-550 font-bold uppercase text-[9px]">Student Record Phone</span>
                    <span className="mt-1 block text-white font-bold font-mono">{sub.user_email}</span>
                  </div>
                </div>

                {/* Moderator Notes / Reject Reason */}
                {(sub.admin_note || sub.rejection_reason) && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-850 text-[10px] space-y-1">
                    {sub.admin_note && (
                      <div>
                        <span className="font-bold text-slate-500">Admin Note:</span>{" "}
                        <span className="text-slate-350">{sub.admin_note}</span>
                      </div>
                    )}
                    {sub.rejection_reason && (
                      <div>
                        <span className="font-bold text-rose-400">Rejection Reason:</span>{" "}
                        <span className="text-rose-350">{sub.rejection_reason}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Timestamps */}
                <div className="flex items-center gap-4 text-[9px] text-slate-550 font-bold uppercase tracking-wider">
                  <span>Created: {new Date(sub.created_at).toLocaleString()}</span>
                  {sub.approved_at && (
                    <span>Approved: {new Date(sub.approved_at).toLocaleString()}</span>
                  )}
                </div>
              </div>

              {/* Actions Console */}
              <div className="w-full lg:w-44 shrink-0 flex flex-col justify-center gap-2 border-t lg:border-t-0 lg:border-l border-slate-850 pt-4 lg:pt-0 lg:pl-6">
                <div className="mb-2 text-center lg:text-left">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Status</span>
                  {getStatusBadge(sub.status)}
                </div>

                {sub.status === "pending" || sub.status === "under_review" ? (
                  <>
                    <input
                      type="text"
                      placeholder="Moderator note..."
                      onChange={(e) => setAdminNote(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-white placeholder-slate-600 focus:outline-none"
                    />

                    <button
                      onClick={() => handleResolve(sub.id, "approve", adminNote)}
                      disabled={resolvingId === sub.id}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Ansaxi (Approve)</span>
                    </button>

                    <button
                      onClick={() => { setRejectionSubmissionId(sub.id); setAdminNote(adminNote); }}
                      disabled={resolvingId === sub.id}
                      className="w-full py-2 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Diid (Reject)</span>
                    </button>

                    {sub.status !== "under_review" && (
                      <button
                        onClick={() => handleResolve(sub.id, "under_review", adminNote)}
                        disabled={resolvingId === sub.id}
                        className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs font-bold transition disabled:opacity-50"
                      >
                        <span>Under Review</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleResolve(sub.id, "duplicate", adminNote)}
                      disabled={resolvingId === sub.id}
                      className="w-full py-2 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-500/20 text-yellow-400 rounded-lg text-xs font-bold transition disabled:opacity-50"
                    >
                      <span>Mark Duplicate</span>
                    </button>
                  </>
                ) : (
                  <p className="text-[10px] text-slate-550 font-bold uppercase text-center lg:text-left">Resolved</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULLSCREEN SCREENSHOT PREVIEW MODAL */}
      {activeScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setActiveScreenshot(null)} />
          <div className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden border border-slate-800 bg-[#0c031a] shadow-2xl p-2 z-55 flex flex-col">
            <button
              onClick={() => setActiveScreenshot(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/80 text-white backdrop-blur-sm hover:bg-slate-800 hover:scale-105 transition z-10"
            >
              <X className="h-5 w-5" />
            </button>
            {activeScreenshot.isPdf ? (
              <iframe
                src={activeScreenshot.url}
                title="Receipt PDF"
                className="w-[80vw] h-[85vh] rounded-xl bg-white"
              />
            ) : (
              <img src={activeScreenshot.url} alt="Receipt Preview" className="object-contain max-w-full max-h-[85vh] rounded-xl" />
            )}
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectionSubmissionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setRejectionSubmissionId(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#130b24] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <h3 className="text-sm font-bold text-white">Sababta loo diidey lacag bixinta</h3>
              <button onClick={() => setRejectionSubmissionId(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleResolve(rejectionSubmissionId, "reject", adminNote, rejectionReason);
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Sababta loo diiday (Rejection Reason)</label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="tusaale: Sawirka lasoo geliyey ma cadda, ama lacagta nasoo gaadhay ma dhammaystirna..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-855 rounded-xl text-xs text-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectionSubmissionId(null)}
                  className="px-4 py-2 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  Kansal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Diid Lacag Bixinta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
