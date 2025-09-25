// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { password, firstName, lastName, phone } = await req.json()

    if (!password || !firstName || !lastName || !phone) {
      return new Response(JSON.stringify({ error: { message: 'Missing required fields.' } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get user from the Authorization header.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: { message: 'Missing Authorization header.' } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: { message: 'Authentication failed.', details: userError?.message } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // 1. Update the user's password.
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: password }
    )
    if (passwordError) throw passwordError

    // 2. Update user metadata. This will trigger the database function to create/update their profile.
    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { user_metadata: { first_name: firstName, last_name: lastName, phone: phone } }
    )
    if (metadataError) throw metadataError

    return new Response(JSON.stringify({ success: true, userId: user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (e) {
    console.error('Error in setup-user function:', e)
    return new Response(JSON.stringify({ error: { message: e.message } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: e.status || 500,
    })
  }
})