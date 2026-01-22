-- 1) Lookup referrer by referral code (without exposing phone/email)
CREATE OR REPLACE FUNCTION public.get_referrer_id_by_code(p_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.user_id
  FROM public.profiles p
  WHERE p.referral_code = p_code
  LIMIT 1;
$$;

-- 2) Credit lifter earnings + handle referral progress/bonus when a task is completed
CREATE OR REPLACE FUNCTION public.handle_task_completed_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ref_row record;
  new_count int;
  bonus_amount numeric := 10;
BEGIN
  -- Only on transition to completato
  IF (TG_OP = 'UPDATE') AND (NEW.status = 'completato') AND (OLD.status IS DISTINCT FROM NEW.status) THEN

    -- Credit lifter base earning (published_price)
    IF NEW.lifter_id IS NOT NULL THEN
      INSERT INTO public.wallet_transactions (user_id, amount, type, task_id, description)
      VALUES (
        NEW.lifter_id,
        NEW.published_price,
        'task_earning',
        NEW.id,
        'Guadagno task'
      );

      UPDATE public.profiles
      SET wallet_balance = COALESCE(wallet_balance, 0) + NEW.published_price,
          updated_at = now()
      WHERE user_id = NEW.lifter_id;

      -- Referral progress: increment tasks_completed for the referred user (the lifter)
      SELECT r.id, r.referrer_id, r.referred_id, COALESCE(r.tasks_completed, 0) AS tasks_completed
      INTO ref_row
      FROM public.referrals r
      WHERE r.referred_id = NEW.lifter_id
        AND COALESCE(r.bonus_paid, false) = false
      LIMIT 1;

      IF FOUND THEN
        new_count := ref_row.tasks_completed + 1;

        UPDATE public.referrals
        SET tasks_completed = new_count
        WHERE id = ref_row.id;

        -- If reached 3 completed tasks -> pay bonus once to both
        IF new_count >= 3 THEN
          UPDATE public.referrals
          SET bonus_paid = true
          WHERE id = ref_row.id;

          -- Credit referred user
          INSERT INTO public.wallet_transactions (user_id, amount, type, description)
          VALUES (ref_row.referred_id, bonus_amount, 'referral_bonus', 'Bonus referral (3 task)');

          UPDATE public.profiles
          SET wallet_balance = COALESCE(wallet_balance, 0) + bonus_amount,
              updated_at = now()
          WHERE user_id = ref_row.referred_id;

          -- Credit referrer user
          INSERT INTO public.wallet_transactions (user_id, amount, type, description)
          VALUES (ref_row.referrer_id, bonus_amount, 'referral_bonus', 'Bonus referral (3 task)');

          UPDATE public.profiles
          SET wallet_balance = COALESCE(wallet_balance, 0) + bonus_amount,
              updated_at = now()
          WHERE user_id = ref_row.referrer_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_completed_side_effects ON public.tasks;
CREATE TRIGGER trg_tasks_completed_side_effects
AFTER UPDATE OF status ON public.tasks
FOR EACH ROW
WHEN (NEW.status = 'completato' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.handle_task_completed_side_effects();

-- 3) Credit lifter tips when a review with tip_amount is inserted
CREATE OR REPLACE FUNCTION public.handle_tip_on_review_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tip numeric;
BEGIN
  tip := COALESCE(NEW.tip_amount, 0);

  IF tip > 0 AND NEW.reviewee_id IS NOT NULL THEN
    INSERT INTO public.wallet_transactions (user_id, amount, type, task_id, description)
    VALUES (NEW.reviewee_id, tip, 'tip', NEW.task_id, 'Mancia');

    UPDATE public.profiles
    SET wallet_balance = COALESCE(wallet_balance, 0) + tip,
        updated_at = now()
    WHERE user_id = NEW.reviewee_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_tip_credit ON public.reviews;
CREATE TRIGGER trg_reviews_tip_credit
AFTER INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.handle_tip_on_review_insert();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created_at ON public.wallet_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals (referred_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles (referral_code);