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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          company_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      boxes: {
        Row: {
          box_type: Database["public"]["Enums"]["box_type"]
          company_id: string
          cost: number
          created_at: string
          description: string | null
          height: number
          id: string
          in_stock: number
          is_active: boolean
          length: number
          max_stock: number
          max_weight: number
          min_stock: number
          name: string
          sku: string | null
          updated_at: string
          width: number
        }
        Insert: {
          box_type?: Database["public"]["Enums"]["box_type"]
          company_id: string
          cost?: number
          created_at?: string
          description?: string | null
          height: number
          id?: string
          in_stock?: number
          is_active?: boolean
          length: number
          max_stock?: number
          max_weight: number
          min_stock?: number
          name: string
          sku?: string | null
          updated_at?: string
          width: number
        }
        Update: {
          box_type?: Database["public"]["Enums"]["box_type"]
          company_id?: string
          cost?: number
          created_at?: string
          description?: string | null
          height?: number
          id?: string
          in_stock?: number
          is_active?: boolean
          length?: number
          max_stock?: number
          max_weight?: number
          min_stock?: number
          name?: string
          sku?: string | null
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "boxes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
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
          stripe_customer_id: string | null
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
          stripe_customer_id?: string | null
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
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_processing_times: {
        Row: {
          company_id: string
          created_at: string | null
          cutoff_time: string | null
          holiday_processing: boolean | null
          id: string
          standard_processing_days: number | null
          updated_at: string | null
          warehouse_id: string | null
          weekend_processing: boolean | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          cutoff_time?: string | null
          holiday_processing?: boolean | null
          id?: string
          standard_processing_days?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
          weekend_processing?: boolean | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          cutoff_time?: string | null
          holiday_processing?: boolean | null
          id?: string
          standard_processing_days?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
          weekend_processing?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "company_processing_times_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_processing_times_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      company_shipping_prefs: {
        Row: {
          carrier_whitelist: string[] | null
          company_id: string
          created_at: string
          delivery_confidence: number
          id: string
          max_transit_days: number | null
          optimize_objective: string
          service_blacklist: string[] | null
          sla_preference: string
          updated_at: string
        }
        Insert: {
          carrier_whitelist?: string[] | null
          company_id: string
          created_at?: string
          delivery_confidence?: number
          id?: string
          max_transit_days?: number | null
          optimize_objective?: string
          service_blacklist?: string[] | null
          sla_preference?: string
          updated_at?: string
        }
        Update: {
          carrier_whitelist?: string[] | null
          company_id?: string
          created_at?: string
          delivery_confidence?: number
          id?: string
          max_transit_days?: number | null
          optimize_objective?: string
          service_blacklist?: string[] | null
          sla_preference?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_delivery_preferences: {
        Row: {
          access_code: string | null
          company_id: string | null
          created_at: string | null
          customer_email: string
          delivery_instructions: string | null
          email_notifications: boolean | null
          gate_code: string | null
          id: string
          phone_number: string | null
          preferred_delivery_window: string | null
          safe_place: string | null
          signature_required: boolean | null
          sms_notifications: boolean | null
          updated_at: string | null
          vacation_hold_end: string | null
          vacation_hold_start: string | null
        }
        Insert: {
          access_code?: string | null
          company_id?: string | null
          created_at?: string | null
          customer_email: string
          delivery_instructions?: string | null
          email_notifications?: boolean | null
          gate_code?: string | null
          id?: string
          phone_number?: string | null
          preferred_delivery_window?: string | null
          safe_place?: string | null
          signature_required?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string | null
          vacation_hold_end?: string | null
          vacation_hold_start?: string | null
        }
        Update: {
          access_code?: string | null
          company_id?: string | null
          created_at?: string | null
          customer_email?: string
          delivery_instructions?: string | null
          email_notifications?: boolean | null
          gate_code?: string | null
          id?: string
          phone_number?: string | null
          preferred_delivery_window?: string | null
          safe_place?: string | null
          signature_required?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string | null
          vacation_hold_end?: string | null
          vacation_hold_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_delivery_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notifications: {
        Row: {
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          notification_type: string
          order_id: number | null
          recipient: string
          sent_at: string | null
          shipment_id: number | null
          status: string
        }
        Insert: {
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          order_id?: number | null
          recipient: string
          sent_at?: string | null
          shipment_id?: number | null
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          order_id?: number | null
          recipient?: string
          sent_at?: string | null
          shipment_id?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notifications_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: Json | null
          code: string | null
          company_id: string
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
          address?: Json | null
          code?: string | null
          company_id: string
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
          address?: Json | null
          code?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_policy_versions: {
        Row: {
          company_id: string
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          policy_type: string
          updated_at: string
          version_number: number
        }
        Insert: {
          company_id: string
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          policy_type: string
          updated_at?: string
          version_number?: number
        }
        Update: {
          company_id?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          policy_type?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "decision_policy_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category: string
          company_id: string
          created_at: string
          customer_id: string | null
          dimensions_updated_at: string | null
          height: number
          id: string
          is_active: boolean
          length: number
          name: string
          shopify_product_gid: string | null
          shopify_product_id: string | null
          shopify_store_id: string | null
          shopify_variant_gid: string | null
          shopify_variant_id: string | null
          sku: string
          updated_at: string
          weight: number
          width: number
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          customer_id?: string | null
          dimensions_updated_at?: string | null
          height: number
          id?: string
          is_active?: boolean
          length: number
          name: string
          shopify_product_gid?: string | null
          shopify_product_id?: string | null
          shopify_store_id?: string | null
          shopify_variant_gid?: string | null
          shopify_variant_id?: string | null
          sku: string
          updated_at?: string
          weight: number
          width: number
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          customer_id?: string | null
          dimensions_updated_at?: string | null
          height?: number
          id?: string
          is_active?: boolean
          length?: number
          name?: string
          shopify_product_gid?: string | null
          shopify_product_id?: string | null
          shopify_store_id?: string | null
          shopify_variant_gid?: string | null
          shopify_variant_id?: string | null
          sku?: string
          updated_at?: string
          weight?: number
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_shopify_store_id_fkey"
            columns: ["shopify_store_id"]
            isOneToOne: false
            referencedRelation: "shopify_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_cartonization: {
        Row: {
          algorithm_version: string | null
          box_weight: number | null
          calculation_timestamp: string | null
          confidence: number | null
          created_at: string | null
          id: string
          items_weight: number | null
          optimization_objective: string | null
          order_id: number
          packages: Json | null
          policy_version_id: string | null
          recommended_box_data: Json | null
          recommended_box_id: string | null
          rejected_candidates: Json | null
          score_breakdown: Json | null
          splitting_strategy: string | null
          total_packages: number | null
          total_weight: number | null
          updated_at: string | null
          utilization: number | null
        }
        Insert: {
          algorithm_version?: string | null
          box_weight?: number | null
          calculation_timestamp?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          items_weight?: number | null
          optimization_objective?: string | null
          order_id: number
          packages?: Json | null
          policy_version_id?: string | null
          recommended_box_data?: Json | null
          recommended_box_id?: string | null
          rejected_candidates?: Json | null
          score_breakdown?: Json | null
          splitting_strategy?: string | null
          total_packages?: number | null
          total_weight?: number | null
          updated_at?: string | null
          utilization?: number | null
        }
        Update: {
          algorithm_version?: string | null
          box_weight?: number | null
          calculation_timestamp?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          items_weight?: number | null
          optimization_objective?: string | null
          order_id?: number
          packages?: Json | null
          policy_version_id?: string | null
          recommended_box_data?: Json | null
          recommended_box_id?: string | null
          rejected_candidates?: Json | null
          score_breakdown?: Json | null
          splitting_strategy?: string | null
          total_packages?: number | null
          total_weight?: number | null
          updated_at?: string | null
          utilization?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_cartonization_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cartonization_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "decision_policy_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cartonization_recommended_box_id_fkey"
            columns: ["recommended_box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      order_packaging_recommendations: {
        Row: {
          calculated_volume: number | null
          calculated_weight: number | null
          confidence_score: number | null
          created_at: string
          id: string
          order_id: number
          potential_savings: number | null
          recommended_billable_weight: number | null
          recommended_master_list_id: string | null
          updated_at: string
        }
        Insert: {
          calculated_volume?: number | null
          calculated_weight?: number | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          order_id: number
          potential_savings?: number | null
          recommended_billable_weight?: number | null
          recommended_master_list_id?: string | null
          updated_at?: string
        }
        Update: {
          calculated_volume?: number | null
          calculated_weight?: number | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          order_id?: number
          potential_savings?: number | null
          recommended_billable_weight?: number | null
          recommended_master_list_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_packaging_recommendations_recommended_master_list_id_fkey"
            columns: ["recommended_master_list_id"]
            isOneToOne: false
            referencedRelation: "packaging_master_list"
            referencedColumns: ["id"]
          },
        ]
      }
      order_shipments: {
        Row: {
          created_at: string | null
          id: string
          order_id: number
          package_index: number
          package_info: Json | null
          shipment_id: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: number
          package_index?: number
          package_info?: Json | null
          shipment_id: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: number
          package_index?: number
          package_info?: Json | null
          shipment_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_shipments_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actual_delivery_date: string | null
          company_id: string | null
          created_at: string | null
          customer_company: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          estimated_delivery_date: string | null
          fulfillment_percentage: number | null
          fulfillment_status: string | null
          id: number
          items: Json
          items_shipped: number | null
          items_total: number | null
          order_date: string | null
          order_id: string
          qboid_dimensions: Json | null
          required_delivery_date: string | null
          shipment_id: number | null
          shipping_address: Json | null
          shopify_store_id: string | null
          status: string | null
          user_id: string | null
          value: number
          warehouse_id: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          company_id?: string | null
          created_at?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          estimated_delivery_date?: string | null
          fulfillment_percentage?: number | null
          fulfillment_status?: string | null
          id?: number
          items?: Json
          items_shipped?: number | null
          items_total?: number | null
          order_date?: string | null
          order_id: string
          qboid_dimensions?: Json | null
          required_delivery_date?: string | null
          shipment_id?: number | null
          shipping_address?: Json | null
          shopify_store_id?: string | null
          status?: string | null
          user_id?: string | null
          value?: number
          warehouse_id?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          company_id?: string | null
          created_at?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          estimated_delivery_date?: string | null
          fulfillment_percentage?: number | null
          fulfillment_status?: string | null
          id?: number
          items?: Json
          items_shipped?: number | null
          items_total?: number | null
          order_date?: string | null
          order_id?: string
          qboid_dimensions?: Json | null
          required_delivery_date?: string | null
          shipment_id?: number | null
          shipping_address?: Json | null
          shopify_store_id?: string | null
          status?: string | null
          user_id?: string | null
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
          {
            foreignKeyName: "orders_shopify_store_id_fkey"
            columns: ["shopify_store_id"]
            isOneToOne: false
            referencedRelation: "shopify_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string | null
          description: string | null
          freight_class: number | null
          height: number
          id: string
          length: number
          nmfc_code: string | null
          shipment_id: number | null
          weight: number
          width: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          freight_class?: number | null
          height: number
          id?: string
          length: number
          nmfc_code?: string | null
          shipment_id?: number | null
          weight: number
          width: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          freight_class?: number | null
          height?: number
          id?: string
          length?: number
          nmfc_code?: string | null
          shipment_id?: number | null
          weight?: number
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "packages_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_alerts: {
        Row: {
          alert_type: string
          company_id: string
          created_at: string
          id: string
          is_resolved: boolean
          message: string
          metadata: Json | null
          severity: string
        }
        Insert: {
          alert_type: string
          company_id: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          message: string
          metadata?: Json | null
          severity?: string
        }
        Update: {
          alert_type?: string
          company_id?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          message?: string
          metadata?: Json | null
          severity?: string
        }
        Relationships: []
      }
      packaging_intelligence_reports: {
        Row: {
          analysis_period: string
          company_id: string
          generated_at: string
          id: string
          inventory_suggestions: Json
          potential_savings: number
          projected_packaging_need: Json
          report_data: Json
          top_5_box_discrepancies: Json
          top_5_most_used_boxes: Json
          total_orders_analyzed: number
        }
        Insert: {
          analysis_period?: string
          company_id: string
          generated_at?: string
          id?: string
          inventory_suggestions?: Json
          potential_savings?: number
          projected_packaging_need?: Json
          report_data?: Json
          top_5_box_discrepancies?: Json
          top_5_most_used_boxes?: Json
          total_orders_analyzed?: number
        }
        Update: {
          analysis_period?: string
          company_id?: string
          generated_at?: string
          id?: string
          inventory_suggestions?: Json
          potential_savings?: number
          projected_packaging_need?: Json
          report_data?: Json
          top_5_box_discrepancies?: Json
          top_5_most_used_boxes?: Json
          total_orders_analyzed?: number
        }
        Relationships: []
      }
      packaging_inventory: {
        Row: {
          company_id: string
          created_at: string
          id: string
          master_list_id: string
          quantity_on_hand: number
          reorder_quantity: number
          reorder_threshold: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          master_list_id: string
          quantity_on_hand?: number
          reorder_quantity?: number
          reorder_threshold?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          master_list_id?: string
          quantity_on_hand?: number
          reorder_quantity?: number
          reorder_threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packaging_inventory_master_list_id_fkey"
            columns: ["master_list_id"]
            isOneToOne: false
            referencedRelation: "packaging_master_list"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_master_list: {
        Row: {
          cost: number
          created_at: string
          height_in: number
          id: string
          is_active: boolean
          length_in: number
          name: string
          type: string
          updated_at: string
          vendor: string
          vendor_sku: string
          weight_oz: number
          width_in: number
        }
        Insert: {
          cost?: number
          created_at?: string
          height_in: number
          id?: string
          is_active?: boolean
          length_in: number
          name: string
          type: string
          updated_at?: string
          vendor?: string
          vendor_sku: string
          weight_oz?: number
          width_in: number
        }
        Update: {
          cost?: number
          created_at?: string
          height_in?: number
          id?: string
          is_active?: boolean
          length_in?: number
          name?: string
          type?: string
          updated_at?: string
          vendor?: string
          vendor_sku?: string
          weight_oz?: number
          width_in?: number
        }
        Relationships: []
      }
      pick_list_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          location_id: string | null
          lot_number: string | null
          pick_list_id: string
          picked_at: string | null
          quantity_ordered: number
          quantity_picked: number
          serial_number: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          location_id?: string | null
          lot_number?: string | null
          pick_list_id: string
          picked_at?: string | null
          quantity_ordered?: number
          quantity_picked?: number
          serial_number?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          location_id?: string | null
          lot_number?: string | null
          pick_list_id?: string
          picked_at?: string | null
          quantity_ordered?: number
          quantity_picked?: number
          serial_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pick_list_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_list_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_list_items_pick_list_id_fkey"
            columns: ["pick_list_id"]
            isOneToOne: false
            referencedRelation: "pick_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      pick_lists: {
        Row: {
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: number
          started_at: string | null
          status: string
          warehouse_id: string
          wave_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id: number
          started_at?: string | null
          status?: string
          warehouse_id: string
          wave_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: number
          started_at?: string | null
          status?: string
          warehouse_id?: string
          wave_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pick_lists_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_lists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_lists_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_lists_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_lists_wave_id_fkey"
            columns: ["wave_id"]
            isOneToOne: false
            referencedRelation: "pick_waves"
            referencedColumns: ["id"]
          },
        ]
      }
      pick_waves: {
        Row: {
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          priority: number | null
          released_at: string | null
          started_at: string | null
          status: string
          total_orders: number | null
          total_picks: number | null
          warehouse_id: string
          wave_number: string
          wave_type: string
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          priority?: number | null
          released_at?: string | null
          started_at?: string | null
          status?: string
          total_orders?: number | null
          total_picks?: number | null
          warehouse_id: string
          wave_number: string
          wave_type?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          priority?: number | null
          released_at?: string | null
          started_at?: string | null
          status?: string
          total_orders?: number | null
          total_picks?: number | null
          warehouse_id?: string
          wave_number?: string
          wave_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pick_waves_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_waves_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_waves_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      po_line_items: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          metadata: Json | null
          po_id: string
          product_name: string
          quantity_ordered: number
          quantity_received: number
          shopify_line_item_id: string | null
          sku: string
          unit_cost: number | null
          uom: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          metadata?: Json | null
          po_id: string
          product_name: string
          quantity_ordered?: number
          quantity_received?: number
          shopify_line_item_id?: string | null
          sku: string
          unit_cost?: number | null
          uom?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          metadata?: Json | null
          po_id?: string
          product_name?: string
          quantity_ordered?: number
          quantity_received?: number
          shopify_line_item_id?: string | null
          sku?: string
          unit_cost?: number | null
          uom?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_line_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_line_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string | null
          expected_date: string | null
          id: string
          metadata: Json | null
          notes: string | null
          po_number: string
          shopify_destination_location_id: string | null
          shopify_destination_location_name: string | null
          shopify_po_id: string | null
          shopify_store_id: string | null
          source_type: string | null
          status: string
          updated_at: string
          vendor_id: string | null
          vendor_name: string | null
          warehouse_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id?: string | null
          expected_date?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          po_number: string
          shopify_destination_location_id?: string | null
          shopify_destination_location_name?: string | null
          shopify_po_id?: string | null
          shopify_store_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
          warehouse_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string | null
          expected_date?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          po_number?: string
          shopify_destination_location_id?: string | null
          shopify_destination_location_name?: string | null
          shopify_po_id?: string | null
          shopify_store_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_shopify_store_id_fkey"
            columns: ["shopify_store_id"]
            isOneToOne: false
            referencedRelation: "shopify_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
      receiving_line_items: {
        Row: {
          condition: string
          created_at: string
          id: string
          item_id: string
          lot_number: string | null
          notes: string | null
          po_line_id: string
          qc_passed: boolean | null
          qc_required: boolean | null
          quantity_received: number
          received_at: string
          received_by: string | null
          serial_numbers: string[] | null
          session_id: string
          uom: string
        }
        Insert: {
          condition?: string
          created_at?: string
          id?: string
          item_id: string
          lot_number?: string | null
          notes?: string | null
          po_line_id: string
          qc_passed?: boolean | null
          qc_required?: boolean | null
          quantity_received?: number
          received_at?: string
          received_by?: string | null
          serial_numbers?: string[] | null
          session_id: string
          uom?: string
        }
        Update: {
          condition?: string
          created_at?: string
          id?: string
          item_id?: string
          lot_number?: string | null
          notes?: string | null
          po_line_id?: string
          qc_passed?: boolean | null
          qc_required?: boolean | null
          quantity_received?: number
          received_at?: string
          received_by?: string | null
          serial_numbers?: string[] | null
          session_id?: string
          uom?: string
        }
        Relationships: [
          {
            foreignKeyName: "receiving_line_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_line_items_po_line_id_fkey"
            columns: ["po_line_id"]
            isOneToOne: false
            referencedRelation: "po_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_line_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "receiving_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_sessions: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          paused_at: string | null
          po_id: string
          session_number: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
          warehouse_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paused_at?: string | null
          po_id: string
          session_number: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
          warehouse_id: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paused_at?: string | null
          po_id?: string
          session_number?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receiving_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_sessions_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_sessions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      service_mappings: {
        Row: {
          carrier: string
          created_at: string
          id: string
          normalized_service: string
          provider: string
          service_code: string
          speed_rank: number
          updated_at: string
        }
        Insert: {
          carrier: string
          created_at?: string
          id?: string
          normalized_service: string
          provider: string
          service_code: string
          speed_rank: number
          updated_at?: string
        }
        Update: {
          carrier?: string
          created_at?: string
          id?: string
          normalized_service?: string
          provider?: string
          service_code?: string
          speed_rank?: number
          updated_at?: string
        }
        Relationships: []
      }
      shipment_decisions: {
        Row: {
          algorithm_version: string
          company_id: string
          confidence: number | null
          created_at: string
          created_by: string | null
          decision_type: string
          degraded_mode: boolean
          degraded_providers: string[] | null
          explanation: Json | null
          id: string
          inputs_json: Json
          order_id: number | null
          outputs_json: Json
          overridden: boolean
          override_category: string | null
          override_reason: string | null
          policy_version_id: string | null
          processing_time_ms: number | null
          reason_code: string | null
          shipment_id: number | null
        }
        Insert: {
          algorithm_version?: string
          company_id: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          decision_type: string
          degraded_mode?: boolean
          degraded_providers?: string[] | null
          explanation?: Json | null
          id?: string
          inputs_json?: Json
          order_id?: number | null
          outputs_json?: Json
          overridden?: boolean
          override_category?: string | null
          override_reason?: string | null
          policy_version_id?: string | null
          processing_time_ms?: number | null
          reason_code?: string | null
          shipment_id?: number | null
        }
        Update: {
          algorithm_version?: string
          company_id?: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          decision_type?: string
          degraded_mode?: boolean
          degraded_providers?: string[] | null
          explanation?: Json | null
          id?: string
          inputs_json?: Json
          order_id?: number | null
          outputs_json?: Json
          overridden?: boolean
          override_category?: string | null
          override_reason?: string | null
          policy_version_id?: string | null
          processing_time_ms?: number | null
          reason_code?: string | null
          shipment_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_decisions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_decisions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_decisions_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "decision_policy_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_decisions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_override_reasons: {
        Row: {
          applies_to: string
          code: string
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          updated_at: string
        }
        Insert: {
          applies_to?: string
          code: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          applies_to?: string
          code?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_override_reasons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_quotes: {
        Row: {
          carrier: string
          carrier_quote_id: string | null
          created_at: string | null
          details: Json | null
          estimated_days: number | null
          id: string
          is_selected: boolean | null
          quote_type: string | null
          rate: number
          service: string
          shipment_id: number | null
        }
        Insert: {
          carrier: string
          carrier_quote_id?: string | null
          created_at?: string | null
          details?: Json | null
          estimated_days?: number | null
          id?: string
          is_selected?: boolean | null
          quote_type?: string | null
          rate: number
          service: string
          shipment_id?: number | null
        }
        Update: {
          carrier?: string
          carrier_quote_id?: string | null
          created_at?: string | null
          details?: Json | null
          estimated_days?: number | null
          id?: string
          is_selected?: boolean | null
          quote_type?: string | null
          rate?: number
          service?: string
          shipment_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_quotes_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          actual_delivery_date: string | null
          actual_package_master_id: string | null
          actual_package_sku: string | null
          carrier: string
          company_id: string | null
          cost: number | null
          created_at: string | null
          easypost_id: string | null
          estimated_delivery_date: string | null
          from_address: Json | null
          id: number
          label_url: string | null
          label_zpl: string | null
          original_cost: number | null
          package_count: number | null
          package_dimensions: Json | null
          package_weights: Json | null
          rates: Json | null
          service: string
          smartrates: Json | null
          status: string
          to_address: Json | null
          total_weight: number | null
          tracking_number: string | null
          tracking_url: string | null
          user_id: string
          warehouse_id: string | null
          weight: string | null
          zpl_label: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          actual_package_master_id?: string | null
          actual_package_sku?: string | null
          carrier: string
          company_id?: string | null
          cost?: number | null
          created_at?: string | null
          easypost_id?: string | null
          estimated_delivery_date?: string | null
          from_address?: Json | null
          id?: number
          label_url?: string | null
          label_zpl?: string | null
          original_cost?: number | null
          package_count?: number | null
          package_dimensions?: Json | null
          package_weights?: Json | null
          rates?: Json | null
          service: string
          smartrates?: Json | null
          status?: string
          to_address?: Json | null
          total_weight?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          user_id: string
          warehouse_id?: string | null
          weight?: string | null
          zpl_label?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          actual_package_master_id?: string | null
          actual_package_sku?: string | null
          carrier?: string
          company_id?: string | null
          cost?: number | null
          created_at?: string | null
          easypost_id?: string | null
          estimated_delivery_date?: string | null
          from_address?: Json | null
          id?: number
          label_url?: string | null
          label_zpl?: string | null
          original_cost?: number | null
          package_count?: number | null
          package_dimensions?: Json | null
          package_weights?: Json | null
          rates?: Json | null
          service?: string
          smartrates?: Json | null
          status?: string
          to_address?: Json | null
          total_weight?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          user_id?: string
          warehouse_id?: string | null
          weight?: string | null
          zpl_label?: string | null
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
          {
            foreignKeyName: "shipments_actual_package_master_id_fkey"
            columns: ["actual_package_master_id"]
            isOneToOne: false
            referencedRelation: "boxes"
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
      shipping_rules: {
        Row: {
          actions: Json
          company_id: string
          conditions: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          priority: number
          updated_at: string
        }
        Insert: {
          actions?: Json
          company_id: string
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          updated_at?: string
        }
        Update: {
          actions?: Json
          company_id?: string
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      shopify_fulfillment_orders: {
        Row: {
          assigned_at: string | null
          assigned_location_id: string | null
          company_id: string
          created_at: string | null
          destination: Json | null
          fulfilled_at: string | null
          fulfillment_id: string | null
          fulfillment_order_id: string
          fulfillment_order_number: string | null
          id: string
          line_items: Json
          metadata: Json | null
          request_status: string | null
          ship_tornado_order_id: number | null
          shopify_order_id: string
          shopify_store_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_location_id?: string | null
          company_id: string
          created_at?: string | null
          destination?: Json | null
          fulfilled_at?: string | null
          fulfillment_id?: string | null
          fulfillment_order_id: string
          fulfillment_order_number?: string | null
          id?: string
          line_items?: Json
          metadata?: Json | null
          request_status?: string | null
          ship_tornado_order_id?: number | null
          shopify_order_id: string
          shopify_store_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_location_id?: string | null
          company_id?: string
          created_at?: string | null
          destination?: Json | null
          fulfilled_at?: string | null
          fulfillment_id?: string | null
          fulfillment_order_id?: string
          fulfillment_order_number?: string | null
          id?: string
          line_items?: Json
          metadata?: Json | null
          request_status?: string | null
          ship_tornado_order_id?: number | null
          shopify_order_id?: string
          shopify_store_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_fulfillment_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_fulfillment_orders_ship_tornado_order_id_fkey"
            columns: ["ship_tornado_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_fulfillment_orders_shopify_store_id_fkey"
            columns: ["shopify_store_id"]
            isOneToOne: false
            referencedRelation: "shopify_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_order_mappings: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          last_synced_at: string | null
          metadata: Json | null
          ship_tornado_order_id: number
          shopify_order_id: string
          shopify_order_number: string | null
          shopify_store_id: string | null
          sync_status: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          ship_tornado_order_id: number
          shopify_order_id: string
          shopify_order_number?: string | null
          shopify_store_id?: string | null
          sync_status?: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          ship_tornado_order_id?: number
          shopify_order_id?: string
          shopify_order_number?: string | null
          shopify_store_id?: string | null
          sync_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_order_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_order_mappings_ship_tornado_order_id_fkey"
            columns: ["ship_tornado_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_order_mappings_shopify_store_id_fkey"
            columns: ["shopify_store_id"]
            isOneToOne: false
            referencedRelation: "shopify_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_po_mappings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          last_synced_at: string | null
          metadata: Json | null
          ship_tornado_po_id: string
          shopify_po_id: string
          shopify_po_number: string | null
          shopify_store_id: string
          source_type: string
          sync_status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          ship_tornado_po_id: string
          shopify_po_id: string
          shopify_po_number?: string | null
          shopify_store_id: string
          source_type?: string
          sync_status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          ship_tornado_po_id?: string
          shopify_po_id?: string
          shopify_po_number?: string | null
          shopify_store_id?: string
          source_type?: string
          sync_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_po_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_po_mappings_ship_tornado_po_id_fkey"
            columns: ["ship_tornado_po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_po_mappings_shopify_store_id_fkey"
            columns: ["shopify_store_id"]
            isOneToOne: false
            referencedRelation: "shopify_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_stores: {
        Row: {
          access_token: string
          company_id: string
          connected_at: string | null
          created_at: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_reference: string | null
          fulfillment_location_id: string | null
          fulfillment_location_name: string | null
          fulfillment_service_id: string | null
          fulfillment_service_location_id: string | null
          fulfillment_sync_enabled: boolean
          id: string
          inventory_sync_enabled: boolean
          is_active: boolean | null
          last_sync_at: string | null
          oauth_state: string | null
          product_sync_enabled: boolean
          settings: Json | null
          store_name: string | null
          store_url: string
          updated_at: string | null
          webhook_secret: string | null
        }
        Insert: {
          access_token: string
          company_id: string
          connected_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_reference?: string | null
          fulfillment_location_id?: string | null
          fulfillment_location_name?: string | null
          fulfillment_service_id?: string | null
          fulfillment_service_location_id?: string | null
          fulfillment_sync_enabled?: boolean
          id?: string
          inventory_sync_enabled?: boolean
          is_active?: boolean | null
          last_sync_at?: string | null
          oauth_state?: string | null
          product_sync_enabled?: boolean
          settings?: Json | null
          store_name?: string | null
          store_url: string
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Update: {
          access_token?: string
          company_id?: string
          connected_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_reference?: string | null
          fulfillment_location_id?: string | null
          fulfillment_location_name?: string | null
          fulfillment_service_id?: string | null
          fulfillment_service_location_id?: string | null
          fulfillment_sync_enabled?: boolean
          id?: string
          inventory_sync_enabled?: boolean
          is_active?: boolean | null
          last_sync_at?: string | null
          oauth_state?: string | null
          product_sync_enabled?: boolean
          settings?: Json | null
          store_name?: string | null
          store_url?: string
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_stores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_stores_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_sync_logs: {
        Row: {
          company_id: string
          created_at: string | null
          direction: string
          error_message: string | null
          id: string
          metadata: Json | null
          ship_tornado_order_id: number | null
          shopify_order_id: string | null
          shopify_store_id: string | null
          status: string
          sync_type: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          direction: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          ship_tornado_order_id?: number | null
          shopify_order_id?: string | null
          shopify_store_id?: string | null
          status: string
          sync_type: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          direction?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          ship_tornado_order_id?: number | null
          shopify_order_id?: string | null
          shopify_store_id?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_sync_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_sync_logs_shopify_store_id_fkey"
            columns: ["shopify_store_id"]
            isOneToOne: false
            referencedRelation: "shopify_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_packaging_policies: {
        Row: {
          company_id: string
          created_at: string
          custom_rules: Json | null
          fragility_rules: Json | null
          id: string
          is_active: boolean
          max_void_ratio: number | null
          optimization_objective: string
          policy_version_id: string | null
          tie_breaker_order: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          custom_rules?: Json | null
          fragility_rules?: Json | null
          id?: string
          is_active?: boolean
          max_void_ratio?: number | null
          optimization_objective?: string
          policy_version_id?: string | null
          tie_breaker_order?: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          custom_rules?: Json | null
          fragility_rules?: Json | null
          id?: string
          is_active?: boolean
          max_void_ratio?: number | null
          optimization_objective?: string
          policy_version_id?: string | null
          tie_breaker_order?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_packaging_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_packaging_policies_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "decision_policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_rate_policies: {
        Row: {
          allowed_carriers: string[] | null
          company_id: string
          created_at: string
          denied_services: string[] | null
          id: string
          insurance_threshold: number | null
          is_active: boolean
          max_transit_days: number | null
          min_ontime_score: number | null
          policy_version_id: string | null
          preferred_objective: string
          signature_threshold: number | null
          updated_at: string
        }
        Insert: {
          allowed_carriers?: string[] | null
          company_id: string
          created_at?: string
          denied_services?: string[] | null
          id?: string
          insurance_threshold?: number | null
          is_active?: boolean
          max_transit_days?: number | null
          min_ontime_score?: number | null
          policy_version_id?: string | null
          preferred_objective?: string
          signature_threshold?: number | null
          updated_at?: string
        }
        Update: {
          allowed_carriers?: string[] | null
          company_id?: string
          created_at?: string
          denied_services?: string[] | null
          id?: string
          insurance_threshold?: number | null
          is_active?: boolean
          max_transit_days?: number | null
          min_ontime_score?: number | null
          policy_version_id?: string | null
          preferred_objective?: string
          signature_threshold?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_rate_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_rate_policies_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "decision_policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_events: {
        Row: {
          carrier_code: string | null
          carrier_timestamp: string
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          location: Json | null
          message: string | null
          provider: string
          raw_data: Json | null
          shipment_id: number
          source: string | null
          status: string
          status_detail: string | null
        }
        Insert: {
          carrier_code?: string | null
          carrier_timestamp: string
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          location?: Json | null
          message?: string | null
          provider: string
          raw_data?: Json | null
          shipment_id: number
          source?: string | null
          status: string
          status_detail?: string | null
        }
        Update: {
          carrier_code?: string | null
          carrier_timestamp?: string
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          location?: Json | null
          message?: string | null
          provider?: string
          raw_data?: Json | null
          shipment_id?: number
          source?: string | null
          status?: string
          status_detail?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_tokens: {
        Row: {
          company_id: string | null
          created_at: string | null
          custom_message: string | null
          expires_at: string | null
          id: string
          last_viewed_at: string | null
          shipment_id: number
          show_customer_info: boolean | null
          show_items: boolean | null
          token: string
          tracking_number: string
          views: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          custom_message?: string | null
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          shipment_id: number
          show_customer_info?: boolean | null
          show_items?: boolean | null
          token?: string
          tracking_number: string
          views?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          custom_message?: string | null
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          shipment_id?: number
          show_customer_info?: boolean | null
          show_items?: boolean | null
          token?: string
          tracking_number?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_tokens_shipment_id_fkey"
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
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      warehouse_locations: {
        Row: {
          aisle: string | null
          bin: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          location_type: string
          name: string
          rack: string | null
          shelf: string | null
          updated_at: string
          warehouse_id: string
          zone: string | null
        }
        Insert: {
          aisle?: string | null
          bin?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_type?: string
          name: string
          rack?: string | null
          shelf?: string | null
          updated_at?: string
          warehouse_id: string
          zone?: string | null
        }
        Update: {
          aisle?: string | null
          bin?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_type?: string
          name?: string
          rack?: string | null
          shelf?: string | null
          updated_at?: string
          warehouse_id?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: Json
          company_id: string
          created_at: string
          email: string | null
          id: string
          is_default: boolean | null
          name: string
          phone: string | null
          shopify_location_id: string | null
          updated_at: string
        }
        Insert: {
          address: Json
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          phone?: string | null
          shopify_location_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          phone?: string | null
          shopify_location_id?: string | null
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
      add_business_days: {
        Args: { days_to_add: number; start_date: string }
        Returns: string
      }
      auth_user_company_id: { Args: never; Returns: string }
      auth_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      calculate_order_fulfillment: {
        Args: { p_order_id: number }
        Returns: {
          fulfillment_percentage: number
          fulfillment_status: string
          items_shipped: number
          items_total: number
        }[]
      }
      deduct_from_wallet: {
        Args: {
          p_amount: number
          p_company_id: string
          p_description: string
          p_reference_id: string
          p_user_id: string
          p_wallet_id: string
        }
        Returns: {
          message: string
          new_balance: number
          success: boolean
        }[]
      }
      get_company_boxes_for_cartonization: {
        Args: { p_company_id: string }
        Returns: {
          box_type: string
          cost: number
          height: number
          id: string
          length: number
          max_weight: number
          name: string
          width: number
        }[]
      }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_qboid_dimensions_for_orders: {
        Args: { p_days_lookback?: number; p_order_identifiers: string[] }
        Returns: {
          created_at: string
          dimensions: Json
          order_identifier: string
        }[]
      }
      get_user_profile: {
        Args: { user_id: string }
        Returns: {
          company_id: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["app_role"]
          warehouse_ids: Json
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_tracking_views: {
        Args: { p_tracking_number: string }
        Returns: undefined
      }
      link_shipments_to_orders: {
        Args: { p_order_identifiers: string[]; p_shipment_ids: number[] }
        Returns: {
          matched: boolean
          order_id: number
          shipment_id: number
        }[]
      }
      update_order_cartonization: {
        Args: {
          p_box_weight: number
          p_confidence: number
          p_items_weight: number
          p_order_id: number
          p_recommended_box_data: Json
          p_recommended_box_id: string
          p_total_weight: number
          p_utilization: number
        }
        Returns: undefined
      }
      validate_warehouse_ownership: {
        Args: { p_company_id: string; p_warehouse_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "company_admin" | "user"
      box_type: "box" | "poly_bag" | "envelope" | "tube" | "custom"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["super_admin", "company_admin", "user"],
      box_type: ["box", "poly_bag", "envelope", "tube", "custom"],
    },
  },
} as const
