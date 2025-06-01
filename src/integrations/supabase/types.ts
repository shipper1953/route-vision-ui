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
      orders: {
        Row: {
          created_at: string | null
          customer_company: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: number
          items: Json
          order_date: string | null
          order_id: number
          qboid_dimensions: Json | null
          required_delivery_date: string | null
          shipment_id: number | null
          shipping_address: Json | null
          status: string | null
          user_id: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: never
          items: Json
          order_date?: string | null
          order_id?: number
          qboid_dimensions?: Json | null
          required_delivery_date?: string | null
          shipment_id?: number | null
          shipping_address?: Json | null
          status?: string | null
          user_id?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: never
          items?: Json
          order_date?: string | null
          order_id?: number
          qboid_dimensions?: Json | null
          required_delivery_date?: string | null
          shipment_id?: number | null
          shipping_address?: Json | null
          status?: string | null
          user_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      roles: {
        Row: {
          description: string | null
          id: number
          name: string
        }
        Insert: {
          description?: string | null
          id?: never
          name: string
        }
        Update: {
          description?: string | null
          id?: never
          name?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          actual_delivery_date: string | null
          carrier: string
          cost: number | null
          created_at: string | null
          easypost_id: string | null
          easypost_shipment_id: string | null
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
          user_id: string | null
          weight: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          carrier: string
          cost?: number | null
          created_at?: string | null
          easypost_id?: string | null
          easypost_shipment_id?: string | null
          estimated_delivery_date?: string | null
          id?: number
          label_url?: string | null
          package_dimensions?: Json | null
          package_weights?: Json | null
          rates?: Json | null
          service: string
          smartrates?: Json | null
          status: string
          tracking_number?: string | null
          tracking_url?: string | null
          user_id?: string | null
          weight?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          carrier?: string
          cost?: number | null
          created_at?: string | null
          easypost_id?: string | null
          easypost_shipment_id?: string | null
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
          user_id?: string | null
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          id?: never
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
          id?: never
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
          {
            foreignKeyName: "shipping_rates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          email: string
          id: string
          name: string
          password: string
          role: string
          role_id: number | null
        }
        Insert: {
          email: string
          id?: string
          name: string
          password: string
          role: string
          role_id?: number | null
        }
        Update: {
          email?: string
          id?: string
          name?: string
          password?: string
          role?: string
          role_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_role"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
        ]
      }
    }
    Views: {
      hypopg_hidden_indexes: {
        Row: {
          am_name: unknown | null
          index_name: unknown | null
          indexrelid: unknown | null
          is_hypo: boolean | null
          schema_name: unknown | null
          table_name: unknown | null
        }
        Relationships: []
      }
      hypopg_list_indexes: {
        Row: {
          am_name: unknown | null
          index_name: string | null
          indexrelid: unknown | null
          schema_name: unknown | null
          table_name: unknown | null
        }
        Relationships: []
      }
    }
    Functions: {
      hypopg: {
        Args: Record<PropertyKey, never>
        Returns: Record<string, unknown>[]
      }
      hypopg_create_index: {
        Args: { sql_order: string }
        Returns: Record<string, unknown>[]
      }
      hypopg_drop_index: {
        Args: { indexid: unknown }
        Returns: boolean
      }
      hypopg_get_indexdef: {
        Args: { indexid: unknown }
        Returns: string
      }
      hypopg_hidden_indexes: {
        Args: Record<PropertyKey, never>
        Returns: {
          indexid: unknown
        }[]
      }
      hypopg_hide_index: {
        Args: { indexid: unknown }
        Returns: boolean
      }
      hypopg_relation_size: {
        Args: { indexid: unknown }
        Returns: number
      }
      hypopg_reset: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      hypopg_reset_index: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      hypopg_unhide_all_indexes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      hypopg_unhide_index: {
        Args: { indexid: unknown }
        Returns: boolean
      }
      index_advisor: {
        Args: { query: string }
        Returns: {
          startup_cost_before: Json
          startup_cost_after: Json
          total_cost_before: Json
          total_cost_after: Json
          index_statements: string[]
          errors: string[]
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
