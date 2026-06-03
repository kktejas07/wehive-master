import { Loader2, Lock, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';

export default function PremiumGate({ open, onClose, feature }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-[hsl(var(--accent))]/10 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-8 h-8 text-[hsl(var(--accent))]" />
        </div>
        <h3 className="font-display font-extrabold text-[24px] text-[hsl(var(--blue-900))]">
          Premium feature
        </h3>
        <p className="mt-3 text-[14.5px] text-[hsl(var(--blue-900))]/60">
          {feature || 'This AI tool'} is available exclusively for premium members. Upgrade to unlock all AI tools, priority support, and more.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button
            onClick={() => { onClose?.(); window.location.href = '/pricing'; }}
            className="w-full rounded-full h-12 font-bold btn-accent text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Upgrade to Premium
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full rounded-full h-11 font-bold border-black/10"
          >
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}