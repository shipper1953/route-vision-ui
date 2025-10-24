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
    PostgrestVersion: "12.2.3 (519615d)"
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
      items: {
        Row: {
          category: string
          company_id: string
          created_at: string
          dimensions_updated_at: string | null
          height: number
          id: string
          is_active: boolean
          length: number
          name: string
          shopify_product_gid: string | null
          shopify_product_id: string | null
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
          dimensions_updated_at?: string | null
          height: number
          id?: string
          is_active?: boolean
          length: number
          name: string
          shopify_product_gid?: string | null
          shopify_product_id?: string | null
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
          dimensions_updated_at?: string | null
          height?: number
          id?: string
          is_active?: boolean
          length?: number
          name?: string
          shopify_product_gid?: string | null
          shopify_product_id?: string | null
          shopify_variant_gid?: string | null
          shopify_variant_id?: string | null
          sku?: string
          updated_at?: string
          weight?: number
          width?: number
        }
        Relationships: []
      }
      order_cartonization: {
        Row: {
          box_weight: number | null
          calculation_timestamp: string | null
          confidence: number | null
          created_at: string | null
          id: string
          items_weight: number | null
          optimization_objective: string | null
          order_id: number
          packages: Json | null
          recommended_box_data: Json | null
          recommended_box_id: string | null
          splitting_strategy: string | null
          total_packages: number | null
          total_weight: number | null
          updated_at: string | null
          utilization: number | null
        }
        Insert: {
          box_weight?: number | null
          calculation_timestamp?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          items_weight?: number | null
          optimization_objective?: string | null
          order_id: number
          packages?: Json | null
          recommended_box_data?: Json | null
          recommended_box_id?: string | null
          splitting_strategy?: string | null
          total_packages?: number | null
          total_weight?: number | null
          updated_at?: string | null
          utilization?: number | null
        }
        Update: {
          box_weight?: number | null
          calculation_timestamp?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          items_weight?: number | null
          optimization_objective?: string | null
          order_id?: number
          packages?: Json | null
          recommended_box_data?: Json | null
          recommended_box_id?: string | null
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
