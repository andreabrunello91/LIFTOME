import { useState, useEffect, useCallback, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, MapPin, Moon, Sun, CreditCard, Plus, Wallet, Clock, PiggyBank, Camera, Image, Trash2, Loader2, User } from "lucide-react";
import { uploadProfilePhoto } from "@/services/cloudinaryService";
import { ReferralSection } from "@/components/ReferralSection";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// Available skills with emojis
const allSkills = [
  { id: "spesa", label: "Spesa pesante", emoji: "🛒" },
  { id: "cane", label: "Passeggiata cane", emoji: "🐕" },
  { id: "fila", label: "Fila ASL", emoji: "📋" },
  { id: "montaggio", label: "Montaggio mobili", emoji: "🔧" },
  { id: "babysitting", label: "Babysitting", emoji: "👶" },
  { id: "pulizie", label: "Pulizie", emoji: "🧹" },
  { id: "traslochi", label: "Traslochi", emoji: "📦" },
  { id: "riparazioni", label: "Riparazioni", emoji: "🔨" },
  { id: "giardinaggio", label: "Giardinaggio", emoji: "🌱" },
  { id: "tech", label: "Assistenza tech", emoji: "💻" },
  { id: "accompagnamento", label: "Accompagnamento", emoji: "🚗" },
  { id: "altro", label: "Altro", emoji: "✨" },
];

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
}

type Screen = "main" | "settings" | "editProfile" | "changePassword" | "privacy" | "appInfo" | "appearance" | "history" | "legal" | "info" | "wallet";

interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

interface CompletedClientTask {
  id: string;
  category: string;
  price: number;
}

// Category-based savings calculations for clients
const CATEGORY_TIME_SAVED: Record<string, number> = {
  spesa: 45,
  montaggio: 120,
  riparazioni: 180,
  traslochi: 120,
  pulizie: 60,
  giardinaggio: 60,
  tech: 45,
  fila: 120,
  cane: 30,
  babysitting: 120,
  dogsitting: 30,
  accompagnamento: 60,
  testimone: 240,
  altro: 60,
};

const CATEGORY_MONEY_SAVED: Record<string, number> = {
  spesa: 10,
  montaggio: 45,
  riparazioni: 70,
  traslochi: 50,
  pulizie: 25,
  giardinaggio: 20,
  tech: 30,
  fila: 20,
  cane: 3,
  babysitting: 20,
  dogsitting: 5,
  accompagnamento: 15,
  testimone: 70,
  altro: 15,
};

export const ProfiloTab = forwardRef<HTMLDivElement>(function ProfiloTab(_props, ref) {
  const [currentScreen, setCurrentScreen] = useState<Screen>("main");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [bio, setBio] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [availableImmediate, setAvailableImmediate] = useState(true);
  const [showKycPopup, setShowKycPopup] = useState(false);
  const [showSavingsDetail, setShowSavingsDetail] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const { toast } = useToast();

  // Real wallet data from Supabase
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [totalTaskEarnings, setTotalTaskEarnings] = useState(0);
  const [totalTips, setTotalTips] = useState(0);
  const [totalBonuses, setTotalBonuses] = useState(0);

  // Profile data
  const [profileRating, setProfileRating] = useState(0);
  const [profileReviewCount, setProfileReviewCount] = useState(0);
  
  // Client savings data
  const [completedClientTasks, setCompletedClientTasks] = useState<CompletedClientTask[]>([]);
  const [timeSavedMinutes, setTimeSavedMinutes] = useState(0);
  const [moneySaved, setMoneySaved] = useState(0);
  const [moneySpent, setMoneySpent] = useState(0);
  const [kycVerified, setKycVerified] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Fetch real user and wallet data from Supabase
  const fetchUserData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user?.user_metadata?.avatar_url) {
      setAvatarUrl(user.user_metadata.avatar_url);
    }

    if (user) {
      // Fetch profile with all fields
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance, avatar_url, bio, skills, rating, total_reviews, is_kyc_verified, is_available')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setWalletBalance(Number(profile.wallet_balance) || 0);
        if (profile.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }
        if (profile.bio) {
          setBio(profile.bio);
        }
        if (profile.skills) {
          setSelectedSkills(profile.skills);
        }
        setProfileRating(Number(profile.rating) || 0);
        setProfileReviewCount(profile.total_reviews || 0);
        setKycVerified(profile.is_kyc_verified || false);
        setAvailableImmediate(profile.is_available ?? true);
      }

      // Fetch wallet transactions
      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (txData) {
        setTransactions(txData);
        // Calculate totals
        const taskEarnings = txData.filter(t => t.type === 'task_earning').reduce((sum, t) => sum + Number(t.amount), 0);
        const tips = txData.filter(t => t.type === 'tip').reduce((sum, t) => sum + Number(t.amount), 0);
        const bonuses = txData.filter(t => t.type === 'referral_bonus').reduce((sum, t) => sum + Number(t.amount), 0);
        setTotalTaskEarnings(taskEarnings);
        setTotalTips(tips);
        setTotalBonuses(bonuses);
      }

      // Fetch reviews received (as reviewee)
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('id, reviewer_id, rating, comment, created_at')
        .eq('reviewee_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (reviewsData && reviewsData.length > 0) {
        // Get reviewer profiles
        const reviewerIds = reviewsData.map(r => r.reviewer_id);
        const { data: profiles } = await supabase.rpc('get_public_profiles', { profile_user_ids: reviewerIds });
        
        const reviewsWithNames = reviewsData.map(review => {
          const reviewerProfile = profiles?.find((p: { user_id: string }) => p.user_id === review.reviewer_id);
          return {
            ...review,
            reviewer_name: reviewerProfile?.full_name || 'Utente',
            reviewer_avatar: reviewerProfile?.avatar_url || null,
          };
        });
        setReviews(reviewsWithNames);
      }

      // Fetch completed tasks where user is the client (for savings calculation)
      const { data: clientTasksData } = await supabase
        .from('tasks')
        .select('id, category, price')
        .eq('client_id', user.id)
        .eq('status', 'completato');

      if (clientTasksData && clientTasksData.length > 0) {
        setCompletedClientTasks(clientTasksData);
        
        // Calculate time and money saved
        let totalTimeSaved = 0;
        let totalMoneySaved = 0;
        let totalMoneySpent = 0;
        
        clientTasksData.forEach(task => {
          const category = task.category?.toLowerCase() || 'altro';
          totalTimeSaved += CATEGORY_TIME_SAVED[category] || CATEGORY_TIME_SAVED['altro'];
          totalMoneySaved += CATEGORY_MONEY_SAVED[category] || CATEGORY_MONEY_SAVED['altro'];
          totalMoneySpent += Number(task.price) || 0;
        });
        
        setTimeSavedMinutes(totalTimeSaved);
        setMoneySaved(totalMoneySaved);
        setMoneySpent(totalMoneySpent);
      } else {
        setCompletedClientTasks([]);
        setTimeSavedMinutes(0);
        setMoneySaved(0);
        setMoneySpent(0);
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchUserData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.user_metadata?.avatar_url) {
        setAvatarUrl(session.user.user_metadata.avatar_url);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  // Realtime refresh for wallet balance + transactions + tasks
  useEffect(() => {
    if (!user?.id) return;

    const txChannel = supabase
      .channel(`wallet_transactions_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallet_transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchUserData()
      )
      .subscribe();

    const profileChannel = supabase
      .channel(`profiles_wallet_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchUserData()
      )
      .subscribe();

    // Listen for task completions to update savings in real-time
    const tasksChannel = supabase
      .channel(`tasks_savings_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
        },
        () => fetchUserData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(txChannel);
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [user?.id, fetchUserData]);


  // Real user data from Supabase auth
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utente';
  const userEmail = user?.email || '';
  const totalEarnings = totalTaskEarnings + totalTips + totalBonuses;
  const joinedDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) : '';
  const position = "Posizione non impostata";

  // Empty arrays for real data (no fake data)
  const taskHistory: { id: number; title: string; date: string; amount: number; type: string; role: string }[] = [];

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours} ore e ${mins} min`;
    } else if (hours > 0) {
      return `${hours} ore`;
    }
    return `${mins} min`;
  };

  const formatTxDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  };

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'task_earning': return '✅';
      case 'tip': return '🎉';
      case 'referral_bonus': return '🎁';
      default: return '💰';
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile effettuare il logout",
        variant: "destructive",
      });
    } else {
      toast({
        title: "A presto! 👋",
        description: "Logout effettuato con successo",
      });
    }
  };

  const handleToggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark', !isDarkMode);
    toast({
      title: isDarkMode ? "Light mode attivato ☀️" : "Dark mode attivato 🌙",
    });
  };

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleSaveProfile = () => {
    toast({
      title: "Profilo aggiornato ✅",
      description: "Le tue modifiche sono state salvate",
    });
    setCurrentScreen("settings");
  };

  const handleUpdatePosition = () => {
    toast({
      title: "Posizione aggiornata 📍",
      description: "La tua posizione è stata aggiornata",
    });
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setShowPhotoOptions(false);

    try {
      const url = await uploadProfilePhoto(file);
      setAvatarUrl(url);
      toast({
        title: "Foto caricata ✅",
        description: "La tua foto profilo è stata aggiornata",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Errore upload",
        description: "Riprova – connessione lenta",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl(null);
    setShowPhotoOptions(false);
    toast({
      title: "Foto rimossa",
      description: "La foto profilo è stata rimossa",
    });
  };

  const handleStartKyc = () => {
    toast({
      title: "Verifica in corso... 🔄",
      description: "Reindirizzamento a Shufti Pro",
    });
    setShowKycPopup(false);
  };

  const BackButton = ({ to }: { to: Screen }) => (
    <button 
      onClick={() => setCurrentScreen(to)}
      className="flex items-center gap-2 text-primary font-medium mb-4"
    >
      <ChevronLeft className="w-5 h-5" />
      Indietro
    </button>
  );

  // Wallet Detail Screen - no withdraw button, shows payment methods and transactions
  if (currentScreen === "wallet") {
    return (
      <div ref={ref} className="flex flex-col h-full overflow-y-auto px-4 pt-4 pb-28">
        <BackButton to="main" />
        <h1 className="text-2xl font-bold text-foreground mb-4">Il tuo Wallet 💳</h1>
        
        {/* Balance Card with Total Earnings */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-6 text-white mb-6">
          <p className="text-sm opacity-80 mb-1">Guadagni totali</p>
          <p className="text-5xl font-bold mb-4">{(totalTaskEarnings + totalTips + totalBonuses).toFixed(2)} €</p>
          
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/20">
            <div className="text-center">
              <p className="text-xl font-bold">{totalTaskEarnings.toFixed(0)}€</p>
              <p className="text-xs opacity-80">Task ✅</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{totalTips.toFixed(0)}€</p>
              <p className="text-xs opacity-80">Mance 🎉</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{totalBonuses.toFixed(0)}€</p>
              <p className="text-xs opacity-80">Bonus 🎁</p>
            </div>
          </div>
        </div>

        {/* Payment Method (auto payout destination) */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Metodo di pagamento</h3>
          <p className="text-sm text-muted-foreground mb-3">
            I tuoi guadagni saranno trasferiti automaticamente sul metodo salvato.
          </p>
          {user && <PaymentMethodSelector userId={user.id} showAddForm={true} />}
        </div>

        {/* Transaction History */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Tutti i movimenti</h3>
          <div className="space-y-2">
            {transactions.length > 0 ? transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 p-3 bg-card rounded-2xl shadow-soft">
                <span className="text-xl">{getTxIcon(tx.type)}</span>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{tx.description || tx.type}</p>
                  <p className="text-xs text-muted-foreground">{formatTxDate(tx.created_at)}</p>
                </div>
                <span className={cn(
                  "font-bold text-sm",
                  tx.amount > 0 ? "text-green-500" : "text-red-500"
                )}>
                  +{Number(tx.amount).toFixed(2)} €
                </span>
              </div>
            )) : (
              <p className="text-center text-muted-foreground py-8">Nessun movimento</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Edit Profile Screen
  if (currentScreen === "editProfile") {
    return (
      <div ref={ref} className="flex flex-col h-full overflow-y-auto px-4 pt-4 pb-28">
        <BackButton to="settings" />
        <h1 className="text-2xl font-bold text-foreground mb-6">Modifica profilo ✏️</h1>
        
        {/* Bio */}
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground mb-2 block">Bio</label>
          <Textarea 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Descrivi te stesso..."
            className="min-h-[100px]"
          />
        </div>

        {/* Update Position */}
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground mb-2 block">Posizione attuale</label>
          <div className="flex items-center gap-3 p-4 bg-card rounded-2xl">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="flex-1 text-foreground">{position}</span>
            <Button variant="outline" size="sm" onClick={handleUpdatePosition}>
              Aggiorna
            </Button>
          </div>
        </div>

        {/* Skills */}
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground mb-3 block">Le mie competenze</label>
          <div className="grid grid-cols-2 gap-2">
            {allSkills.map((skill) => (
              <label 
                key={skill.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors",
                  selectedSkills.includes(skill.id) 
                    ? "bg-primary/10 border-2 border-primary" 
                    : "bg-card border-2 border-transparent"
                )}
              >
                <Checkbox 
                  checked={selectedSkills.includes(skill.id)}
                  onCheckedChange={() => handleSkillToggle(skill.id)}
                />
                <span className="text-sm text-foreground">{skill.emoji} {skill.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Available for immediate */}
        <div className="mb-8">
          <div className="flex items-center justify-between p-4 bg-card rounded-2xl">
            <div>
              <p className="font-medium text-foreground">Disponibile per task immediati</p>
              <p className="text-sm text-muted-foreground">Ricevi notifiche per task urgenti</p>
            </div>
            <Switch 
              checked={availableImmediate}
              onCheckedChange={setAvailableImmediate}
            />
          </div>
        </div>

        <Button variant="cta" size="lg" onClick={handleSaveProfile} className="w-full">
          Salva modifiche ✅
        </Button>
      </div>
    );
  }

  // Change Password Screen
  if (currentScreen === "changePassword") {
    return (
      <div ref={ref} className="flex flex-col h-full overflow-y-auto px-4 pt-4 pb-28">
        <BackButton to="settings" />
        <h1 className="text-2xl font-bold text-foreground mb-6">Cambia password 🔐</h1>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Password attuale</label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Nuova password</label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Conferma nuova password</label>
            <Input type="password" placeholder="••••••••" />
          </div>
        </div>

        <Button variant="cta" size="lg" className="w-full mt-8">
          Aggiorna password
        </Button>
      </div>
    );
  }

  // Appearance Screen
  if (currentScreen === "appearance") {
    return (
      <div ref={ref} className="flex flex-col h-full overflow-y-auto px-4 pt-4 pb-28">
        <BackButton to="settings" />
        <h1 className="text-2xl font-bold text-foreground mb-6">Aspetto 🎨</h1>
        
        <div className="space-y-3">
          <button 
            onClick={() => { setIsDarkMode(false); document.documentElement.classList.remove('dark'); }}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-2xl transition-colors",
              !isDarkMode ? "bg-primary/10 border-2 border-primary" : "bg-card border-2 border-transparent"
            )}
          >
            <Sun className="w-6 h-6 text-yellow-500" />
            <span className="flex-1 text-left font-medium text-foreground">Light mode</span>
            {!isDarkMode && <span className="text-primary">✓</span>}
          </button>
          
          <button 
            onClick={() => { setIsDarkMode(true); document.documentElement.classList.add('dark'); }}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-2xl transition-colors",
              isDarkMode ? "bg-primary/10 border-2 border-primary" : "bg-card border-2 border-transparent"
            )}
          >
            <Moon className="w-6 h-6 text-blue-500" />
            <span className="flex-1 text-left font-medium text-foreground">Dark mode</span>
            {isDarkMode && <span className="text-primary">✓</span>}
          </button>
        </div>
      </div>
    );
  }

  // Settings Screen
  if (currentScreen === "settings") {
    return (
      <div ref={ref} className="flex flex-col h-full overflow-y-auto px-4 pt-4 pb-28">
        <BackButton to="main" />
        <h1 className="text-2xl font-bold text-foreground mb-6">Impostazioni ⚙️</h1>
        
        <div className="space-y-2">
          {[
            { icon: "📝", label: "Modifica profilo", screen: "editProfile" as Screen },
            { icon: "🔐", label: "Cambia password", screen: "changePassword" as Screen },
            { icon: "🛡️", label: "Privacy", screen: "privacy" as Screen },
            { icon: "📱", label: "Info app", screen: "appInfo" as Screen },
            { icon: "🎨", label: "Aspetto", screen: "appearance" as Screen },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => setCurrentScreen(item.screen)}
              className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl shadow-soft tap-scale"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="flex-1 text-left font-medium text-foreground">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Privacy Screen (blank)
  if (currentScreen === "privacy") {
    return (
      <div ref={ref} className="flex flex-col h-full overflow-y-auto px-4 pt-4 pb-28">
        <BackButton to="settings" />
        <h1 className="text-2xl font-bold text-foreground mb-6">Privacy 🛡️</h1>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Contenuto in arrivo...</p>
        </div>
      </div>
    );
  }

  // App Info Screen (blank)
  if (currentScreen === "appInfo") {
    return (
      <div ref={ref} className="flex flex-col h-full overflow-y-auto px-4 pt-4 pb-28">
        <BackButton to="settings" />
        <h1 className="text-2xl font-bold text-foreground mb-6">Info app 📱</h1>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Contenuto in arrivo...</p>
        </div>
      </div>
    );
  }

  // Task History Screen
  if (currentScreen === "history") {
    return (
      <div ref={ref} className="flex flex-col h-full overflow-y-auto px-4 pt-4 pb-28">
        <BackButton to="main" />
        <h1 className="text-2xl font-bold text-foreground mb-6">Cronologia task 📋</h1>
        
        <div className="space-y-3">
          {taskHistory.length > 0 ? taskHistory.map((task) => (
            <div key={task.id} className="p-4 bg-card rounded-2xl shadow-soft">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-foreground">{task.title}</h4>
                <span className={cn(
                  "px-2 py-1 rounded-lg text-xs font-medium",
                  task.role === "lifter" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                )}>
                  {task.role === "lifter" ? "Lifter 💪" : "Cliente 👤"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{task.date}</span>
                <span className={cn(
                  "font-bold",
                  task.role === "lifter" ? "text-green-500" : "text-foreground"
                )}>
                  {task.role === "lifter" ? "+" : "-"}{task.amount}€
                </span>
              </div>
            </div>
          )) : (
            <p className="text-center text-muted-foreground py-8">Nessun task completato</p>
          )}
        </div>
      </div>
    );
  }

  // Legal Screen (blank)
  if (currentScreen === "legal") {
    return (
      <div ref={ref} className="flex flex-col h-full overflow-y-auto px-4 pt-4 pb-28">
        <BackButton to="main" />
        <h1 className="text-2xl font-bold text-foreground mb-6">Note legali 📄</h1>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Contenuto in arrivo...</p>
        </div>
      </div>
    );
  }

  // Info Screen (blank)
  if (currentScreen === "info") {
    return (
      <div ref={ref} className="flex flex-col h-full overflow-y-auto px-4 pt-4 pb-28">
        <BackButton to="main" />
        <h1 className="text-2xl font-bold text-foreground mb-6">Informazioni ℹ️</h1>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Contenuto in arrivo...</p>
        </div>
      </div>
    );
  }

  // Main Profile Screen
  return (
    <div ref={ref} className="flex flex-col h-full overflow-y-auto pb-28">
      {/* KYC Popup after first task */}
      {showKycPopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl p-6 max-w-sm w-full animate-scale-in">
            <div className="text-center">
              <span className="text-6xl mb-4 block">🎉</span>
              <h2 className="text-2xl font-bold text-foreground mb-2">Complimenti!</h2>
              <p className="text-muted-foreground mb-4">
                Hai accettato il tuo primo task! Verifica la tua identità in 30 secondi per ricevere più richieste.
              </p>
              <p className="text-sm text-primary font-medium mb-6">
                I clienti scelgono prima i Lifter verificati! ✨
              </p>
              <Button variant="cta" size="lg" className="w-full mb-3" onClick={handleStartKyc}>
                Verifica ora – gratis 🔒
              </Button>
              <button 
                className="text-sm text-muted-foreground"
                onClick={() => setShowKycPopup(false)}
              >
                Fallo dopo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Savings Detail Modal */}
      {showSavingsDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSavingsDetail(false)}>
          <div className="bg-card rounded-3xl p-6 max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-foreground mb-4 text-center">Il tuo valore 🌟</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-6 h-6 text-blue-500" />
                  <span className="font-semibold text-foreground">Tempo risparmiato</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">{formatTime(timeSavedMinutes)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Con {completedClientTasks.length} task richiesti
                </p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <PiggyBank className="w-6 h-6 text-green-500" />
                  <span className="font-semibold text-foreground">Soldi risparmiati</span>
                </div>
                <p className="text-3xl font-bold text-green-600">{moneySaved}€</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Rispetto ai servizi tradizionali
                </p>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <Wallet className="w-6 h-6 text-orange-500" />
                  <span className="font-semibold text-foreground">Speso su Liftome</span>
                </div>
                <p className="text-3xl font-bold text-orange-600">{moneySpent.toFixed(0)}€</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Per {completedClientTasks.length} task completati
                </p>
              </div>

              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  💡 Continua a usare Liftome per risparmiare ancora di più!
                </p>
              </div>
            </div>

            <Button variant="outline" className="w-full mt-4" onClick={() => setShowSavingsDetail(false)}>
              Chiudi
            </Button>
          </div>
        </div>
      )}

      {/* COMPACT PROFILE CARD - Expandable */}
      <div className="px-4 pt-6 pb-4">
        <div className="w-full bg-card rounded-3xl p-4 shadow-elevated transition-all duration-300 text-left">
          <button
            type="button"
            onClick={() => setProfileExpanded(!profileExpanded)}
            className="w-full text-left"
          >
            {/* Compact View - Always visible */}
            <div className="flex items-center gap-4">
              {/* Photo */}
              <div className="relative">
                <div
                  className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center border-3 overflow-hidden",
                    kycVerified ? "border-primary" : "border-muted",
                    "bg-muted"
                  )}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>
                {kycVerified && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                    ✓
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-foreground truncate">{userName}</h2>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={cn(
                          "text-sm",
                          star <= Math.round(profileRating) ? "text-yellow-400" : "text-muted-foreground/30"
                        )}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-foreground">{profileRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({profileReviewCount})</span>
                </div>

                {/* Skills preview */}
                {selectedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedSkills.slice(0, 3).map((skillId) => {
                      const skill = allSkills.find((s) => s.id === skillId);
                      return skill ? (
                        <span key={skillId} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {skill.emoji}
                        </span>
                      ) : null;
                    })}
                    {selectedSkills.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{selectedSkills.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Bio preview */}
                {bio?.trim() && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{bio}</p>
                )}
              </div>

              {/* Expand indicator */}
              <ChevronRight
                className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform duration-300",
                  profileExpanded && "rotate-90"
                )}
              />
            </div>
          </button>

          {/* Expanded View */}
          {profileExpanded && (
            <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in">
              {/* Photo Options */}
              <div className="flex items-center justify-center gap-2">
                <label className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl cursor-pointer hover:bg-muted/80 transition-colors">
                  <Camera className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">Cambia foto</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-xl hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Bio</label>
                <Textarea
                  value={bio}
                  onChange={(e) => {
                    if (e.target.value.length <= 150) {
                      setBio(e.target.value);
                    }
                  }}
                  placeholder="Descrivi te stesso in poche parole..."
                  className="min-h-[60px] resize-none text-sm"
                  maxLength={150}
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{bio.length}/150</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setProfileExpanded(true);

                      if (user) {
                        await supabase.from("profiles").update({ bio }).eq("user_id", user.id);
                        toast({ title: "Bio salvata ✅" });
                      }
                    }}
                  >
                    Salva
                  </Button>
                </div>
              </div>

              {/* Skills */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Skills</label>
                <div className="flex flex-wrap gap-1.5">
                  {allSkills.map((skill) => {
                    const isSelected = selectedSkills.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={async () => {
                          const newSkills = isSelected
                            ? selectedSkills.filter((s) => s !== skill.id)
                            : [...selectedSkills, skill.id];
                          setSelectedSkills(newSkills);
                          if (user) {
                            await supabase.from('profiles').update({ skills: newSkills }).eq('user_id', user.id);
                          }
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                          isSelected
                            ? "bg-primary/20 text-primary border border-primary"
                            : "bg-muted text-muted-foreground border border-transparent hover:bg-muted/80"
                        )}
                      >
                        {skill.emoji} {skill.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reviews Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-muted-foreground">Ultime recensioni</label>
                  <span className="text-xs text-primary">{profileReviewCount} totali</span>
                </div>
                {reviews && reviews.length > 0 ? (
                  <div className="space-y-2 max-h-[150px] overflow-y-auto">
                    {reviews.slice(0, 3).map((review) => (
                      <div key={review.id} className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg">
                        {review.reviewer_avatar ? (
                          <img src={review.reviewer_avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium text-foreground">{review.reviewer_name}</span>
                            <span className="text-xs text-yellow-400">{"★".repeat(review.rating)}</span>
                          </div>
                          {review.comment && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-3">Nessuna recensione ancora 📭</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-6 space-y-6">
        {/* Wallet - Clickable */}
        <button 
          onClick={() => setCurrentScreen("wallet")}
          className="w-full bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-5 text-white shadow-elevated text-left tap-scale"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-7 h-7" />
              <span className="font-semibold text-lg">Il tuo Wallet</span>
            </div>
            <ChevronRight className="w-5 h-5 opacity-70" />
          </div>
          <p className="text-sm opacity-80 mb-1">Guadagni totali</p>
          <p className="text-5xl font-bold mb-4">{totalEarnings.toFixed(2)} €</p>
          
          {/* Earnings breakdown */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/20">
            <div className="text-center">
              <p className="text-xl font-bold">{totalTaskEarnings.toFixed(0)}€</p>
              <p className="text-xs opacity-80">Task ✅</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{totalTips.toFixed(0)}€</p>
              <p className="text-xs opacity-80">Mance 🎉</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{totalBonuses.toFixed(0)}€</p>
              <p className="text-xs opacity-80">Bonus 🎁</p>
            </div>
          </div>
        </button>

        {/* Interactive Savings Box */}
        <button 
          onClick={() => setShowSavingsDetail(true)}
          className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl p-5 text-white shadow-elevated tap-scale relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-pulse" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-lg">✨ Il tuo valore con Liftome</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Tocca per dettagli</span>
            </div>
            {completedClientTasks.length > 0 ? (
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Clock className="w-5 h-5" />
                    <span className="text-3xl font-bold">{formatTime(timeSavedMinutes)}</span>
                  </div>
                  <p className="text-xs opacity-90">Tempo risparmiato</p>
                </div>
                <div className="h-12 w-px bg-white/30" />
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <PiggyBank className="w-5 h-5" />
                    <span className="text-3xl font-bold">{moneySaved}€</span>
                  </div>
                  <p className="text-xs opacity-90">Soldi risparmiati</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xl font-bold mb-2">🚀 Inizia il tuo primo task</p>
                <p className="text-base opacity-90">e inizia a risparmiare tempo e soldi!</p>
              </div>
            )}
          </div>
        </button>

        {/* Referral Section */}
        {user && <ReferralSection userId={user.id} />}

        {/* KYC Status */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Verifica identità 🔒</h3>
          {!kycVerified ? (
            <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-2xl">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-2xl">🔒</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-gray-300 dark:bg-gray-700 rounded text-xs font-medium text-gray-600 dark:text-gray-400">
                      Non verificato
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Accetta il tuo primo task per sbloccare la verifica (+300% visibilità)
                  </p>
                  <Button variant="outline" size="sm" disabled className="opacity-50">
                    Disponibile dopo il primo task
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl flex items-center gap-3 bg-green-50 dark:bg-green-950">
              <span className="text-3xl">✅</span>
              <div>
                <h4 className="font-semibold text-foreground">Identità verificata</h4>
                <p className="text-sm text-muted-foreground">+300% visibilità nei risultati</p>
              </div>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <div className="space-y-2">
          {[
            { icon: "⚙️", label: "Impostazioni", screen: "settings" as Screen },
            { icon: "📋", label: "Cronologia task", screen: "history" as Screen },
            { icon: "📄", label: "Note legali", screen: "legal" as Screen },
            { icon: "ℹ️", label: "Info", screen: "info" as Screen },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => setCurrentScreen(item.screen)}
              className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl shadow-soft tap-scale"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="flex-1 text-left font-medium text-foreground">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <Button 
          variant="outline" 
          size="lg" 
          onClick={handleLogout}
          className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          Esci 👋
        </Button>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          Membro dal {joinedDate} • Liftome v1.0.0
        </p>
      </div>
    </div>
  );
});
