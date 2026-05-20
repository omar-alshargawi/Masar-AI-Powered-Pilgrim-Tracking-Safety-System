import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function useAuthGuard(expectedRole) {
  const navigate = useNavigate();
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("sp2_auth") || "null");
    if (!saved || saved.role !== expectedRole) {
      navigate("/", { replace: true });
    }
  }, []);
}

export function clearAuth() {
  localStorage.removeItem("sp2_auth");
}
