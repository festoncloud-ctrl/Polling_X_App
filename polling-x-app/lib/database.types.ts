// Database types for the Polling X App
// These types correspond to the Supabase database schema

export interface Database {
  public: {
    Tables: {
      polls: {
        Row: {
          id: string
          title: string
          description: string | null
          options: string[] // JSONB array of poll options
          created_by: string
          created_at: string
          expires_at: string | null
          is_active: boolean
          allow_multiple_votes: boolean
          is_public: boolean
          tags: string[] | null
          settings: Record<string, any> | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          options: string[]
          created_by: string
          created_at?: string
          expires_at?: string | null
          is_active?: boolean
          allow_multiple_votes?: boolean
          is_public?: boolean
          tags?: string[] | null
          settings?: Record<string, any> | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          options?: string[]
          created_by?: string
          created_at?: string
          expires_at?: string | null
          is_active?: boolean
          allow_multiple_votes?: boolean
          is_public?: boolean
          tags?: string[] | null
          settings?: Record<string, any> | null
        }
      }
      votes: {
        Row: {
          id: string
          poll_id: string
          user_id: string
          option_index: number
          voted_at: string
          user_agent: string | null
          ip_address: string | null
        }
        Insert: {
          id?: string
          poll_id: string
          user_id: string
          option_index: number
          voted_at?: string
          user_agent?: string | null
          ip_address?: string | null
        }
        Update: {
          id?: string
          poll_id?: string
          user_id?: string
          option_index?: number
          voted_at?: string
          user_agent?: string | null
          ip_address?: string | null
        }
      }
      poll_views: {
        Row: {
          id: string
          poll_id: string
          user_id: string | null
          viewed_at: string
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          poll_id: string
          user_id?: string | null
          viewed_at?: string
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          poll_id?: string
          user_id?: string | null
          viewed_at?: string
          referrer?: string | null
          user_agent?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_poll_results: {
        Args: { poll_uuid: string }
        Returns: { option_index: number; vote_count: number }[]
      }
      has_user_voted: {
        Args: { poll_uuid: string; user_uuid: string }
        Returns: boolean
      }
      get_user_polls: {
        Args: { user_uuid: string }
        Returns: {
          id: string
          title: string
          description: string | null
          options: string[]
          created_at: string
          expires_at: string | null
          is_active: boolean
          vote_count: number
        }[]
      }
      get_active_public_polls: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          title: string
          description: string | null
          options: string[]
          created_at: string
          expires_at: string | null
          vote_count: number
          creator_name: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for the application
export type Poll = Database['public']['Tables']['polls']['Row']
export type PollInsert = Database['public']['Tables']['polls']['Insert']
export type PollUpdate = Database['public']['Tables']['polls']['Update']

export type Vote = Database['public']['Tables']['votes']['Row']
export type VoteInsert = Database['public']['Tables']['votes']['Insert']
export type VoteUpdate = Database['public']['Tables']['votes']['Update']

export type PollView = Database['public']['Tables']['poll_views']['Row']
export type PollViewInsert = Database['public']['Tables']['poll_views']['Insert']
export type PollViewUpdate = Database['public']['Tables']['poll_views']['Update']

// Extended types for the application
export interface PollWithResults extends Poll {
  results: { option_index: number; vote_count: number }[]
  user_vote?: number | null
  has_voted: boolean
}

export interface PollSummary {
  id: string
  title: string
  description: string | null
  options: string[]
  created_at: string
  expires_at: string | null
  is_active: boolean
  vote_count: number
  creator_name?: string | null
}

export interface VoteData {
  poll_id: string
  option_index: number
  user_id: string
}

// Poll creation form data
export interface CreatePollData {
  title: string
  description?: string
  options: string[]
  expires_at?: Date
  is_public?: boolean
  allow_multiple_votes?: boolean
  tags?: string[]
  settings?: Record<string, any>
}

// Poll settings
export interface PollSettings {
  show_results_before_voting?: boolean
  require_authentication?: boolean
  allow_anonymous_votes?: boolean
  max_votes_per_user?: number
  custom_css?: string
  theme?: 'light' | 'dark' | 'auto'
}

// Analytics types
export interface PollAnalytics {
  total_views: number
  total_votes: number
  unique_voters: number
  vote_distribution: { option_index: number; percentage: number; count: number }[]
  views_over_time: { date: string; views: number }[]
  votes_over_time: { date: string; votes: number }[]
}
