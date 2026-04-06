// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://zfrzdpiclktgztwdnkxe.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmcnpkcGljbGt0Z3p0d2Rua3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODUxMjAsImV4cCI6MjA5MTA2MTEyMH0.98rWncpm9SIAoFS2uHhuMbyvx1clRilKhovW1HKTUJE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)