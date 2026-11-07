import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { authApi } from "../services/endpoints";

const friendlyError = (err, fallback) => {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg || String(d)).join(" ");
  return detail.message || detail.msg || fallback;
};

export default function AdminForgotPassword() {
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [resetId, setResetId] = useState(null);
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.adminPasswordResetRequest({ phone_number: phoneNumber.trim(), channel: "sms" });
      setResetId(res.data.reset_id);
      setMessage(`${res.data.message} Destination: ${res.data.destination}${res.data.debug_otp ? ` | DEV OTP: ${res.data.debug_otp}` : ""}`);
      setStep(2);
    } catch (err) {
      setError(friendlyError(err, "Could not send OTP."));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.adminPasswordResetVerify({ reset_id: resetId, otp: otp.trim() });
      setResetToken(res.data.reset_token);
      setMessage(res.data.message);
      setStep(3);
    } catch (err) {
      setError(friendlyError(err, "Invalid OTP."));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.adminPasswordResetConfirm({ reset_id: resetId, reset_token: resetToken, new_password: newPassword });
      setMessage(res.data.message);
      setStep(4);
    } catch (err) {
      setError(friendlyError(err, "Could not reset password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c031a] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-indigo-500/20 bg-[#130b24] p-7 shadow-2xl">
        <div className="mb-6 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-900/40">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="font-outfit text-2xl font-black">Reset Admin Password</h1>
          <p className="text-xs text-slate-400">OTP verification for administrator accounts only.</p>
        </div>

        {error && <div className="mb-4 flex gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-300"><AlertCircle className="h-4 w-4" />{error}</div>}
        {message && <div className="mb-4 flex gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-300"><CheckCircle2 className="h-4 w-4" />{message}</div>}

        {step === 1 && (
          <form onSubmit={requestOtp} className="space-y-4">
            <input className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-500" placeholder="Admin phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
            <button disabled={loading} className="flex w-full justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold disabled:opacity-60">{loading && <Loader2 className="h-4 w-4 animate-spin" />} Send OTP</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <input className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-500" placeholder="6-digit OTP" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
            <button disabled={loading || otp.length !== 6} className="flex w-full justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold disabled:opacity-60">{loading && <Loader2 className="h-4 w-4 animate-spin" />} Verify OTP</button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={resetPassword} className="space-y-4">
            <input type="password" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-500" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <input type="password" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-500" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <p className="text-[11px] text-slate-500">Use at least 8 characters with uppercase, lowercase, and a number.</p>
            <button disabled={loading} className="flex w-full justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold disabled:opacity-60">{loading && <Loader2 className="h-4 w-4 animate-spin" />} Reset Password</button>
          </form>
        )}

        {step === 4 && <Link to="/loginasadmin" className="block rounded-xl bg-indigo-600 py-3 text-center text-sm font-bold hover:bg-indigo-700">Back to Admin Login</Link>}

        <div className="mt-5 text-center text-xs text-slate-400">
          <Link to="/loginasadmin" className="text-indigo-300 hover:text-indigo-200">Back to admin login</Link>
        </div>
      </div>
    </div>
  );
}
