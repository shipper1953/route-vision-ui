export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          address: Json | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          markup_type: string | null
          markup_value: number | null
          name: string
          phone: string | null
          settings: Json | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          markup_type?: string | null
          markup_value?: number | null
          name: string
          phone?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          markup_type?: string | null
          markup_value?: number | null
          name?: string
          phone?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          company_id: string | null
          created_at: string | null
          customer_company: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: number
          items: Json
          order_date: string | null
          order_id: string
          qboid_dimensions: Json | null
          required_delivery_date: string | null
          shipment_id: number | null
          shipping_address: Json | null
          status: string | null
          user_id: string
          value: number
          warehouse_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: number
          items?: Json
          order_date?: string | null
          order_id: string
          qboid_dimensions?: Json | null
          required_delivery_date?: string | null
          shipment_id?: number | null
          shipping_address?: Json | null
          status?: string | null
          user_id: string
          value?: number
          warehouse_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: number
          items?: Json
          order_date?: string | null
          order_id?: string
          qboid_dimensions?: Json | null
          required_delivery_date?: string | null
          shipment_id?: number | null
          shipping_address?: Json | null
          status?: string | null
          user_id?: string
          value?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_orders_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_warehouse"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      qboid_events: {
        Row: {
          created_at: string | null
          data: Json
          event_type: string
          id: number
        }
        Insert: {
          created_at?: string | null
          data: Json
          event_type?: string
          id?: number
        }
        Update: {
          created_at?: string | null
          data?: Json
          event_type?: string
          id?: number
        }
        Relationships: []
      }
      shipments: {
        Row: {
          actual_delivery_date: string | null
          carrier: string
          company_id: string | null
          cost: number | null
          created_at: string | null
          easypost_id: string | null
          estimated_delivery_date: string | null
          id: number
          label_url: string | null
          package_dimensions: Json | null
          package_weights: Json | null
          rates: Json | null
          service: string
          smartrates: Json | null
          status: string
          tracking_number: string | null
          tracking_url: string | null
          user_id: string
          warehouse_id: string | null
          weight: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          carrier: string
          company_id?: string | null
          cost?: number | null
          created_at?: string | null
          easypost_id?: string | null
          estimated_delivery_date?: string | null
          id?: number
          label_url?: string | null
          package_dimensions?: Json | null
          package_weights?: Json | null
          rates?: Json | null
          service: string
          smartrates?: Json | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          user_id: string
          warehouse_id?: string | null
          weight?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          carrier?: string
          company_id?: string | null
          cost?: number | null
          created_at?: string | null
          easypost_id?: string | null
          estimated_delivery_date?: string | null
          id?: number
          label_url?: string | null
          package_dimensions?: Json | null
          package_weights?: Json | null
          rates?: Json | null
          service?: string
          smartrates?: Json | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          user_id?: string
          warehouse_id?: string | null
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_shipments_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_shipments_warehouse"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_rates: {
        Row: {
          base_rate: number
          carrier: string
          delivery_time: string | null
          dim_limit: Json | null
          id: number
          service: string
          shipment_id: number | null
          user_id: string | null
          weight_limit: number | null
        }
        Insert: {
          base_rate: number
          carrier: string
          delivery_time?: string | null
          dim_limit?: Json | null
          id?: number
          service: string
          shipment_id?: number | null
          user_id?: string | null
          weight_limit?: number | null
        }
        Update: {
          base_rate?: number
          carrier?: string
          delivery_time?: string | null
          dim_limit?: Json | null
          id?: number
          service?: string
          shipment_id?: number | null
          user_id?: string | null
          weight_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_wallet"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          company_id: string | null
          email: string
          id: string
          name: string
          password: string
          role: Database["public"]["Enums"]["app_role"] | null
          warehouse_ids: Json | null
        }
        Insert: {
          company_id?: string | null
          email: string
          id?: string
          name: string
          password: string
          role?: Database["public"]["Enums"]["app_role"] | null
          warehouse_ids?: Json | null
        }
        Update: {
          company_id?: string | null
          email?: string
          id?: string
          name?: string
          password?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          warehouse_ids?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number | null
          company_id: string
          created_at: string
          currency: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number | null
          company_id: string
          created_at?: string
          currency?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number | null
          company_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_wallets_company"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: Json
          company_id: string
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          address: Json
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          address?: Json
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_warehouses_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role: "super_admin" | "company_admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "company_admin", "user"],
    },
  },
} as const
