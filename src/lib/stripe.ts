/**
 * Liftome — Stripe Integration
 *
 * Setup:
 * 1. npm install @stripe/stripe-js
 * 2. Aggiungi VITE_STRIPE_PUBLIC_KEY nel .env
 * 3. Crea Edge Function su Supabase per il server-side (vedi sotto)
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? '');
  }
  return stripePromise;
}

/**
 * Crea un Payment Intent per una richiesta
 * Chiama la tua Supabase Edge Function
 */
export async function createPaymentIntent(amount: number, requestId: string) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ amount: Math.round(amount * 100), requestId }),
    }
  );
  return response.json() as Promise<{ clientSecret: string }>;
}

/**
 * Supabase Edge Function da creare in:
 * supabase/functions/create-payment-intent/index.ts
 *
 * import Stripe from 'https://esm.sh/stripe@13';
 * const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
 *
 * Deno.serve(async (req) => {
 *   const { amount, requestId } = await req.json();
 *   const intent = await stripe.paymentIntents.create({
 *     amount,
 *     currency: 'eur',
 *     metadata: { requestId },
 *     capture_method: 'manual', // blocca e rilascia dopo conferma
 *   });
 *   return new Response(JSON.stringify({ clientSecret: intent.client_secret }));
 * });
 */

/**
 * Hook per gestire il checkout Stripe in React
 *
 * Usage:
 * const { pay, loading, error } = useStripePayment();
 * await pay(12, 'request-id-123');
 */
export async function confirmStripePayment(clientSecret: string, cardElement: any) {
  const stripe = await getStripe();
  if (!stripe) throw new Error('Stripe non disponibile');

  const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: { card: cardElement },
  });

  if (error) throw new Error(error.message);
  return paymentIntent;
}
