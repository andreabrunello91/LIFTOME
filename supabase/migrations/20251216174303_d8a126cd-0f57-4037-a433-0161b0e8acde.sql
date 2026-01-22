-- Messages table for real chat between client and lifter
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_audio boolean DEFAULT false,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages for their tasks
CREATE POLICY "Users can view messages for their tasks" ON public.messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = messages.task_id 
    AND (t.client_id = auth.uid() OR t.lifter_id = auth.uid())
  )
);

-- Users can send messages for their tasks
CREATE POLICY "Users can send messages for their tasks" ON public.messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = task_id 
    AND (t.client_id = auth.uid() OR t.lifter_id = auth.uid())
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Referrals table for referral tracking
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_code text NOT NULL,
  tasks_completed integer DEFAULT 0,
  bonus_paid boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals
CREATE POLICY "Users can view their referrals" ON public.referrals
FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- System can insert referrals (on signup)
CREATE POLICY "Users can create referrals" ON public.referrals
FOR INSERT WITH CHECK (auth.uid() = referred_id);

-- Wallet transactions table
CREATE TABLE public.wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL, -- 'task_earning', 'tip', 'referral_bonus', 'payout'
  description text,
  task_id uuid REFERENCES public.tasks(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their transactions
CREATE POLICY "Users can view their transactions" ON public.wallet_transactions
FOR SELECT USING (auth.uid() = user_id);

-- System can insert transactions
CREATE POLICY "Users can insert their transactions" ON public.wallet_transactions
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add referral_code and wallet_balance to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
ADD COLUMN IF NOT EXISTS wallet_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS referred_by uuid;

-- Generate unique referral codes for existing profiles
UPDATE public.profiles 
SET referral_code = 
  CASE 
    WHEN full_name IS NOT NULL AND full_name != '' 
    THEN LOWER(REPLACE(full_name, ' ', '')) || FLOOR(RANDOM() * 1000)::text
    ELSE 'user' || FLOOR(RANDOM() * 100000)::text
  END
WHERE referral_code IS NULL;

-- Create trigger to auto-generate referral code on new profile
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := COALESCE(
      LOWER(REPLACE(NEW.full_name, ' ', '')),
      'user'
    ) || FLOOR(RANDOM() * 1000)::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_referral_code_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- Payment methods table
CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL, -- 'card', 'iban', 'apple_pay', 'google_pay'
  last4 text,
  brand text,
  is_default boolean DEFAULT false,
  stripe_payment_method_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Users can manage their payment methods
CREATE POLICY "Users can view their payment methods" ON public.payment_methods
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add payment methods" ON public.payment_methods
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their payment methods" ON public.payment_methods
FOR DELETE USING (auth.uid() = user_id);