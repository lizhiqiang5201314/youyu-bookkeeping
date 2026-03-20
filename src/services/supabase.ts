import { createClient } from '@supabase/supabase-js'

// 硬编码配置（部署时不受环境变量影响）
const supabaseUrl = 'https://rsytwtcavbbmbjchjhkk.supabase.co'
const supabaseKey = 'sb_publishable_iqqg-CoHFg0C8E4Oqz_PwQ_WF_MquAT'

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
