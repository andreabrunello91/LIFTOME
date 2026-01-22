import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Sparkles, Menu, X, ArrowRight, Clock, Star, MapPin, 
  FileCheck, Lock, Shield, Award, Zap, Users, TrendingUp,
  Quote, ChevronRight, Smartphone, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// PWA Install Hook
const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setCanInstall(false);
    
    return outcome === 'accepted';
  };

  return { canInstall, install };
};

// Animated section wrapper
const AnimatedSection = ({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
};

// Floating orbs component
const FloatingOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      animate={{ 
        x: [0, 100, 50, 0], 
        y: [0, -50, 100, 0],
        scale: [1, 1.2, 0.9, 1] 
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
    />
    <motion.div
      animate={{ 
        x: [0, -80, 30, 0], 
        y: [0, 80, -40, 0],
        scale: [1, 0.8, 1.1, 1] 
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      className="absolute top-40 right-20 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl"
    />
    <motion.div
      animate={{ 
        x: [0, 60, -40, 0], 
        y: [0, -60, 50, 0],
        scale: [1, 1.1, 0.95, 1] 
      }}
      transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      className="absolute bottom-20 left-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl"
    />
  </div>
);

export default function Landing() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const navigate = useNavigate();
  const { canInstall, install } = usePWAInstall();

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    // iOS Safari
    (navigator as any).standalone;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToInstallGuide = () => {
    const installSection = document.getElementById("install-guide");
    if (installSection) {
      installSection.scrollIntoView({ behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const handleInstall = async () => {
    // If already installed, show a toast.
    if (isStandalone) {
      // Already installed - open the app
      navigate("/app");
      return;
    }

    // iOS Safari doesn't support beforeinstallprompt → show instructions.
    if (isIOS) {
      setShowInstallHelp(true);
      scrollToInstallGuide();
      return;
    }

    // Android/desktop browsers → show native prompt when available.
    if (canInstall) {
      const accepted = await install();
      if (!accepted) {
        setShowInstallHelp(true);
        scrollToInstallGuide();
      }
      return;
    }

    // Fallback (no prompt available yet) - show instructions
    setShowInstallHelp(true);
    scrollToInstallGuide();
  };

  const handleBecomeLifter = () => {
    // Persist intent across login/signup
    localStorage.setItem("liftome_intent", "become_lifter");
    navigate("/app?tab=guadagna&lifter=true");
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    window.location.origin + "/#install-guide"
  )}&bgcolor=ffffff&color=000000`;

  return (
    <div className="min-h-screen bg-background">
      {/* Install Help Modal (iOS + fallback) */}
      <AnimatePresence>
        {showInstallHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowInstallHelp(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="w-full max-w-md bg-card rounded-3xl p-5 shadow-elevated border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Installa Liftome</h3>
                  <p className="text-sm text-muted-foreground">
                    {isIOS
                      ? "Su iPhone l’installazione si fa dal menu Condividi."
                      : "Se il popup non compare, puoi aggiungere l’app dal menu del browser."}
                  </p>
                </div>
                <button
                  onClick={() => setShowInstallHelp(false)}
                  className="p-2 rounded-xl hover:bg-muted transition-colors"
                  aria-label="Chiudi"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
                {isIOS ? (
                  <div className="text-sm text-foreground">
                    <p className="font-semibold mb-2">iPhone / iPad</p>
                    <ol className="list-decimal ml-5 space-y-1 text-muted-foreground">
                      <li>Tocca <span className="font-medium text-foreground">Condividi</span> (⬆️)</li>
                      <li>Seleziona <span className="font-medium text-foreground">Aggiungi alla Home</span></li>
                      <li>Conferma</li>
                    </ol>
                  </div>
                ) : (
                  <div className="text-sm text-foreground">
                    <p className="font-semibold mb-2">Android</p>
                    <ol className="list-decimal ml-5 space-y-1 text-muted-foreground">
                      <li>Apri il menu del browser (⋮)</li>
                      <li>Seleziona <span className="font-medium text-foreground">Aggiungi alla schermata Home</span></li>
                      <li>Conferma</li>
                    </ol>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={() => setShowInstallHelp(false)} className="rounded-full w-full">
                  Ok
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NAVBAR */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "glass py-3" : "py-5"
      )}>

        <div className="container flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-1 text-2xl font-bold font-display">
            <span className="text-foreground">Lift</span>
            <span className="text-primary relative">
              ome
              <span className="absolute -top-1 -right-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#come-funziona" className="text-sm font-medium text-muted-foreground hover:text-foreground link-underline transition-colors">
              Come funziona
            </a>
            <a href="#sicurezza" className="text-sm font-medium text-muted-foreground hover:text-foreground link-underline transition-colors">
              Sicurezza
            </a>
            <a href="#guadagna" className="text-sm font-medium text-muted-foreground hover:text-foreground link-underline transition-colors">
              Guadagna
            </a>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <Button 
              onClick={handleInstall}
              className="rounded-full bg-foreground text-background hover:bg-foreground/90 px-6"
            >
              <Download className="w-4 h-4 mr-2" />
              Scarica
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden glass mt-2 mx-4 rounded-2xl overflow-hidden"
            >
              <nav className="flex flex-col p-4 gap-4">
                <a href="#come-funziona" className="text-sm font-medium" onClick={() => setIsMenuOpen(false)}>
                  Come funziona
                </a>
                <a href="#sicurezza" className="text-sm font-medium" onClick={() => setIsMenuOpen(false)}>
                  Sicurezza
                </a>
                <a href="#guadagna" className="text-sm font-medium" onClick={() => setIsMenuOpen(false)}>
                  Guadagna
                </a>
                <Button onClick={handleInstall} className="rounded-full w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Scarica l'app
                </Button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        <FloatingOrbs />
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="absolute inset-0 gradient-radial" />

        <div className="container relative z-10 text-center px-4 py-20">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Il futuro del vicinato</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-display mb-6"
          >
            Il tuo vicino ti aiuta
            <br />
            <span className="text-gradient">in 10 minuti</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-body-lg max-w-2xl mx-auto mb-10"
          >
            Spesa, cane, fila in posta, montaggio mobili...
            <br />
            Qualsiasi cosa, un Lifter è pronto ad aiutarti.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4"
          >
            <Button 
              size="lg" 
              onClick={handleInstall}
              className="rounded-full text-lg px-8 py-6 btn-glow shadow-glow"
            >
              <Smartphone className="w-5 h-5 mr-2" />
              Scarica l'app gratis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={handleBecomeLifter}
              className="rounded-full text-lg px-8 py-6"
            >
              Diventa Lifter
            </Button>
          </motion.div>

          {/* Microcopy */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-sm text-muted-foreground mb-12"
          >
            10 secondi e Liftome è sul tuo telefono
          </motion.p>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-wrap justify-center gap-4 mb-10"
          >
            {[
              { icon: Clock, value: "8-12 min", label: "Tempo medio" },
              { icon: Star, value: "93%", label: "Soddisfatti" },
              { icon: MapPin, value: "1 km", label: "Max distanza" },
            ].map((stat, i) => (
              <div key={i} className="glass-card rounded-2xl px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* QR Code */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            className="hidden md:block"
          >
            <button 
              onClick={handleInstall}
              className="inline-block p-3 bg-white rounded-2xl shadow-elevated hover:scale-105 transition-transform cursor-pointer"
            >
              <img src={qrCodeUrl} alt="QR Code per scaricare l'app" className="w-32 h-32" />
            </button>
            <p className="text-xs text-muted-foreground mt-2">Scansiona per scaricare</p>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <AnimatedSection id="come-funziona" className="section-padding bg-muted/50 relative">
        <div className="absolute inset-0 dot-pattern opacity-30" />
        <div className="container relative">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Come funziona</span>
            <h2 className="text-headline mt-3">Semplice come 1, 2, 3</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Steps */}
            <div className="space-y-8">
              {[
                { num: "01", title: "Scegli il task", desc: "Seleziona cosa ti serve: spesa, cane, fila, consegna..." },
                { num: "02", title: "Lifter accetta", desc: "Un vicino entro 1 km riceve la notifica e accetta" },
                { num: "03", title: "Aiuto in arrivo", desc: "In 8-12 minuti il tuo Lifter è da te" },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.2 }}
                  viewport={{ once: true }}
                  className="flex gap-6 items-start"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-primary font-display">{step.num}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Visual Demo */}
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="bg-card rounded-3xl p-6 shadow-elevated border border-border/50"
              >
                {/* Task Card Mock */}
                <div className="bg-muted rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">🛒</span>
                    <div>
                      <h4 className="font-bold">Spesa al supermercato</h4>
                      <p className="text-sm text-muted-foreground">Entro 15 minuti</p>
                    </div>
                    <span className="ml-auto text-xl font-bold text-primary">€18</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">350m</span>
                    <span className="px-2 py-1 bg-success/10 text-success text-xs rounded-full">⚡ Immediato</span>
                  </div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: "75%" }}
                      transition={{ delay: 0.5, duration: 1 }}
                      viewport={{ once: true }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                  <span className="text-sm font-medium">75%</span>
                </div>

                {/* Status Card */}
                <div className="bg-success/10 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                    <span className="text-2xl">👨</span>
                  </div>
                  <div>
                    <p className="font-semibold text-success">Marco sta arrivando</p>
                    <p className="text-sm text-muted-foreground">Arrivo stimato: 3 min</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* VIRAL GIGS */}
      <AnimatedSection className="section-padding">
        <div className="container">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Task popolari</span>
            <h2 className="text-headline mt-3">I più richiesti</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { emoji: "🚶‍♂️", title: "Tienimi il posto in fila", price: "€25-40", gradient: "from-orange-500/20 to-amber-500/20" },
              { emoji: "🏥", title: "Accompagnami dal medico", price: "€30-50", gradient: "from-blue-500/20 to-cyan-500/20" },
              { emoji: "💍", title: "Fammi da testimone", price: "€80-120", gradient: "from-pink-500/20 to-rose-500/20" },
              { emoji: "🍕", title: "Portami cena/farmacia", price: "€12-20", gradient: "from-green-500/20 to-emerald-500/20" },
              { emoji: "🐕", title: "Guardami il cane", price: "€15-25", gradient: "from-purple-500/20 to-violet-500/20" },
              { emoji: "✨", title: "Qualsiasi cosa ti serva", price: "Tu decidi", gradient: "from-primary/20 to-orange-400/20" },
            ].map((gig, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02, y: -5 }}
                className={cn(
                  "card-modern cursor-pointer group bg-gradient-to-br",
                  gig.gradient
                )}
              >
                <span className="text-5xl mb-4 block">{gig.emoji}</span>
                <h3 className="text-lg font-bold mb-2">{gig.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-primary font-bold">{gig.price}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* SECURITY */}
      <AnimatedSection id="sicurezza" className="section-padding bg-foreground text-background">
        <div className="container">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Sicurezza</span>
            <h2 className="text-headline mt-3 text-background">Protezione al 100%</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { icon: FileCheck, title: "KYC Obbligatorio", desc: "Verifica identità per tutti i Lifter" },
              { icon: Lock, title: "Escrow Automatico", desc: "Pagamento bloccato fino a completamento" },
              { icon: Shield, title: "Assicurazione AXA", desc: "Copertura completa su ogni task" },
              { icon: Star, title: "Recensioni Reali", desc: "Feedback verificati da clienti veri" },
            ].map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-background/5 border border-background/10 rounded-2xl p-6"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                  <feat.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-background">{feat.title}</h3>
                <p className="text-sm text-background/70">{feat.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Escrow Highlight */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-primary/20 to-orange-400/20 rounded-3xl p-8 text-center border border-primary/30"
          >
            <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2 text-background">Escrow Protetto</h3>
            <p className="text-background/80 max-w-md mx-auto">
              I soldi sono bloccati finché confermi che il task è completato. Nessun rischio.
            </p>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* EARN AS LIFTER */}
      <AnimatedSection id="guadagna" className="section-padding">
        <div className="container">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Diventa Lifter</span>
            <h2 className="text-headline mt-3">Guadagna aiutando</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Benefits */}
            <div className="space-y-6">
              {[
                { icon: Clock, title: "Orario libero", desc: "Lavora quando vuoi, accetta solo i task che ti interessano" },
                { icon: TrendingUp, title: "Surge +50%", desc: "Guadagni extra nelle ore di punta" },
                { icon: Users, title: "Referral €10", desc: "Per ogni amico che diventa Lifter attivo" },
                { icon: Award, title: "Bonus mensili", desc: "Premi per i top performer del mese" },
              ].map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="flex gap-4 items-start"
                >
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "€22-30", label: "netti a task" },
                { value: "100%", label: "mancia tua" },
                { value: "€8-11k", label: "top Lifter/mese" },
                { value: "€10", label: "referral bonus" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-card rounded-2xl p-6 text-center shadow-card border border-border/50"
                >
                  <p className="text-3xl font-bold text-primary mb-1">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Surge Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 bg-gradient-to-r from-success to-emerald-500 rounded-2xl p-6 text-center text-white"
          >
            <p className="text-lg font-bold">
              +50% ore di punta • +30% notturno • Bonus weekend
            </p>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* WHY LIFTOME */}
      <AnimatedSection className="section-padding bg-muted/50">
        <div className="container">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Perché Liftome</span>
            <h2 className="text-headline mt-3">La differenza</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { emoji: "⚡", value: "8-12 min", label: "Velocità imbattibile", gradient: "from-yellow-500/20 to-amber-500/20" },
              { emoji: "📍", value: "1 km", label: "Vero vicinato", gradient: "from-blue-500/20 to-cyan-500/20" },
              { emoji: "💰", value: "€8-11k", label: "Guadagno reale", gradient: "from-green-500/20 to-emerald-500/20" },
              { emoji: "🛡️", value: "100%", label: "Sicurezza totale", gradient: "from-purple-500/20 to-violet-500/20" },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className={cn(
                  "card-modern text-center bg-gradient-to-br card-hover",
                  card.gradient
                )}
              >
                <span className="text-4xl mb-4 block">{card.emoji}</span>
                <p className="text-3xl font-bold mb-1">{card.value}</p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* TESTIMONIALS */}
      <AnimatedSection className="section-padding">
        <div className="container">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Testimonianze</span>
            <h2 className="text-headline mt-3">Cosa dicono di noi</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Marco R.", city: "Milano", text: "Ho trovato un Lifter in 5 minuti per portare il cane dal veterinario. Servizio incredibile!" },
              { name: "Giulia S.", city: "Roma", text: "Come Lifter guadagno €400 extra al mese nei weekend. Flessibilità totale." },
              { name: "Andrea T.", city: "Napoli", text: "Finalmente qualcuno che fa la fila in posta per me. Vale ogni centesimo!" },
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                viewport={{ once: true }}
                className="bg-card rounded-2xl p-6 shadow-card border border-border/50"
              >
                <Quote className="w-8 h-8 text-primary/30 mb-4" />
                <div className="flex mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">{testimonial.name[0]}</span>
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.city}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* INSTALL GUIDE */}
      <AnimatedSection id="install-guide" className="section-padding bg-primary/5">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <Smartphone className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-title mb-4">Installa Liftome sul tuo telefono</h2>
            <p className="text-body-lg mb-8">
              Aggiungi alla home screen per notifiche e accesso rapido
            </p>
            
            <Button 
              size="lg" 
              onClick={handleInstall}
              className="rounded-full text-lg px-8 py-6 mb-8 btn-glow shadow-glow"
            >
              <Download className="w-5 h-5 mr-2" />
              Scarica l'app
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <div className="grid sm:grid-cols-2 gap-4 text-left">
              <div className="bg-card rounded-xl p-4 border border-border/50">
                <p className="font-semibold mb-2">📱 iPhone</p>
                <p className="text-sm text-muted-foreground">
                  Safari → Condividi → "Aggiungi alla schermata Home"
                </p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border/50">
                <p className="font-semibold mb-2">🤖 Android</p>
                <p className="text-sm text-muted-foreground">
                  Chrome → Menu (⋮) → "Aggiungi a schermata Home"
                </p>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* FOOTER */}
      <footer className="bg-foreground text-background py-20">
        <div className="container">
          {/* CTA Section */}
          <div className="text-center mb-16">
            <h2 className="text-headline text-background mb-6">Pronto per iniziare?</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                onClick={handleInstall}
                className="rounded-full text-lg px-8"
              >
                <Download className="w-5 h-5 mr-2" />
                Scarica l'app
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={handleBecomeLifter}
                className="rounded-full text-lg px-8 border-background/20 text-background hover:bg-background/10"
              >
                Diventa Lifter
              </Button>
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid md:grid-cols-4 gap-8 pb-12 border-b border-background/10">
            {/* Brand */}
            <div>
              <a href="/" className="flex items-center gap-1 text-2xl font-bold font-display mb-4">
                <span className="text-background">Lift</span>
                <span className="text-primary">ome</span>
              </a>
              <p className="text-sm text-background/60">
                Il tuo vicino ti aiuta in 10 minuti
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4 text-background">Prodotto</h4>
              <ul className="space-y-2 text-sm text-background/60">
                <li><a href="#come-funziona" className="hover:text-background transition-colors">Come funziona</a></li>
                <li><a href="#sicurezza" className="hover:text-background transition-colors">Sicurezza</a></li>
                <li><a href="#guadagna" className="hover:text-background transition-colors">Diventa Lifter</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4 text-background">Legale</h4>
              <ul className="space-y-2 text-sm text-background/60">
                <li><a href="#" className="hover:text-background transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Termini di Servizio</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Cookie Policy</a></li>
              </ul>
            </div>

            {/* Contact + QR */}
            <div>
              <h4 className="font-semibold mb-4 text-background">Contatti</h4>
              <p className="text-sm text-background/60 mb-4">info@liftome.it</p>
              <div className="bg-white rounded-xl p-2 inline-block">
                <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20" />
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-background/60">
              © {new Date().getFullYear()} Liftome. Tutti i diritti riservati.
            </p>
            <p className="text-sm text-background/60">
              Disponibile in tutta Italia 🇮🇹
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}