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
      addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string | null
          id: number
          postal_code: string
          state: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country: string
          created_at?: string | null
          id?: never
          postal_code: string
          state: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string | null
          id?: never
          postal_code?: string
          state?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          customer_company: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: number
          items: Json
          order_date: string | null
          order_id: number
          order_id_link: string | null
          qboid_dimensions: Json | null
          required_delivery_date: string | null
          shipment_id: number | null
          shipping_address: Json | null
          shipping_address_id: number | null
          status: string | null
          user_id: string | null
          value: number
        }
        Insert: {
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: never
          items: Json
          order_date?: string | null
          order_id: number
          order_id_link?: string | null
          qboid_dimensions?: Json | null
          required_delivery_date?: string | null
          shipment_id?: number | null
          shipping_address?: Json | null
          shipping_address_id?: number | null
          status?: string | null
          user_id?: string | null
          value: number
        }
        Update: {
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: never
          items?: Json
          order_date?: string | null
          order_id?: number
          order_id_link?: string | null
          qboid_dimensions?: Json | null
          required_delivery_date?: string | null
          shipment_id?: number | null
          shipping_address?: Json | null
          shipping_address_id?: number | null
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
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
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
      shipments: {
        Row: {
          actual_delivery_date: string | null
          carrier: string
          cost: number | null
          easypost_id: string | null
          easypost_shipment_id: string | null
          estimated_delivery_date: string | null
          id: number
          label_url: string | null
          order_id: number | null
          order_id_link: string | null
          package_dimensions: Json | null
          package_weights: Json | null
          service: string
          status: string
          tracking_number: string | null
          tracking_url: string | null
          user_id: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          carrier: string
          cost?: number | null
          easypost_id?: string | null
          easypost_shipment_id?: string | null
          estimated_delivery_date?: string | null
          id?: never
          label_url?: string | null
          order_id?: number | null
          order_id_link?: string | null
          package_dimensions?: Json | null
          package_weights?: Json | null
          service: string
          status: string
          tracking_number?: string | null
          tracking_url?: string | null
          user_id?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          carrier?: string
          cost?: number | null
          easypost_id?: string | null
          easypost_shipment_id?: string | null
          estimated_delivery_date?: string | null
          id?: never
          label_url?: string | null
          order_id?: number | null
          order_id_link?: string | null
          package_dimensions?: Json | null
          package_weights?: Json | null
          service?: string
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_user_id_fkey"
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
      user_profiles: {
        Row: {
          created_at: string | null
          id: number
          phone_number: string | null
          preferences: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: never
          phone_number?: string | null
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: never
          phone_number?: string | null
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
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
        }
        Insert: {
          email: string
          id?: string
          name: string
          password: string
          role: string
        }
        Update: {
          email?: string
          id?: string
          name?: string
          password?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
