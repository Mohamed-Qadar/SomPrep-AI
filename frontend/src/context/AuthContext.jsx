import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, paymentsApi } from "../services/endpoints";

const AuthContext = createContext(null);

const formatAuthError = (detail, fallback) => {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : null;
        return field && item?.msg ? `${field}: ${item.msg}` : item?.msg;
      })
      .filter(Boolean)
      .join(" ");
  }
  if (typeof detail === "object") {
    return detail.message || detail.msg || JSON.stringify(detail);
  }
  return String(detail);
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  // Load initial user state from localStorage to minimize loading flashes
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentLock, setPaymentLock] = useState(false);

  // Helper to check user subscription status
  const checkSubscription = useCallback(async () => {
    try {
      const response = await paymentsApi.status();
      const isActive = !!response.data?.is_active;
      setSubscriptionActive(isActive);
      
      // If subscription becomes active, release any active payment lock
      if (isActive) {
        setPaymentLock(false);
      }
      return isActive;
    } catch (error) {
      console.error("Error checking subscription status:", error);
      setSubscriptionActive(false);
      return false;
    }
  }, []);

  // Standardized logout action
  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("admin_session");
    setUser(null);
    setSubscriptionActive(false);
    setPaymentLock(false);

    const adminPath = window.location.pathname.startsWith("/admin") || window.location.pathname.startsWith("/loginasadmin");
    const loginPath = adminPath ? "/loginasadmin" : "/login";
    if (!window.location.pathname.endsWith(loginPath)) {
      window.location.href = loginPath;
    }
  }, []);

  // Synchronize user profile and subscription status on mount
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          // Verify token and fetch profile
          const profileResponse = await authApi.me();
          if (isMounted) {
            setUser(profileResponse.data);
            localStorage.setItem("user", JSON.stringify(profileResponse.data));
            
            // Check subscription status if user was resolved successfully
            await checkSubscription();
          }
        } catch (error) {
          // A 401/403 here is the normal "session expired / invalid token" path
          // — log out quietly. Only surface genuinely unexpected failures
          // (network down, 5xx) so real problems aren't buried in noise.
          const status = error?.response?.status;
          if (status !== 401 && status !== 403) {
            console.error("Unexpected error verifying session:", error);
          }
          if (isMounted) {
            logout();
          }
        }
      } else {
        if (isMounted) {
          setUser(null);
          setSubscriptionActive(false);
        }
      }
      
      if (isMounted) {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [checkSubscription, logout]);

  // Global event listeners (Axios 401 logouts and 402 payment required redirects)
  useEffect(() => {
    const handleGlobalLogout = () => {
      logout();
    };

    const handlePaymentRequired = (event) => {
      setPaymentLock(true);
      console.warn("Payment required triggered globally:", event?.detail?.message);
    };

    window.addEventListener("auth-logout", handleGlobalLogout);
    window.addEventListener("payment-required", handlePaymentRequired);

    return () => {
      window.removeEventListener("auth-logout", handleGlobalLogout);
      window.removeEventListener("payment-required", handlePaymentRequired);
    };
  }, [logout]);

  // Login action
  const login = useCallback(async (phone_number, password) => {
    try {
      const response = await authApi.login({
        phone_number,
        password,
      });
      const { access_token } = response.data;

      // Save token in storage
      localStorage.setItem("access_token", access_token);
      setPaymentLock(false);

      // Fetch user profile immediately
      const profileResponse = await authApi.me();
      const userObj = profileResponse.data;
      setUser(userObj);
      localStorage.setItem("user", JSON.stringify(userObj));

      const searchParams = new URLSearchParams(window.location.search);
      const redirectParam = searchParams.get("redirect");
      if (redirectParam) {
        try {
          const redirectUrl = new URL(redirectParam, window.location.origin);
          const packageParam = redirectUrl.searchParams.get("package");
          if (packageParam) {
            localStorage.setItem("selectedPackage", packageParam);
          }
        } catch (e) {
          console.error("Failed to preserve package redirect:", e);
        }
      }

      // Fetch and update subscription state
      await checkSubscription();

      // Redirect based on role
      if (userObj.role === "student") {
        const redirectUrl = redirectParam || "/dashboard";
        navigate(redirectUrl);
      } else if (userObj.role === "teacher") {
        navigate("/teacher");
      } else if (userObj.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }

      return { success: true };
    } catch (error) {
      console.error("Login request failed:", error);
      const message = formatAuthError(
        error.response?.data?.detail,
        "Giriisku waa guuldareystay. Fadlan isku day markale."
      );
      return { success: false, error: message };
    }
  }, [checkSubscription, navigate]);

  const adminLogin = useCallback(async (phone_number, password) => {
    try {
      const response = await authApi.adminLogin({ phone_number, password });
      const { access_token } = response.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("admin_session", "true");
      setPaymentLock(false);

      const profileResponse = await authApi.me();
      const userObj = profileResponse.data;
      setUser(userObj);
      localStorage.setItem("user", JSON.stringify(userObj));
      setSubscriptionActive(false);
      navigate("/admin/dashboard");
      return { success: true };
    } catch (error) {
      console.error("Admin login request failed:", error);
      const message = formatAuthError(
        error.response?.data?.detail,
        "Admin login failed. Please check your phone and password."
      );
      return { success: false, error: message };
    }
  }, [navigate]);

  // Registration action
  const register = useCallback(async (full_name, phone_number, password, selected_region = "Federal", grade_level = 12, package_type = "academic", education_level = "Secondary", learning_goal = "Daily Learning") => {
    try {
      await authApi.register({
        phone_number,
        full_name,
        password,
        role: "student",
        selected_region,
        grade_level,
        package_type,
        education_level,
        learning_goal,
        learner_type: "school_student",
      });

      // Automatically login on successful registration
      return await login(phone_number, password);
    } catch (error) {
      console.error("Registration request failed:", error);
      const message = formatAuthError(
        error.response?.data?.detail,
        "Diiwaangelintu waa guuldareystay. Fadlan isku day markale."
      );
      return { success: false, error: message };
    }
  }, [login]);

  // Helper to derive allowed grades from package type
  const allowedGrades = useMemo(() => {
    if (!user || !user.package_type) return [];
    const pkg = user.package_type;
    if (pkg === "academic") return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    if (pkg === "primary") return [1, 2, 3, 4];
    if (pkg === "middle") return [5, 6, 7, 8];
    if (pkg === "secondary") return [9, 10, 11, 12];
    return [];
  }, [user]);

  const memoizedUser = useMemo(() => {
    if (!user) return null;
    return { ...user, allowed_grades: allowedGrades };
  }, [user, allowedGrades]);

  // Helper to check if a specific grade level is allowed for the logged in student
  const isGradeAllowed = useCallback((grade) => {
    if (!user) return false;
    if (user.role === "admin" || user.role === "teacher") return true;
    const active = user.package_active || subscriptionActive;
    if (!user.package_type || !active) return false;
    
    return allowedGrades.includes(grade);
  }, [user, subscriptionActive, allowedGrades]);

  // Value memoization to protect against unnecessary re-renders in consumers
  const value = useMemo(() => ({
    user: memoizedUser,
    subscriptionActive,
    loading,
    paymentLock,
    setPaymentLock,
    login,
    adminLogin,
    register,
    logout,
    checkSubscription,
    isGradeAllowed,
  }), [
    memoizedUser,
    subscriptionActive,
    loading,
    paymentLock,
    login,
    adminLogin,
    register,
    logout,
    checkSubscription,
    isGradeAllowed,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      subscriptionActive: false,
      loading: true,
      paymentLock: false,
      setPaymentLock: () => {},
      login: async () => ({ success: false, error: "Authentication is still loading." }),
      adminLogin: async () => ({ success: false, error: "Authentication is still loading." }),
      register: async () => ({ success: false, error: "Authentication is still loading." }),
      logout: () => {},
      checkSubscription: async () => false,
      isGradeAllowed: () => false,
    };
  }
  return context;
};

export default AuthContext;
