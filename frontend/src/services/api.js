import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

// Create Axios client pointing to the backend API base url
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: Automatically attach access_token if saved locally
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Globally handle 401 and 402 status codes
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const { status } = error.response;
      
      if (status === 401) {
        // Clear authentication state from localStorage
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        // Broadcast auth-logout event to notify React contexts
        window.dispatchEvent(new Event("auth-logout"));

        const adminPath = window.location.pathname.startsWith("/admin") || window.location.pathname.startsWith("/loginasadmin");
        const loginPath = adminPath ? "/loginasadmin" : "/login";
        if (!window.location.pathname.endsWith(loginPath)) {
          window.location.href = loginPath;
        }
      } else if (status === 402 || status === 403) {
        // Broadcast custom event for the mobile-money payment lock screen overlay
        window.dispatchEvent(new CustomEvent("payment-required", {
          detail: {
            message: error.response.data?.detail || "Subscription required to access premium exams."
          }
        }));

        // Redirect to Paywall page for students
        let isStudent = false;
        try {
          const savedUser = localStorage.getItem("user");
          if (savedUser) {
            const user = JSON.parse(savedUser);
            isStudent = user.role === "student";
          }
        } catch (e) {
          console.error("Error checking user role in interceptor:", e);
        }

        if (!window.location.pathname.startsWith("/admin") && isStudent && !window.location.pathname.includes("/paywall")) {
          const currentPath = window.location.pathname + window.location.search;
          window.location.href = `/paywall?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
