import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Loader2, Lock, Phone, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!phoneNumber.trim() || !password) {
      setError("Enter admin phone and password.");
      return;
    }
    setSubmitting(true);
    const result = await adminLogin(phoneNumber.trim(), password);
    setSubmitting(false);
    if (!result.success) setError(result.error);
  };

  return (
    <div className="min-h-screen bg-[#0c031a] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-indigo-500/20 bg-[#130b24] p-7 shadow-2xl">
        <div className="mb-6 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-900/40">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-outfit text-2xl font-black">Admin Login</h1>
            <p className="mt-1 text-xs text-slate-400">Separate secure access for SomPrep AI administrators.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin Phone</span>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
                placeholder="+25261xxxxxxx"
                autoComplete="username"
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin Password</span>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
                placeholder="Admin password"
                autoComplete="current-password"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Login as Admin</span>
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
          <Link to="/admin/forgot-password" className="text-indigo-300 hover:text-indigo-200">Forgot admin password?</Link>
          <Link to="/login" className="hover:text-white">Student login</Link>
        </div>
      </div>
    </div>
  );
}
