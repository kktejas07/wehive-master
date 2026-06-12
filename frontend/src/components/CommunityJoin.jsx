import { useState } from 'react';
import { MessageCircle, Send, Users, ExternalLink, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const COMMUNITY_LINKS = {
  whatsapp: {
    name: 'WhatsApp Community',
    icon: MessageCircle,
    color: 'bg-green-500 hover:bg-green-600',
    bgColor: 'bg-green-50 border-green-200',
  },
  telegram: {
    name: 'Telegram Group',
    icon: Send,
    color: 'bg-blue-500 hover:bg-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  discord: {
    name: 'Discord Server',
    icon: Users,
    color: 'bg-indigo-500 hover:bg-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200',
  },
};

export function CommunityJoin({ compact = false }) {
  const { isAuthed, token } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(null);
  const [linked, setLinked] = useState(null);
  const [telegramUsername, setTelegramUsername] = useState('');

  const handleJoin = async (channel) => {
    if (!isAuthed) {
      toast({ title: 'Sign in first', description: 'Please sign in to join the community.' });
      return;
    }
    setLoading(channel);
    try {
      const res = await fetch(`${API}/communication/community/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Invite sent', description: `Check your ${channel} for the community invite!` });
      } else {
        toast({ title: 'Failed', description: data.detail || 'Could not send invite' });
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Something went wrong' });
    } finally {
      setLoading(null);
    }
  };

  const handleLinkTelegram = async (e) => {
    e.preventDefault();
    if (!telegramUsername.trim()) return;
    setLoading('telegram_link');
    try {
      const res = await fetch(`${API}/communication/telegram/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ telegram_username: telegramUsername }),
      });
      const data = await res.json();
      if (res.ok) {
        setLinked(true);
        toast({ title: 'Telegram linked', description: `Connected to @${telegramUsername}` });
      } else {
        toast({ title: 'Failed', description: data.detail || 'Could not link Telegram' });
      }
    } catch (_e) {
      toast({ title: 'Error', description: 'Something went wrong' });
    } finally {
      setLoading(null);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {Object.entries(COMMUNITY_LINKS).map(([key, { name, icon: Icon, color }]) => (
          <Button
            key={key}
            size="sm"
            variant="ghost"
            onClick={() => handleJoin(key)}
            disabled={loading === key}
            className="gap-1.5 text-xs"
          >
            {loading === key ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Icon className="w-3.5 h-3.5" />
            )}
            {name}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="font-display font-extrabold text-[22px] text-[hsl(var(--blue-900))]">
          Join Our Community
        </h3>
        <p className="mt-1 text-[14px] text-[hsl(var(--blue-900))]/60">
          Get updates, connect with travelers, and share experiences
        </p>
      </div>

      <div className="space-y-3">
        {Object.entries(COMMUNITY_LINKS).map(([key, { name, icon: Icon, color, bgColor }]) => (
          <motion.div
            key={key}
            whileHover={{ scale: 1.02 }}
            className={`flex items-center justify-between p-4 rounded-xl border ${bgColor}`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${color} text-white`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="font-bold text-[15px] text-[hsl(var(--blue-900))]">{name}</span>
            </div>
            <Button
              size="sm"
              onClick={() => handleJoin(key)}
              disabled={loading === key}
              className={`${color} text-white`}
            >
              {loading === key ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Join <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </Button>
          </motion.div>
        ))}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-black/10" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-[12px] font-bold text-[hsl(var(--blue-900))]/50 uppercase tracking-wider">
            Or link your Telegram
          </span>
        </div>
      </div>

      <form onSubmit={handleLinkTelegram} className="flex gap-2">
        <input
          value={telegramUsername}
          onChange={(e) => setTelegramUsername(e.target.value)}
          placeholder="@yourusername"
          className="flex-1 h-11 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px]"
        />
        <Button
          type="submit"
          disabled={loading === 'telegram_link' || !telegramUsername.trim()}
          variant="outline"
          className="h-11 px-4 rounded-xl border-2 border-black/10 font-bold"
        >
          {loading === 'telegram_link' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Link'
          )}
        </Button>
      </form>
    </div>
  );
}