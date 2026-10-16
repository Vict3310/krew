"use client";

import * as React from "react";

export type ToastVariant = "success" | "error" | "info";

export type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

const ToastContext = React.createContext<{ push: (toast: Omit<ToastItem, "id">) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const push = React.useCallback((toast: Omit<ToastItem, "id">) => {
    const id = Date.now() + Math.random();
    const entry: ToastItem = { id, ...toast, variant: toast.variant ?? "success" };

    setToasts((current) => [...current, entry]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
        <div className="flex w-full max-w-lg flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={[
                "pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_18px_40px_rgba(11,16,32,0.12)]",
                toast.variant === "error" ? "border-red-200 bg-red-50 text-red-900" :
                toast.variant === "info" ? "border-[#E6E7EF] bg-white text-[#141B41]" :
                "border-[#CDEBD8] bg-[#ECFAF1] text-[#141B41]",
              ].join(" ")}
            >
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description ? <p className="mt-1 text-xs opacity-80">{toast.description}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);

  if (!context) {
    return {
      push: (...args: [Omit<ToastItem, "id">]) => {
        void args[0];
      },
    };
  }

  return context;
}
