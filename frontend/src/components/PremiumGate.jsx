import { Loader2, Lock, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { useDialogA11y } from '../hooks/use-dialog-a11y';

export default function PremiumGate({ open, onClose, feature }) {
  const navigate = useNavigate();
  const dialogProps = useDialogA11y(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/50 backdrop-blur-sm">
      <div {...dialogProps} className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-[hsl(var(--blue-700))]/10 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-8 h-8 text-[hsl(var(--blue-700))]" />
        </div>
        <h3 className="font-display font-bold text-[24px] text-[hsl(var(--blue-900))]">
          Premium feature
        </h3>
        <p className="mt-3 text-[14.5px] text-muted-foreground">
          {feature || 'This AI tool'} is available exclusively for premium members. Upgrade to unlock all AI tools, priority support, and more.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button
            onClick={() => { onClose?.(); navigate('/pricing'); }}
            className="w-full rounded-xl h-12 font-semibold btn-accent text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Upgrade to Premium
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full rounded-xl h-11 font-semibold border-slate-300"
          >
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}