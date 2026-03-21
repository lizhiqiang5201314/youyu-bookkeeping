import { createClient } from '@supabase/supabase-js'

// 从环境变量读取配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 验证配置
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase configuration. Please check your .env file:\n' +
    '- VITE_SUPABASE_URL\n' +
    '- VITE_SUPABASE_ANON_KEY'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// 数据库表类型定义
export type Database = {
  public: {
    Tables: {
      books: {
        Row: {
          id: string
          name: string
          type: 'PERSONAL' | 'COUPLE' | 'FAMILY'
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'PERSONAL' | 'COUPLE' | 'FAMILY'
          created_by: string
          created_at?: string
        }
      }
      book_members: {
        Row: {
          id: string
          book_id: string
          user_id: string
          role: 'OWNER' | 'ADMIN' | 'MEMBER'
          joined_at: string
        }
      }
      categories: {
        Row: {
          id: string
          book_id: string
          name: string
          type: 'INCOME' | 'EXPENSE'
          icon: string
          color: string
          sort_order: number
          is_builtin: boolean
        }
      }
      transactions: {
        Row: {
          id: string
          book_id: string
          user_id: string
          category_id: string
          amount: number
          type: 'INCOME' | 'EXPENSE'
          description: string
          record_date: string
          images: string[]
          created_at: string
        }
      }
      assets: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          balance: number
          note: string
          is_included: boolean
          created_at: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          book_id: string
          type: 'COUPLE' | 'FAMILY'
          plan: 'MONTHLY' | 'YEARLY'
          price: number
          start_date: string
          end_date: string
          status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
          auto_renew: boolean
        }
      }
    }
  }
}
