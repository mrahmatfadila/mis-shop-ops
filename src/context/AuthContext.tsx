"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => Promise<void>;
  isAdmin: boolean;
  isMIS: boolean;
  isManager: boolean;
  isProcurement: boolean;
  isSPVPlazaBali: boolean;
  isSPVSam: boolean;
  isSPVPlazaBaliT3: boolean;
  isSPVPlazaBaliT2: boolean;
  isSPVSamT3: boolean;
  isSPVSamT2: boolean;
  canAccessHardware: boolean;
  canAccessFullIT: boolean;
  canAccessPurchases: boolean;
  userShopLocation: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PRESET_USERS: Record<UserRole, User> = {
  ADMIN: {
    username: "admin",
    name: "Administrator Sistem",
    role: "ADMIN",
    shop_location: "Semua Toko",
  },
  MIS: {
    username: "mis",
    name: "MIS OPS",
    role: "MIS",
    shop_location: "Semua Toko",
  },
  MANAGER: {
    username: "manager",
    name: "MIS MANAGER",
    role: "MANAGER",
    shop_location: "Semua Toko",
  },
  IT_PROCUREMENT: {
    username: "procurement",
    name: "MIS PROCUREMENT SUPPORT",
    role: "IT_PROCUREMENT",
    shop_location: "Semua Toko",
  },
  SPV_PLAZABALI_T3: {
    username: "spv_pb_t3",
    name: "SPV Plaza Bali (Terminal 3)",
    role: "SPV_PLAZABALI_T3",
    shop_location: "Plaza Bali (Terminal 3)",
  },
  SPV_PLAZABALI_T2: {
    username: "spv_pb_t2",
    name: "SPV Plaza Bali (Terminal 2)",
    role: "SPV_PLAZABALI_T2",
    shop_location: "Plaza Bali (Terminal 2)",
  },
  SPV_SAM_T3: {
    username: "spv_sam_t3",
    name: "SPV SAM (Terminal 3)",
    role: "SPV_SAM_T3",
    shop_location: "SAM (Terminal 3)",
  },
  SPV_SAM_T2: {
    username: "spv_sam_t2",
    name: "SPV SAM (Terminal 2)",
    role: "SPV_SAM_T2",
    shop_location: "SAM (Terminal 2)",
  },
  SPV_PLAZABALI: {
    username: "spv_plazabali",
    name: "SPV Plaza Bali (Terminal 3)",
    role: "SPV_PLAZABALI_T3",
    shop_location: "Plaza Bali (Terminal 3)",
  },
  SPV_SAM: {
    username: "spv_sam",
    name: "SPV SAM (Terminal 3)",
    role: "SPV_SAM_T3",
    shop_location: "SAM (Terminal 3)",
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Inisialisasi sinkron dari localStorage atau default ke MIS agar tidak ada jeda/flash loading
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedUser = localStorage.getItem("mis_shop_ops_user");
        if (savedUser) return JSON.parse(savedUser);
      } catch (e) {}
    }
    return PRESET_USERS.MIS;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Sinkronkan kembali dengan localStorage jika tersedia
    try {
      const savedUser = localStorage.getItem("mis_shop_ops_user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        localStorage.setItem("mis_shop_ops_user", JSON.stringify(PRESET_USERS.MIS));
        setUser(PRESET_USERS.MIS);
      }
    } catch (e) {
      setUser(PRESET_USERS.MIS);
    }
  }, []);

  const login = async (username: string, password = "123"): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem("mis_shop_ops_user", JSON.stringify(data.user));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Login error", err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("mis_shop_ops_user");
    window.location.href = "/";
  };

  const switchRole = async (role: UserRole) => {
    const targetUser = PRESET_USERS[role];
    if (targetUser) {
      setUser(targetUser);
      localStorage.setItem("mis_shop_ops_user", JSON.stringify(targetUser));
    }
  };

  const isAdmin = user?.role === "ADMIN";
  const isMIS = user?.role === "MIS";
  const isManager = user?.role === "MANAGER";
  const isProcurement = user?.role === "IT_PROCUREMENT";
  const isSPVPlazaBaliT3 = user?.role === "SPV_PLAZABALI_T3";
  const isSPVPlazaBaliT2 = user?.role === "SPV_PLAZABALI_T2";
  const isSPVSamT3 = user?.role === "SPV_SAM_T3";
  const isSPVSamT2 = user?.role === "SPV_SAM_T2";
  const isSPVPlazaBali = isSPVPlazaBaliT3 || isSPVPlazaBaliT2 || user?.role === "SPV_PLAZABALI";
  const isSPVSam = isSPVSamT3 || isSPVSamT2 || user?.role === "SPV_SAM";
  const canAccessHardware = isAdmin || isMIS || isManager || isProcurement;
  const canAccessFullIT = isAdmin || isMIS || isManager;
  const canAccessPurchases = isAdmin || isMIS || isManager || isProcurement;
  const userShopLocation = user?.shop_location || "Semua Toko";

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        switchRole,
        isAdmin,
        isMIS,
        isManager,
        isProcurement,
        isSPVPlazaBali,
        isSPVSam,
        isSPVPlazaBaliT3,
        isSPVPlazaBaliT2,
        isSPVSamT3,
        isSPVSamT2,
        canAccessHardware,
        canAccessFullIT,
        canAccessPurchases,
        userShopLocation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

