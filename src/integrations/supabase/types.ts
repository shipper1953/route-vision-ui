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
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company: string | null
          country_code: string | null
          created_at: string | null
          email: string | null
          id: number
          is_default: boolean | null
          lat: number | null
          lon: number | null
          name: string | null
          phone: string | null
          postcode: string | null
          state: string | null
          user_id: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company?: string | null
          country_code?: string | null
          created_at?: string | null
          email?: string | null
          id?: never
          is_default?: boolean | null
          lat?: number | null
          lon?: number | null
          name?: string | null
          phone?: string | null
          postcode?: string | null
          state?: string | null
          user_id?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company?: string | null
          country_code?: string | null
          created_at?: string | null
          email?: string | null
          id?: never
          is_default?: boolean | null
          lat?: number | null
          lon?: number | null
          name?: string | null
          phone?: string | null
          postcode?: string | null
          state?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          id: number
          items: number | null
          order_date: string
          payment_status: string | null
          required_delivery_date: string | null
          shipping_address: string | null
          status: string | null
          value: number | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: number
          items?: number | null
          order_date: string
          payment_status?: string | null
          required_delivery_date?: string | null
          shipping_address?: string | null
          status?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: number
          items?: number | null
          order_date?: string
          payment_status?: string | null
          required_delivery_date?: string | null
          shipping_address?: string | null
          status?: string | null
          value?: number | null
        }
        Relationships: []
      }
      shipments: {
        Row: {
          actual_delivery_date: string | null
          carrier: string | null
          carrier_service: string | null
          created_at: string
          destination_address: string | null
          dimensions: Json | null
          easypost_id: string | null
          estimated_delivery_date: string | null
          id: number
          label_url: string | null
          order_id: number | null
          origin_address: string | null
          ship_date: string | null
          status: string | null
          tracking_number: string | null
          weight: number | null
        }
        Insert: {
          actual_delivery_date?: string | null
          carrier?: string | null
          carrier_service?: string | null
          created_at?: string
          destination_address?: string | null
          dimensions?: Json | null
          easypost_id?: string | null
          estimated_delivery_date?: string | null
          id?: number
          label_url?: string | null
          order_id?: number | null
          origin_address?: string | null
          ship_date?: string | null
          status?: string | null
          tracking_number?: string | null
          weight?: number | null
        }
        Update: {
          actual_delivery_date?: string | null
          carrier?: string | null
          carrier_service?: string | null
          created_at?: string
          destination_address?: string | null
          dimensions?: Json | null
          easypost_id?: string | null
          estimated_delivery_date?: string | null
          id?: number
          label_url?: string | null
          order_id?: number | null
          origin_address?: string | null
          ship_date?: string | null
          status?: string | null
          tracking_number?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_rates: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          carrier: string | null
          created_at: string
          delivery_days: number | null
          easypost_rate_id: string | null
          id: number
          rate: number | null
          service: string | null
          shipment_id: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          delivery_days?: number | null
          easypost_rate_id?: string | null
          id?: number
          rate?: number | null
          service?: string | null
          shipment_id?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string
          delivery_days?: number | null
          easypost_rate_id?: string | null
          id?: number
          rate?: number | null
          service?: string | null
          shipment_id?: string | null
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
