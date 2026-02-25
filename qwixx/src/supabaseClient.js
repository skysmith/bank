import { createClient } from '@supabase/supabase-js'

const FALLBACK_URL = 'https://mexlrxeigajxcrtkegdh.supabase.co'
const FALLBACK_ANON_KEY = 'sb_publishable_HN62gtlDAQ4HK4cD5_Carg_YNfURJ0F'

const url = import.meta.env.VITE_QWIXX_SUPABASE_URL || FALLBACK_URL
const key = import.meta.env.VITE_QWIXX_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY

if (!url || !key) {
  throw new Error('Qwixx Supabase environment is missing (VITE_QWIXX_SUPABASE_URL / VITE_QWIXX_SUPABASE_ANON_KEY).')
}

export const supabase = createClient(url, key)
