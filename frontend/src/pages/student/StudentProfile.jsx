import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../services/endpoints";
import api from "../../services/api";
import { packagesData } from "../../data/packagesData";
import { PACKAGE_LABELS } from "../../utils/packageLabels";
import {
  User,
  Phone,
  Settings,
  CreditCard,
  Zap,
  Flame,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ShieldAlert
} from "lucide-react";

export default function StudentProfile() {
  const { user } = useAuth();
  const packageLabels = PACKAGE_LABELS;

  const [selectedRegion, setSelectedRegion] = useState(user?.selected_region || "Federal");
  const [gradeLevel, setGradeLevel] = useState(user?.grade_level || 12);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [packageDetails, setPackageDetails] = useState(null);
  const [loadingPkg, setLoadingPkg] = useState(true);
  
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const currentPackagePrice = packagesData[packageDetails?.package_type || user?.package_type || "academic"]?.annualPrice || "$2.50";

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get("/api/payments_system/my-history");
        setHistory(res.data);
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    const fetchPackageDetails = async () => {
      try {
        const response = await authApi.myPackage();
        setPackageDetails(response.data);
      } catch (err) {
        console.error("Failed to load my-package status:", err);
      } finally {
        setLoadingPkg(false);
      }
    };
    fetchPackageDetails();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: "", type: "" });
    try {
      await authApi.updateProfile({
        selected_region: selectedRegion,
        grade_level: parseInt(gradeLevel)
      });
      setMsg({ text: "Profile-kaaga si guul leh ayaa loo cusbooneysiiyey! (Profile updated successfully!)", type: "success" });
      // Reload details inside localStorage & window to sync Context
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setMsg({ text: "Qalad ayaa dhacay intii lagu guda jiray cusbooneysiinta. (Failed to update profile.)", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile summary banner */}
      <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-6 flex flex-col sm:flex-row items-center gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -z-10" />
        
        <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/35 flex items-center justify-center text-indigo-400 text-3xl font-black uppercase">
          {user?.full_name?.charAt(0) || "S"}
        </div>
        
        <div className="flex-1 text-center sm:text-left space-y-1">
          <h3 className="text-xl font-bold text-white leading-none">{user?.full_name}</h3>
          <p className="text-xs text-slate-500 font-semibold flex items-center justify-center sm:justify-start gap-1">
            <Phone className="h-3 w-3" />
            <span>{user?.phone_number}</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium">Class Level {user?.grade_level || 12} Student</p>
        </div>

        <div className="flex items-center gap-3">
          {user?.current_streak > 0 && (
            <div className="flex flex-col items-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-amber-400 text-center min-w-[70px]">
              <Flame className="h-5 w-5" />
              <span className="text-sm font-extrabold mt-1 leading-none">{user.current_streak}</span>
              <span className="text-[8px] text-slate-500 uppercase font-bold mt-1">Streak</span>
            </div>
          )}
          <div className="flex flex-col items-center p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 text-indigo-400 text-center min-w-[70px]">
            <Zap className="h-5 w-5" />
            <span className="text-sm font-extrabold mt-1 leading-none">{user?.total_xp_points ?? 0}</span>
            <span className="text-[8px] text-slate-500 uppercase font-bold mt-1">XP Points</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Settings Form Card */}
        <div className="rounded-xl border border-slate-800 bg-[#130b24] p-5 shadow-lg md:col-span-2 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
            <Settings className="h-4.5 w-4.5 text-indigo-400" />
            <h4 className="font-outfit text-sm font-bold text-white">Ku Deji Macluumaadka Waxbarasho (Settings)</h4>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Gobolka · Exam Board
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="block w-full rounded-xl border border-slate-800 bg-slate-950 py-3.5 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition"
              >
                <option value="Federal">Federal (MoECHE Mogadishu)</option>
                <option value="Puntland">Puntland (PSCE Autonomous)</option>
                <option value="Somaliland">Somaliland Standardized</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Fasalka · Grade Level
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(parseInt(e.target.value))}
                className="block w-full rounded-xl border border-slate-800 bg-slate-950 py-3.5 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition"
              >
                {((user?.role !== "student") || !user?.package_type || user?.package_type === "academic" || user?.package_type === "primary") && (
                  <optgroup label="Dugsiga Hoose (Primary)">
                    <option value="1">Grade 1</option>
                    <option value="2">Grade 2</option>
                    <option value="3">Grade 3</option>
                    <option value="4">Grade 4</option>
                  </optgroup>
                )}
                {((user?.role !== "student") || !user?.package_type || user?.package_type === "academic" || user?.package_type === "middle") && (
                  <optgroup label="Dugsiga Dhexe (Middle)">
                    <option value="5">Grade 5</option>
                    <option value="6">Grade 6</option>
                    <option value="7">Grade 7</option>
                    <option value="8">Grade 8</option>
                  </optgroup>
                )}
                {((user?.role !== "student") || !user?.package_type || user?.package_type === "academic" || user?.package_type === "secondary") && (
                  <optgroup label="Dugsiga Sare (Secondary)">
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </optgroup>
                )}
              </select>
            </div>

            {msg.text && (
              <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                msg.type === "success"
                  ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-400"
                  : "bg-red-500/5 border-red-500/25 text-red-400"
              }`}>
                {msg.type === "success" ? <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" /> : <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />}
                <span>{msg.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 text-xs font-bold text-white transition active:scale-[0.98] shadow-md shadow-indigo-600/20"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Diiwaangelinayaa...</span>
                </>
              ) : (
                <span>Save Profile Settings</span>
              )}
            </button>
          </form>
        </div>

        {/* Payment status Card */}
        <div className="rounded-xl border border-slate-800 bg-[#130b24] p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
              <CreditCard className="h-4.5 w-4.5 text-indigo-400" />
              <h4 className="font-outfit text-sm font-bold text-white">Xaaladda Biilka (Payment Status)</h4>
            </div>

            <div className="space-y-4 mt-4">
              {loadingPkg ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-2">
                  <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                  <span className="text-[10px] text-slate-500">Checking status...</span>
                </div>
              ) : packageDetails ? (
                <div className="space-y-4">
                  <div className="rounded-xl p-4 bg-slate-950/30 border border-slate-850 text-center relative overflow-hidden">
                    {packageDetails.package_active ? (
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-0.5 rounded-full uppercase tracking-wider inline-block">
                          Active Plan
                        </span>
                        <h5 className="text-xs text-white font-bold mt-1">
                          {packageLabels[packageDetails.package_type] || "No Active Package"}
                        </h5>
                        <p className="text-[9px] text-slate-400">
                          Valid until: {packageDetails.package_expires_at ? new Date(packageDetails.package_expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-0.5 rounded-full uppercase tracking-wider inline-block">
                          Expired / Inactive
                        </span>
                        <h5 className="text-xs text-slate-300 font-bold mt-1">
                          {packageLabels[packageDetails.package_type] || "No Active Package"}
                        </h5>
                        <p className="text-[9px] text-red-400 font-semibold flex items-center justify-center gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          <span>Biilkaagu waa dhacay (Access Expired)</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Expiry Progress Bar */}
                  {packageDetails.package_active && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
                        <span>Time Remaining:</span>
                        <span className="text-indigo-400">{packageDetails.days_remaining} Days</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, (packageDetails.days_remaining / 365) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between text-slate-500 border-b border-slate-900 pb-1.5">
                      <span>Total Fee:</span>
                      <span className="font-bold text-white">{packageDetails.package_active ? `${currentPackagePrice} USD` : "$0.00 USD"}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Method:</span>
                      <span className="font-bold text-white">Mobile Money</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-500">No package data found</p>
                </div>
              )}
            </div>
          </div>

          {!loadingPkg && packageDetails && (
            <div className="pt-4 border-t border-slate-850/60 mt-auto">
              {packageDetails.package_active ? (
                <Link
                  to="/packages"
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 hover:bg-slate-900 py-2.5 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition"
                >
                  <span>Cusbooneysii ama Beddel Xirmada</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <div className="space-y-2">
                  <Link
                    to={`/paywall?package=${packageDetails.package_type || "academic"}&redirect=${encodeURIComponent("/dashboard/profile")}`}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-2.5 text-[11px] font-bold text-white transition shadow-lg shadow-indigo-600/10"
                  >
                    <span>Cusbooneysii ({currentPackagePrice} USD)</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    to="/packages"
                    className="block text-center text-[10px] text-slate-500 hover:text-slate-400 font-semibold"
                  >
                    Dooro xirmo kale (Choose another package)
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment History Panel */}
      <div className="rounded-xl border border-slate-800 bg-[#130b24] p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
          <CreditCard className="h-4.5 w-4.5 text-indigo-400" />
          <h4 className="font-outfit text-sm font-bold text-white">Taariikhda Lacag Bixinta (Payment History)</h4>
        </div>

        {loadingHistory ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">Ma jiraan lacag bixino hore oo la diiwaangeliyey.</p>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-slate-950/40 border border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap font-bold">
                    <span className="text-white uppercase">{item.payment_method.replace("_", " ")}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-indigo-400">{item.package_name}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-200">{item.amount_paid} {item.currency}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Trans ID: <span className="text-slate-350">{item.transaction_id}</span> • Date: {new Date(item.created_at).toLocaleDateString()}
                  </div>
                  {item.rejection_reason && (
                    <div className="text-[10px] text-rose-450 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10 mt-1">
                      <span className="font-bold">Diidmo Sababteeda (Rejection Reason):</span> {item.rejection_reason}
                    </div>
                  )}
                  {item.admin_note && (
                    <div className="text-[10px] text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-850 mt-1">
                      <span className="font-bold">Mod Note:</span> {item.admin_note}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                  {item.status === "pending" && (
                    <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">Pending</span>
                  )}
                  {item.status === "under_review" && (
                    <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold">Under Review</span>
                  )}
                  {item.status === "approved" && (
                    <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">Approved</span>
                  )}
                  {item.status === "rejected" && (
                    <div className="flex flex-col gap-1 items-end">
                      <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">Rejected</span>
                      <Link
                        to={`/checkout/${item.package_id}`}
                        className="text-[9px] text-indigo-400 hover:underline font-bold"
                      >
                        Resubmit Proof
                      </Link>
                    </div>
                  )}
                  {item.status === "duplicate" && (
                    <span className="px-2.5 py-1 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-bold">Duplicate</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
