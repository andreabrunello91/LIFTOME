-- 1. Add UPDATE policy for messages (mark as read only)
CREATE POLICY "Users can mark messages as read"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = messages.task_id 
    AND (t.client_id = auth.uid() OR t.lifter_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = messages.task_id 
    AND (t.client_id = auth.uid() OR t.lifter_id = auth.uid())
  )
);

-- 2. Add UPDATE policy for payment_methods
CREATE POLICY "Users can update their payment methods"
ON public.payment_methods
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Add UPDATE policy for reviews (within 24 hours)
CREATE POLICY "Users can update their reviews within 24 hours"
ON public.reviews
FOR UPDATE
USING (
  auth.uid() = reviewer_id 
  AND created_at > now() - interval '24 hours'
)
WITH CHECK (
  auth.uid() = reviewer_id 
  AND created_at > now() - interval '24 hours'
);