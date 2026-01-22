import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2, Gift, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferralSectionProps {
  userId: string;
}

export function ReferralSection({ userId }: ReferralSectionProps) {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<{ referred_id: string; tasks_completed: number; bonus_paid: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const referralLink = referralCode ? `liftome.it/ref/${referralCode}` : '';

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        // Fetch user's referral code from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('referral_code')
          .eq('user_id', userId)
          .single();

        if (profile?.referral_code) {
          setReferralCode(profile.referral_code);
        }

        // Fetch referrals
        const { data: referralData } = await supabase
          .from('referrals')
          .select('referred_id, tasks_completed, bonus_paid')
          .eq('referrer_id', userId);

        setReferrals(referralData || []);
      } catch (err) {
        console.error('Error fetching referral data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchReferralData();
    }
  }, [userId]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: "Link copiato! 📋",
        description: "Condividilo con i tuoi amici",
      });
    } catch {
      toast({
        title: "Errore",
        description: "Impossibile copiare il link",
        variant: "destructive",
      });
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Unisciti a Liftome!',
          text: 'Usa il mio link e guadagna 10€ dopo 3 task completati! 🎁',
          url: `https://${referralLink}`,
        });
      } catch {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const totalBonus = referrals.filter(r => r.bonus_paid).length * 10;
  const pendingReferrals = referrals.filter(r => !r.bonus_paid && r.tasks_completed < 3);
  const completedReferrals = referrals.filter(r => r.bonus_paid);

  if (isLoading) {
    return (
      <div className="p-4 bg-card rounded-2xl shadow-soft animate-pulse">
        <div className="h-20 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Referral Link Box */}
      <div className="bg-gradient-to-br from-primary/20 to-orange-500/20 rounded-2xl p-5 border border-primary/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Gift className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Invita amici 🎁</h3>
            <p className="text-sm text-muted-foreground">Guadagna 10€ per ogni amico</p>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-card/80 backdrop-blur-sm rounded-xl p-3 mb-4">
          <p className="text-xs text-muted-foreground mb-1">Il tuo link:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono text-primary truncate">
              {referralLink || 'Caricamento...'}
            </code>
            <button
              onClick={copyToClipboard}
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <Copy className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>

        {/* Share Button */}
        <Button
          variant="cta"
          className="w-full rounded-xl h-12 text-base font-semibold"
          onClick={shareLink}
        >
          <Share2 className="w-5 h-5 mr-2" />
          Invita amici – Guadagna 10€ ciascuno dopo 3 task
        </Button>

        <p className="text-xs text-center text-muted-foreground mt-3">
          Ricevi 10€ quando il tuo amico completa 3 task come Lifter
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-3 text-center shadow-soft">
          <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-xl font-bold text-foreground">{referrals.length}</p>
          <p className="text-xs text-muted-foreground">Invitati</p>
        </div>
        <div className="bg-card rounded-xl p-3 text-center shadow-soft">
          <span className="text-xl block mb-1">⏳</span>
          <p className="text-xl font-bold text-foreground">{pendingReferrals.length}</p>
          <p className="text-xs text-muted-foreground">In corso</p>
        </div>
        <div className="bg-card rounded-xl p-3 text-center shadow-soft">
          <span className="text-xl block mb-1">💰</span>
          <p className="text-xl font-bold text-green-500">{totalBonus}€</p>
          <p className="text-xs text-muted-foreground">Guadagnati</p>
        </div>
      </div>

      {/* Referrals List */}
      {referrals.length > 0 && (
        <div className="bg-card rounded-2xl p-4 shadow-soft">
          <h4 className="font-semibold text-foreground mb-3">I tuoi invitati</h4>
          <div className="space-y-2">
            {referrals.map((referral, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl",
                  referral.bonus_paid ? "bg-green-50 dark:bg-green-950/30" : "bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm",
                    referral.bonus_paid ? "bg-green-500 text-white" : "bg-muted"
                  )}>
                    {referral.bonus_paid ? "✓" : referral.tasks_completed}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Amico #{index + 1}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {referral.tasks_completed}/3 task completati
                    </p>
                  </div>
                </div>
                {referral.bonus_paid ? (
                  <span className="text-green-500 font-bold text-sm">+10€ ✅</span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {3 - referral.tasks_completed} task mancanti
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}