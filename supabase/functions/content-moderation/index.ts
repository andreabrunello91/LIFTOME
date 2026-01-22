import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Italian bad words and prohibited content patterns
const blockedPatterns = [
  // Profanity
  /cazzo/gi, /minchia/gi, /figa/gi, /culo/gi, /merda/gi, /stronz/gi, /vaffanculo/gi,
  /puttana/gi, /troia/gi, /bastard/gi, /coglione/gi, /porco/gi,
  // Sexual content
  /sesso/gi, /porno/gi, /escort/gi, /prostitut/gi, /erotico/gi,
  // Drugs
  /droga/gi, /cocaina/gi, /eroina/gi, /marijuana/gi, /cannabis/gi, /spacciare/gi,
  // Weapons
  /armi/gi, /pistola/gi, /fucile/gi, /coltello/gi, /esplosiv/gi,
  // Violence
  /uccidere/gi, /ammazzare/gi, /picchiare/gi, /violenza/gi, /sangue/gi,
  // Hate speech
  /negro/gi, /frocio/gi, /zingaro/gi, /nazista/gi, /razzista/gi,
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description } = await req.json();

    if (!title && !description) {
      return new Response(
        JSON.stringify({ blocked: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const textToCheck = `${title || ''} ${description || ''}`.toLowerCase();
    
    // Check against blocked patterns
    let isBlocked = false;
    let blockedWord = '';

    for (const pattern of blockedPatterns) {
      const match = textToCheck.match(pattern);
      if (match) {
        isBlocked = true;
        blockedWord = match[0];
        break;
      }
    }

    if (isBlocked) {
      console.log('Content blocked:', blockedWord);
      return new Response(
        JSON.stringify({ blocked: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ blocked: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Moderation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Moderation failed';
    return new Response(
      JSON.stringify({ error: errorMessage, blocked: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
