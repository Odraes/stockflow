// AUTO-GENERATED from the live Supabase schema — do not edit by hand.
// Regenerate after every migration (Supabase MCP `generate_typescript_types`
// or `npx supabase gen types typescript --project-id <ref>`).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          location: string | null
          min_stock: number
          name: string
          quantity: number
          sku: string
          supplier_id: string | null
          unit: Database["public"]["Enums"]["stock_unit"]
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          min_stock?: number
          name: string
          quantity?: number
          sku: string
          supplier_id?: string | null
          unit: Database["public"]["Enums"]["stock_unit"]
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          min_stock?: number
          name?: string
          quantity?: number
          sku?: string
          supplier_id?: string | null
          unit?: Database["public"]["Enums"]["stock_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
      }
      stock_batches: {
        Row: {
          batch_number: string | null
          created_at: string
          created_by: string
          expiration_date: string | null
          id: string
          item_id: string
          received_at: string
          received_quantity: number
          remaining_quantity: number
          supplier_id: string | null
          unit_cost: number | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          created_by: string
          expiration_date?: string | null
          id?: string
          item_id: string
          received_at?: string
          received_quantity: number
          remaining_quantity: number
          supplier_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          created_by?: string
          expiration_date?: string | null
          id?: string
          item_id?: string
          received_at?: string
          received_quantity?: number
          remaining_quantity?: number
          supplier_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stock_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_id: string | null
          created_at: string
          id: string
          item_id: string
          note: string | null
          occurred_at: string
          operation_id: string
          previous_quantity: number
          quantity_change: number
          reason: string | null
          resulting_quantity: number
          supplier_id: string | null
          type: Database["public"]["Enums"]["movement_type"]
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          note?: string | null
          occurred_at?: string
          operation_id: string
          previous_quantity: number
          quantity_change: number
          reason?: string | null
          resulting_quantity: number
          supplier_id?: string | null
          type: Database["public"]["Enums"]["movement_type"]
          user_id: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          note?: string | null
          occurred_at?: string
          operation_id?: string
          previous_quantity?: number
          quantity_change?: number
          reason?: string | null
          resulting_quantity?: number
          supplier_id?: string | null
          type?: Database["public"]["Enums"]["movement_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stock_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      item_stock_overview: {
        Row: {
          category_id: string | null
          category_name: string | null
          created_at: string | null
          expired_quantity: number | null
          expiring_quantity: number | null
          id: string | null
          is_active: boolean | null
          location: string | null
          min_stock: number | null
          name: string | null
          next_expiration_date: string | null
          quantity: number | null
          sku: string | null
          stock_status: string | null
          supplier_id: string | null
          supplier_name: string | null
          unit: Database["public"]["Enums"]["stock_unit"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      adjust_stock: {
        Args: {
          p_expiration_date?: string
          p_item_id: string
          p_new_quantity: number
          p_note?: string
          p_reason: string
          p_unit: Database["public"]["Enums"]["stock_unit"]
        }
        Returns: {
          batch_id: string | null
          created_at: string
          id: string
          item_id: string
          note: string | null
          occurred_at: string
          operation_id: string
          previous_quantity: number
          quantity_change: number
          reason: string | null
          resulting_quantity: number
          supplier_id: string | null
          type: Database["public"]["Enums"]["movement_type"]
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          full_name: string
          id: string
          last_sign_in_at: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["account_status"]
        }[]
      }
      bootstrap_admin: {
        Args: { p_email: string }
        Returns: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: { allowed: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      is_active_user: { Args: never; Returns: boolean }
      near_expiry_days: { Args: never; Returns: number }
      receive_stock: {
        Args: {
          p_batch_number?: string
          p_expiration_date?: string
          p_item_id: string
          p_note?: string
          p_quantity: number
          p_received_at?: string
          p_supplier_id?: string
          p_total_cost?: number
          p_unit: Database["public"]["Enums"]["stock_unit"]
          p_unit_cost?: number
        }
        Returns: {
          batch_id: string | null
          created_at: string
          id: string
          item_id: string
          note: string | null
          occurred_at: string
          operation_id: string
          previous_quantity: number
          quantity_change: number
          reason: string | null
          resulting_quantity: number
          supplier_id: string | null
          type: Database["public"]["Enums"]["movement_type"]
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      record_usage: {
        Args: {
          p_item_id: string
          p_note?: string
          p_occurred_at?: string
          p_quantity: number
          p_reason?: string
          p_unit: Database["public"]["Enums"]["stock_unit"]
        }
        Returns: {
          batch_id: string | null
          created_at: string
          id: string
          item_id: string
          note: string | null
          occurred_at: string
          operation_id: string
          previous_quantity: number
          quantity_change: number
          reason: string | null
          resulting_quantity: number
          supplier_id: string | null
          type: Database["public"]["Enums"]["movement_type"]
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      record_wastage: {
        Args: {
          p_batch_id?: string
          p_item_id: string
          p_note?: string
          p_occurred_at?: string
          p_quantity: number
          p_reason: string
          p_unit: Database["public"]["Enums"]["stock_unit"]
        }
        Returns: {
          batch_id: string | null
          created_at: string
          id: string
          item_id: string
          note: string | null
          occurred_at: string
          operation_id: string
          previous_quantity: number
          quantity_change: number
          reason: string | null
          resulting_quantity: number
          supplier_id: string | null
          type: Database["public"]["Enums"]["movement_type"]
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_user_status: {
        Args: {
          p_status: Database["public"]["Enums"]["account_status"]
          p_user_id: string
        }
        Returns: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      account_status: "pending" | "active" | "disabled"
      app_role: "admin" | "manager" | "staff"
      movement_type: "receive" | "usage" | "wastage" | "adjustment"
      stock_unit: "g" | "ml" | "pcs"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["pending", "active", "disabled"],
      app_role: ["admin", "manager", "staff"],
      movement_type: ["receive", "usage", "wastage", "adjustment"],
      stock_unit: ["g", "ml", "pcs"],
    },
  },
} as const
