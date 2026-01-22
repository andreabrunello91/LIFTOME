import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Plus, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentMethod {
  id: string;
  type: string;
  last4: string | null;
  brand: string | null;
  is_default: boolean;
}

interface PaymentMethodSelectorProps {
  userId: string;
  onSelect?: (method: PaymentMethod | null) => void;
  showAddForm?: boolean;
}

export function PaymentMethodSelector({ userId, onSelect, showAddForm = true }: PaymentMethodSelectorProps) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'card' | 'iban'>('card');
  const { toast } = useToast();

  // Check for Apple Pay / Google Pay availability
  const [canUseApplePay, setCanUseApplePay] = useState(false);
  const [canUseGooglePay, setCanUseGooglePay] = useState(false);

  useEffect(() => {
    // Detect Apple Pay (iOS Safari)
    const isAppleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setCanUseApplePay(isAppleDevice && 'ApplePaySession' in window);

    // Detect Google Pay (Android Chrome)
    const isAndroid = /Android/.test(navigator.userAgent);
    setCanUseGooglePay(isAndroid);
  }, []);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const { data, error } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('user_id', userId)
          .order('is_default', { ascending: false });

        if (error) {
          console.error('Error fetching payment methods:', error);
          return;
        }

        setMethods(data || []);
        
        // Select default method
        const defaultMethod = data?.find(m => m.is_default) || data?.[0] || null;
        setSelectedMethod(defaultMethod);
        onSelect?.(defaultMethod);
      } catch (err) {
        console.error('Error in fetchMethods:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchMethods();
    }
  }, [userId, onSelect]);

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
    onSelect?.(method);
  };

  const handleAddCard = async (cardNumber: string) => {
    setIsAdding(true);
    try {
      // Simulate Stripe card tokenization (test mode)
      const last4 = cardNumber.slice(-4);
      
      const { error } = await supabase
        .from('payment_methods')
        .insert({
          user_id: userId,
          type: 'card',
          last4,
          brand: 'Visa', // In real implementation, Stripe would return this
          is_default: methods.length === 0,
          stripe_payment_method_id: `pm_test_${Date.now()}`,
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Carta aggiunta ✅",
        description: `Carta **** ${last4} salvata con successo`,
      });

      // Refresh methods
      const { data: newMethods } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false });

      setMethods(newMethods || []);
      setShowForm(false);
    } catch (err) {
      console.error('Error adding card:', err);
      toast({
        title: "Errore",
        description: "Impossibile aggiungere la carta",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleApplePay = () => {
    toast({
      title: "Apple Pay",
      description: "Apple Pay sarà disponibile per i pagamenti reali",
    });
    // In production, this would initialize Apple Pay session
  };

  const handleGooglePay = () => {
    toast({
      title: "Google Pay", 
      description: "Google Pay sarà disponibile per i pagamenti reali",
    });
    // In production, this would initialize Google Pay
  };

  if (isLoading) {
    return (
      <div className="p-4 animate-pulse">
        <div className="h-16 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Apple Pay / Google Pay - Priority */}
      {(canUseApplePay || canUseGooglePay) && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Paga in 1 tap</p>
          
          {canUseApplePay && (
            <Button
              onClick={handleApplePay}
              className="w-full h-14 bg-black hover:bg-black/90 text-white rounded-xl flex items-center justify-center gap-2"
            >
              <svg className="w-10 h-6" viewBox="0 0 50 20" fill="white">
                <path d="M9.6 5.3c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9.1 1.7-.4 2.3-1.1zm.8 1.3c-1.3-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.6 2 1-.1 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.7 1.1 0 1.8-.9 2.5-1.9.8-1.1 1.1-2.2 1.1-2.2 0 0-2.2-.8-2.2-3.3 0-2.1 1.7-3.1 1.8-3.2-.9-1.5-2.5-1.6-3.3-1.6z"/>
                <path d="M21.4 3.4c3.1 0 5.2 2.1 5.2 5.2 0 3.1-2.2 5.2-5.3 5.2h-3.4v5.4h-2.5V3.4h6zm-3.5 8.3h2.8c2.1 0 3.3-1.2 3.3-3.1 0-1.9-1.2-3.1-3.3-3.1h-2.8v6.2z"/>
                <path d="M27.6 15.1c0-2 1.5-3.2 4.3-3.4l3.2-.2v-.9c0-1.3-.8-2-2.4-2-1.4 0-2.3.6-2.5 1.6h-2.3c.1-2.1 2-3.6 4.9-3.6 2.9 0 4.7 1.5 4.7 3.9v8.2h-2.3v-2h-.1c-.7 1.3-2.1 2.2-3.7 2.2-2.3 0-3.8-1.4-3.8-3.8zm7.5-1.1v-.9l-2.9.2c-1.4.1-2.2.7-2.2 1.7 0 1 .9 1.7 2.1 1.7 1.7 0 3-1.1 3-2.7z"/>
                <path d="M39.1 22.5v-2c.2 0 .6.1.8.1 1.2 0 1.8-.5 2.2-1.7l.2-.7-4.4-11.9h2.6l3.1 9.5h.1l3.1-9.5h2.5l-4.6 12.5c-1 2.8-2.2 3.8-4.6 3.8-.3-.1-.8-.1-1-.1z"/>
              </svg>
            </Button>
          )}
          
          {canUseGooglePay && (
            <Button
              onClick={handleGooglePay}
              className="w-full h-14 bg-white hover:bg-gray-50 text-black border border-gray-200 rounded-xl flex items-center justify-center gap-2"
            >
              <svg className="w-16 h-6" viewBox="0 0 68 28" fill="none">
                <path d="M32.7 13.8v8h-2.5V4.2h6.5c1.6 0 3 .5 4.1 1.6 1.1 1 1.7 2.4 1.7 3.9 0 1.6-.6 2.9-1.7 3.9-1.1 1-2.4 1.6-4 1.6h-4.1v-1.4zm0-7.4v5.2h4.2c.9 0 1.7-.3 2.3-.9.6-.6.9-1.3.9-2.2s-.3-1.6-.9-2.2c-.6-.6-1.4-.9-2.3-.9h-4.2z" fill="#3C4043"/>
                <path d="M45.5 9.8c1.8 0 3.2.5 4.2 1.5 1 1 1.5 2.4 1.5 4.1v6.4h-2.4v-1.4h-.1c-1 1.2-2.3 1.7-3.9 1.7-1.4 0-2.5-.4-3.4-1.2-.9-.8-1.4-1.8-1.4-3 0-1.3.5-2.3 1.5-3 1-.7 2.3-1.1 4-1.1 1.4 0 2.6.3 3.4.8v-.6c0-.9-.3-1.6-1-2.2-.7-.6-1.5-.9-2.4-.9-1.3 0-2.4.6-3.1 1.7l-2.2-1.4c1.1-1.6 2.8-2.4 5.3-2.4zm-3 8.3c0 .7.3 1.2.8 1.6.5.4 1.2.6 1.9.6 1 0 2-.4 2.7-1.1.8-.7 1.2-1.6 1.2-2.5-.7-.6-1.7-.9-3-.9s-2.2.3-2.8.8c-.6.4-.8 1-.8 1.5z" fill="#3C4043"/>
                <path d="M62.9 10.1l-8.2 18.8h-2.5l3-6.6-5.4-12.2h2.7l3.8 9.3h.1l3.8-9.3h2.7z" fill="#3C4043"/>
                <path d="M19.6 12.2c0-.8-.1-1.5-.2-2.2H10v4.2h5.4c-.2 1.2-.9 2.2-1.9 2.9v2.4h3.1c1.8-1.7 2.9-4.1 2.9-7.3z" fill="#4285F4"/>
                <path d="M10 22c2.6 0 4.7-.9 6.3-2.3l-3.1-2.4c-.9.6-1.9.9-3.2.9-2.5 0-4.6-1.7-5.3-3.9H1.5v2.5c1.6 3.1 4.8 5.2 8.5 5.2z" fill="#34A853"/>
                <path d="M4.7 14.3c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V8.2H1.5c-.6 1.3-1 2.7-1 4.3s.4 3 1 4.3l3.2-2.5z" fill="#FBBC04"/>
                <path d="M10 6.8c1.4 0 2.6.5 3.6 1.4l2.7-2.7C14.7 4 12.6 3 10 3c-3.7 0-6.9 2.1-8.5 5.2l3.2 2.5c.7-2.2 2.8-3.9 5.3-3.9z" fill="#EA4335"/>
              </svg>
            </Button>
          )}
        </div>
      )}

      {/* Saved Cards */}
      {methods.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Metodi salvati</p>
          {methods.map((method) => (
            <button
              key={method.id}
              onClick={() => handleSelectMethod(method)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                selectedMethod?.id === method.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div className="w-10 h-7 bg-gradient-to-r from-blue-600 to-blue-400 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">•••• {method.last4}</p>
                <p className="text-xs text-muted-foreground">{method.brand}</p>
              </div>
              {selectedMethod?.id === method.id && (
                <Check className="w-5 h-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Add New Method */}
      {showAddForm && (
        <>
          {!showForm ? (
            <Button
              variant="outline"
              className="w-full rounded-xl h-12"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {methods.length === 0 ? "Aggiungi metodo di pagamento" : "Aggiungi altro metodo"}
            </Button>
          ) : (
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setFormType('card')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
                    formType === 'card' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  💳 Carta
                </button>
                <button
                  onClick={() => setFormType('iban')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
                    formType === 'iban' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  🏦 IBAN
                </button>
              </div>

              {formType === 'card' ? (
                <CardForm onSubmit={handleAddCard} isLoading={isAdding} />
              ) : (
                <IbanForm onSubmit={() => {
                  toast({
                    title: "IBAN",
                    description: "Funzionalità in arrivo",
                  });
                }} isLoading={isAdding} />
              )}

              <button
                onClick={() => setShowForm(false)}
                className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground"
              >
                Annulla
              </button>
            </div>
          )}
        </>
      )}

      {/* Security Note */}
      <p className="text-xs text-center text-muted-foreground">
        🔒 Sicuro con Stripe – fondi bloccati fino a task completato
      </p>
    </div>
  );
}

function CardForm({ onSubmit, isLoading }: { onSubmit: (cardNumber: string) => void; isLoading: boolean }) {
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvc, setCvc] = useState("123");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(cardNumber.replace(/\s/g, ''));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Numero carta</label>
        <Input
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          placeholder="4242 4242 4242 4242"
          className="h-11"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Scadenza</label>
          <Input
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            placeholder="MM/AA"
            className="h-11"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">CVC</label>
          <Input
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
            placeholder="123"
            type="password"
            className="h-11"
          />
        </div>
      </div>
      <Button
        type="submit"
        variant="cta"
        className="w-full h-11"
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Salva carta"
        )}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        Test: usa 4242 4242 4242 4242
      </p>
    </form>
  );
}

function IbanForm({ onSubmit, isLoading }: { onSubmit: () => void; isLoading: boolean }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">IBAN</label>
        <Input
          placeholder="IT60X0542811101000000123456"
          className="h-11"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Intestatario</label>
        <Input
          placeholder="Nome Cognome"
          className="h-11"
        />
      </div>
      <Button
        type="submit"
        variant="cta"
        className="w-full h-11"
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Salva IBAN"
        )}
      </Button>
    </form>
  );
}