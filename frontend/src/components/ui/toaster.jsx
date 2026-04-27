"use client";

import { useToast } from "../../hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "../ui/toast";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

function inferIcon(title, desc) {
  const t = `${title || ''} ${desc || ''}`.toLowerCase();
  if (/error|fail|could not|invalid|reject/.test(t)) return AlertTriangle;
  if (/welcome|saved|sent|approved|uploaded|signed in|success/.test(t)) return CheckCircle2;
  return Info;
}

function inferColor(title, desc) {
  const t = `${title || ''} ${desc || ''}`.toLowerCase();
  if (/error|fail|could not|invalid|reject/.test(t)) return 'text-rose-500';
  if (/welcome|saved|sent|approved|uploaded|signed in|success/.test(t)) return 'text-emerald-500';
  return 'text-[hsl(var(--blue-700))]';
}

export function Toaster() {
  const { toasts } = useToast();
  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const Icon = inferIcon(title, description);
        const color = inferColor(title, description);
        return (
          <Toast
            key={id}
            {...props}
            className="group pointer-events-auto relative flex items-start gap-3 w-[360px] overflow-hidden rounded-2xl backdrop-blur-2xl bg-white/80 border border-white/45 shadow-[0_25px_60px_-25px_rgba(10,44,138,0.45)] p-4 transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full"
          >
            <span className={`shrink-0 mt-0.5 ${color}`}>
              <Icon className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              {title && <ToastTitle className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{title}</ToastTitle>}
              {description && (
                <ToastDescription className="text-[13px] text-[hsl(var(--blue-900))]/70 mt-0.5">
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose className="absolute top-2 right-2 rounded-md p-1 text-[hsl(var(--blue-900))]/45 hover:text-[hsl(var(--blue-900))] hover:bg-black/5 transition">
              <X className="w-3.5 h-3.5" />
            </ToastClose>
          </Toast>
        );
      })}
      <ToastViewport className="fixed bottom-4 right-4 z-[110] flex max-h-screen w-full flex-col gap-2 p-0 sm:bottom-4 sm:right-4 sm:top-auto sm:flex-col-reverse md:max-w-[420px]" />
    </ToastProvider>
  );
}
