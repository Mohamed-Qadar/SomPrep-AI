import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingState from "./LoadingState";

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="" />;
  if (!user) {
    const redirectTarget = `${location.pathname}${location.search || ""}`;
    const loginPath = location.pathname.startsWith("/admin") ? "/loginasadmin" : "/login";
    return <Navigate to={`${loginPath}?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }

  return children;
}

export function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingState label="" />;
  if (user) return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/dashboard"} replace />;

  return children;
}

export function RoleRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="" />;
  if (!user) {
    const redirectTarget = `${location.pathname}${location.search || ""}`;
    const loginPath = location.pathname.startsWith("/admin") ? "/loginasadmin" : "/login";
    return <Navigate to={`${loginPath}?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }
  if (!allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}

export function TeacherRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingState label="" />;
  if (!user) {
    return <Navigate to="/login" state={{ message: "Teacher access only" }} replace />;
  }
  if (user.role !== "teacher") {
    return <Navigate to="/login" state={{ message: "Teacher access only" }} replace />;
  }

  return children;
}
