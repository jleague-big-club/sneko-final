import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './env-loader'

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// サーバーサイド専用（service_role key使用）
// クライアントサイドでは読み込まれないように、あるいはエラーにならないようにする
export const supabaseAdmin = typeof window === 'undefined' 
  ? createClient(supabaseUrl!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  : null as any;

// クライアントサイド用（anon key used）
export const supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!);
