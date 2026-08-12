import Constants from 'expo-constants'

const extra = Constants.expoConfig?.extra ?? {}

export const config = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || String(extra.apiBaseUrl || ''),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || String(extra.supabaseUrl || ''),
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || String(extra.supabaseAnonKey || ''),
}
