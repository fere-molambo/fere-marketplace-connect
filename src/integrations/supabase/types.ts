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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      blocked_users: {
        Row: {
          blocked_at: string | null
          blocked_by_admin: boolean | null
          blocked_id: string
          blocker_id: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_by_admin?: boolean | null
          blocked_id: string
          blocker_id: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_by_admin?: boolean | null
          blocked_id?: string
          blocker_id?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_reasons: {
        Row: {
          applies_to: string[] | null
          created_at: string | null
          created_by: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          label: string
        }
        Insert: {
          applies_to?: string[] | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label: string
        }
        Update: {
          applies_to?: string[] | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
        }
        Relationships: []
      }
      cancellations: {
        Row: {
          attachment_url: string | null
          booking_id: string | null
          cancelled_by: string
          canceller_role: string
          created_at: string | null
          custom_reason: string | null
          delivery_fee_kept: boolean | null
          id: string
          notes: string | null
          order_id: string | null
          penalty_amount: number | null
          processed_at: string | null
          processed_by: string | null
          reason_id: string | null
          refund_amount: number | null
          requires_return: boolean | null
          status_at_cancellation: string
        }
        Insert: {
          attachment_url?: string | null
          booking_id?: string | null
          cancelled_by: string
          canceller_role: string
          created_at?: string | null
          custom_reason?: string | null
          delivery_fee_kept?: boolean | null
          id?: string
          notes?: string | null
          order_id?: string | null
          penalty_amount?: number | null
          processed_at?: string | null
          processed_by?: string | null
          reason_id?: string | null
          refund_amount?: number | null
          requires_return?: boolean | null
          status_at_cancellation: string
        }
        Update: {
          attachment_url?: string | null
          booking_id?: string | null
          cancelled_by?: string
          canceller_role?: string
          created_at?: string | null
          custom_reason?: string | null
          delivery_fee_kept?: boolean | null
          id?: string
          notes?: string | null
          order_id?: string | null
          penalty_amount?: number | null
          processed_at?: string | null
          processed_by?: string | null
          reason_id?: string | null
          refund_amount?: number | null
          requires_return?: boolean | null
          status_at_cancellation?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "service_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellations_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "cancellation_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      category_commissions: {
        Row: {
          category_id: string | null
          commission_rate: number
          commission_type: string | null
          created_at: string | null
          id: string
          service_type_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          commission_rate?: number
          commission_type?: string | null
          created_at?: string | null
          id?: string
          service_type_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          commission_rate?: number
          commission_type?: string | null
          created_at?: string | null
          id?: string
          service_type_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_commissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_commissions_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_provider_types"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_muted: boolean | null
          joined_at: string | null
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          last_message_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_addresses: {
        Row: {
          address: string
          city: string | null
          country: string | null
          created_at: string | null
          geolocation_lat: number | null
          geolocation_lng: number | null
          google_maps_link: string | null
          id: string
          is_default: boolean | null
          label: string
          recipient_name: string | null
          recipient_phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          geolocation_lat?: number | null
          geolocation_lng?: number | null
          google_maps_link?: string | null
          id?: string
          is_default?: boolean | null
          label: string
          recipient_name?: string | null
          recipient_phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          geolocation_lat?: number | null
          geolocation_lng?: number | null
          google_maps_link?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          recipient_name?: string | null
          recipient_phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_requests: {
        Row: {
          arrived_at_client_at: string | null
          assigned_at: string | null
          client_verified: boolean | null
          created_at: string | null
          delivered_at: string | null
          delivery_fee: number | null
          delivery_payment_status: string | null
          delivery_point: Json | null
          driver_earnings: number | null
          driver_id: string | null
          en_route_client_at: string | null
          id: string
          is_return: boolean | null
          order_id: string | null
          original_delivery_id: string | null
          picked_up_at: string | null
          pickup_points: Json | null
          return_status: string | null
          started_at: string | null
          status: string | null
          total_distance_meters: number | null
          updated_at: string | null
          zone_id: string | null
        }
        Insert: {
          arrived_at_client_at?: string | null
          assigned_at?: string | null
          client_verified?: boolean | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_fee?: number | null
          delivery_payment_status?: string | null
          delivery_point?: Json | null
          driver_earnings?: number | null
          driver_id?: string | null
          en_route_client_at?: string | null
          id?: string
          is_return?: boolean | null
          order_id?: string | null
          original_delivery_id?: string | null
          picked_up_at?: string | null
          pickup_points?: Json | null
          return_status?: string | null
          started_at?: string | null
          status?: string | null
          total_distance_meters?: number | null
          updated_at?: string | null
          zone_id?: string | null
        }
        Update: {
          arrived_at_client_at?: string | null
          assigned_at?: string | null
          client_verified?: boolean | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_fee?: number | null
          delivery_payment_status?: string | null
          delivery_point?: Json | null
          driver_earnings?: number | null
          driver_id?: string | null
          en_route_client_at?: string | null
          id?: string
          is_return?: boolean | null
          order_id?: string | null
          original_delivery_id?: string | null
          picked_up_at?: string | null
          pickup_points?: Json | null
          return_status?: string | null
          started_at?: string | null
          status?: string | null
          total_distance_meters?: number | null
          updated_at?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_original_delivery_id_fkey"
            columns: ["original_delivery_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          center_lat: number | null
          center_lng: number | null
          city: string | null
          commune: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          google_maps_link: string | null
          id: string
          is_active: boolean | null
          name: string
          radius_km: number
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          center_lat?: number | null
          center_lng?: number | null
          city?: string | null
          commune?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          google_maps_link?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          radius_km?: number
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          center_lat?: number | null
          center_lng?: number | null
          city?: string | null
          commune?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          google_maps_link?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          radius_km?: number
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      driver_zones: {
        Row: {
          created_at: string | null
          driver_id: string
          id: string
          is_active: boolean | null
          zone_id: string
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          id?: string
          is_active?: boolean | null
          zone_id: string
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          id?: string
          is_active?: boolean | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_zones_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_zones_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_items: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          created_by: string | null
          display_order: number | null
          id: string
          is_published: boolean | null
          question: string
          updated_at: string | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          question: string
          updated_at?: string | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          question?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faq_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          service_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          service_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          service_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flash_sales: {
        Row: {
          created_at: string | null
          created_by: string | null
          ends_at: string
          flash_price: number
          id: string
          is_active: boolean | null
          product_id: string | null
          service_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          ends_at: string
          flash_price: number
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          service_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          ends_at?: string
          flash_price?: number
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flash_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_sales_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_images: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string
          model_used: string | null
          prompt: string
          shop_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url: string
          model_used?: string | null
          prompt: string
          shop_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string
          model_used?: string | null
          prompt?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_images_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_images_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          id: string
          media_type: Database["public"]["Enums"]["message_type"]
          media_url: string | null
          read_at: string | null
          retry_count: number | null
          sender_id: string
          status: Database["public"]["Enums"]["message_status"]
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          media_type?: Database["public"]["Enums"]["message_type"]
          media_url?: string | null
          read_at?: string | null
          retry_count?: number | null
          sender_id: string
          status?: Database["public"]["Enums"]["message_status"]
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          media_type?: Database["public"]["Enums"]["message_type"]
          media_url?: string | null
          read_at?: string | null
          retry_count?: number | null
          sender_id?: string
          status?: Database["public"]["Enums"]["message_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          proposed_price: number | null
          quantity: number
          selected_color: string | null
          selected_size: string | null
          shop_id: string
          total_price: number
          unit_price: number
          vendor_status: string | null
        }
        Insert: {
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          proposed_price?: number | null
          quantity: number
          selected_color?: string | null
          selected_size?: string | null
          shop_id: string
          total_price: number
          unit_price: number
          vendor_status?: string | null
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          proposed_price?: number | null
          quantity?: number
          selected_color?: string | null
          selected_size?: string | null
          shop_id?: string
          total_price?: number
          unit_price?: number
          vendor_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          advance_paid: number | null
          cancellation_id: string | null
          commission_amount: number
          created_at: string | null
          delivery_address_id: string | null
          delivery_distance_meters: number | null
          delivery_fee: number | null
          delivery_type: string
          id: string
          is_multi_vendor: boolean | null
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          source_warehouse_id: string | null
          status: string | null
          subtotal: number
          total_amount: number
          tva_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          advance_paid?: number | null
          cancellation_id?: string | null
          commission_amount: number
          created_at?: string | null
          delivery_address_id?: string | null
          delivery_distance_meters?: number | null
          delivery_fee?: number | null
          delivery_type: string
          id?: string
          is_multi_vendor?: boolean | null
          notes?: string | null
          order_number: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          source_warehouse_id?: string | null
          status?: string | null
          subtotal: number
          total_amount: number
          tva_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          advance_paid?: number | null
          cancellation_id?: string | null
          commission_amount?: number
          created_at?: string | null
          delivery_address_id?: string | null
          delivery_distance_meters?: number | null
          delivery_fee?: number | null
          delivery_type?: string
          id?: string
          is_multi_vendor?: boolean | null
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          source_warehouse_id?: string | null
          status?: string | null
          subtotal?: number
          total_amount?: number
          tva_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_cancellation_id_fkey"
            columns: ["cancellation_id"]
            isOneToOne: false
            referencedRelation: "cancellations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "delivery_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          paystack_response: Json | null
          reference: string
          related_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          paystack_response?: Json | null
          reference: string
          related_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          paystack_response?: Json | null
          reference?: string
          related_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_payouts: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string | null
          currency: string | null
          delivery_request_id: string | null
          eligible_at: string | null
          failure_reason: string | null
          id: string
          order_id: string | null
          paystack_recipient_code: string | null
          paystack_reference: string | null
          paystack_transfer_code: string | null
          processed_at: string | null
          recipient_id: string
          recipient_type: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string | null
          currency?: string | null
          delivery_request_id?: string | null
          eligible_at?: string | null
          failure_reason?: string | null
          id?: string
          order_id?: string | null
          paystack_recipient_code?: string | null
          paystack_reference?: string | null
          paystack_transfer_code?: string | null
          processed_at?: string | null
          recipient_id: string
          recipient_type: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string | null
          currency?: string | null
          delivery_request_id?: string | null
          eligible_at?: string | null
          failure_reason?: string | null
          id?: string
          order_id?: string | null
          paystack_recipient_code?: string | null
          paystack_reference?: string | null
          paystack_transfer_code?: string | null
          processed_at?: string | null
          recipient_id?: string
          recipient_type?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_payouts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "service_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_payouts_delivery_request_id_fkey"
            columns: ["delivery_request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_payouts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          app_description: string | null
          app_name: string
          cancellation_penalty_rate: number | null
          cgu: string | null
          company_email: string | null
          cookies: string | null
          created_at: string | null
          cta_button_link: string | null
          cta_button_text: string | null
          cta_images: Json | null
          cta_pre_title: string | null
          cta_text: string | null
          cta_title: string | null
          delivery_base_fee: number | null
          delivery_commission_driver: number | null
          delivery_commission_fere: number | null
          delivery_discount_per_km: number | null
          delivery_fee_per_100m: number | null
          delivery_fee_per_500m: number | null
          delivery_fee_per_km: number | null
          favicon: string | null
          hero_cards: Json | null
          id: string
          image_auth_login: string | null
          image_auth_signup: string | null
          logo_auth_page: string | null
          logo_footer: string | null
          logo_principal: string | null
          logo_sidebar_collapsed: string | null
          max_cash_order_amount: number | null
          max_delivery_acceptance_hour: number | null
          partner_logos: Json | null
          payout_delay_hours: number | null
          support_email: string | null
          support_phone: string | null
          tva_rate: number | null
          updated_at: string | null
        }
        Insert: {
          app_description?: string | null
          app_name?: string
          cancellation_penalty_rate?: number | null
          cgu?: string | null
          company_email?: string | null
          cookies?: string | null
          created_at?: string | null
          cta_button_link?: string | null
          cta_button_text?: string | null
          cta_images?: Json | null
          cta_pre_title?: string | null
          cta_text?: string | null
          cta_title?: string | null
          delivery_base_fee?: number | null
          delivery_commission_driver?: number | null
          delivery_commission_fere?: number | null
          delivery_discount_per_km?: number | null
          delivery_fee_per_100m?: number | null
          delivery_fee_per_500m?: number | null
          delivery_fee_per_km?: number | null
          favicon?: string | null
          hero_cards?: Json | null
          id?: string
          image_auth_login?: string | null
          image_auth_signup?: string | null
          logo_auth_page?: string | null
          logo_footer?: string | null
          logo_principal?: string | null
          logo_sidebar_collapsed?: string | null
          max_cash_order_amount?: number | null
          max_delivery_acceptance_hour?: number | null
          partner_logos?: Json | null
          payout_delay_hours?: number | null
          support_email?: string | null
          support_phone?: string | null
          tva_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          app_description?: string | null
          app_name?: string
          cancellation_penalty_rate?: number | null
          cgu?: string | null
          company_email?: string | null
          cookies?: string | null
          created_at?: string | null
          cta_button_link?: string | null
          cta_button_text?: string | null
          cta_images?: Json | null
          cta_pre_title?: string | null
          cta_text?: string | null
          cta_title?: string | null
          delivery_base_fee?: number | null
          delivery_commission_driver?: number | null
          delivery_commission_fere?: number | null
          delivery_discount_per_km?: number | null
          delivery_fee_per_100m?: number | null
          delivery_fee_per_500m?: number | null
          delivery_fee_per_km?: number | null
          favicon?: string | null
          hero_cards?: Json | null
          id?: string
          image_auth_login?: string | null
          image_auth_signup?: string | null
          logo_auth_page?: string | null
          logo_footer?: string | null
          logo_principal?: string | null
          logo_sidebar_collapsed?: string | null
          max_cash_order_amount?: number | null
          max_delivery_acceptance_hour?: number | null
          partner_logos?: Json | null
          payout_delay_hours?: number | null
          support_email?: string | null
          support_phone?: string | null
          tva_rate?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          auto_validation: boolean | null
          category_id: string | null
          colors: Json | null
          condition: string | null
          created_at: string | null
          description: string | null
          discount_percent: number | null
          hover_media_url: string | null
          id: string
          includes: string | null
          is_active: boolean | null
          main_media_url: string | null
          media_urls: Json | null
          min_auto_price: number | null
          min_quantity: number | null
          name: string
          price: number
          price_type: string
          product_type: string | null
          quantity_available: number | null
          quantity_intervals: Json | null
          shop_id: string
          sizes: Json | null
          subcategory_id: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          auto_validation?: boolean | null
          category_id?: string | null
          colors?: Json | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          hover_media_url?: string | null
          id?: string
          includes?: string | null
          is_active?: boolean | null
          main_media_url?: string | null
          media_urls?: Json | null
          min_auto_price?: number | null
          min_quantity?: number | null
          name: string
          price: number
          price_type: string
          product_type?: string | null
          quantity_available?: number | null
          quantity_intervals?: Json | null
          shop_id: string
          sizes?: Json | null
          subcategory_id?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          auto_validation?: boolean | null
          category_id?: string | null
          colors?: Json | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          hover_media_url?: string | null
          id?: string
          includes?: string | null
          is_active?: boolean | null
          main_media_url?: string | null
          media_urls?: Json | null
          min_auto_price?: number | null
          min_quantity?: number | null
          name?: string
          price?: number
          price_type?: string
          product_type?: string | null
          quantity_available?: number | null
          quantity_intervals?: Json | null
          shop_id?: string
          sizes?: Json | null
          subcategory_id?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          adresse: string | null
          contact: string
          contrat_url: string | null
          created_at: string | null
          created_by: string | null
          current_lat: number | null
          current_lng: number | null
          department_id: string | null
          driver_license_url: string | null
          duree_contrat: string | null
          email: string | null
          geolocalisation_lat: number | null
          geolocalisation_lng: number | null
          id: string
          is_available: boolean | null
          is_online: boolean | null
          last_location_update: string | null
          nom_complet: string
          photo_profil: string | null
          piece_identite_client_type:
            | Database["public"]["Enums"]["client_piece_identite_type"]
            | null
          piece_identite_client_url: string | null
          piece_identite_type:
            | Database["public"]["Enums"]["piece_identite_type"]
            | null
          piece_identite_url: string | null
          presence: Database["public"]["Enums"]["presence_type"] | null
          sexe: Database["public"]["Enums"]["client_sexe"] | null
          statut_legal: Database["public"]["Enums"]["statut_legal_type"] | null
          statut_matrimonial:
            | Database["public"]["Enums"]["client_statut_matrimonial"]
            | null
          statut_professionnel:
            | Database["public"]["Enums"]["client_statut_professionnel"]
            | null
          tranche_age: Database["public"]["Enums"]["client_tranche_age"] | null
          type_contrat: Database["public"]["Enums"]["type_contrat_type"] | null
          type_offre: Database["public"]["Enums"]["type_offre_type"] | null
          updated_at: string | null
          vehicle_color: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Insert: {
          adresse?: string | null
          contact: string
          contrat_url?: string | null
          created_at?: string | null
          created_by?: string | null
          current_lat?: number | null
          current_lng?: number | null
          department_id?: string | null
          driver_license_url?: string | null
          duree_contrat?: string | null
          email?: string | null
          geolocalisation_lat?: number | null
          geolocalisation_lng?: number | null
          id: string
          is_available?: boolean | null
          is_online?: boolean | null
          last_location_update?: string | null
          nom_complet: string
          photo_profil?: string | null
          piece_identite_client_type?:
            | Database["public"]["Enums"]["client_piece_identite_type"]
            | null
          piece_identite_client_url?: string | null
          piece_identite_type?:
            | Database["public"]["Enums"]["piece_identite_type"]
            | null
          piece_identite_url?: string | null
          presence?: Database["public"]["Enums"]["presence_type"] | null
          sexe?: Database["public"]["Enums"]["client_sexe"] | null
          statut_legal?: Database["public"]["Enums"]["statut_legal_type"] | null
          statut_matrimonial?:
            | Database["public"]["Enums"]["client_statut_matrimonial"]
            | null
          statut_professionnel?:
            | Database["public"]["Enums"]["client_statut_professionnel"]
            | null
          tranche_age?: Database["public"]["Enums"]["client_tranche_age"] | null
          type_contrat?: Database["public"]["Enums"]["type_contrat_type"] | null
          type_offre?: Database["public"]["Enums"]["type_offre_type"] | null
          updated_at?: string | null
          vehicle_color?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Update: {
          adresse?: string | null
          contact?: string
          contrat_url?: string | null
          created_at?: string | null
          created_by?: string | null
          current_lat?: number | null
          current_lng?: number | null
          department_id?: string | null
          driver_license_url?: string | null
          duree_contrat?: string | null
          email?: string | null
          geolocalisation_lat?: number | null
          geolocalisation_lng?: number | null
          id?: string
          is_available?: boolean | null
          is_online?: boolean | null
          last_location_update?: string | null
          nom_complet?: string
          photo_profil?: string | null
          piece_identite_client_type?:
            | Database["public"]["Enums"]["client_piece_identite_type"]
            | null
          piece_identite_client_url?: string | null
          piece_identite_type?:
            | Database["public"]["Enums"]["piece_identite_type"]
            | null
          piece_identite_url?: string | null
          presence?: Database["public"]["Enums"]["presence_type"] | null
          sexe?: Database["public"]["Enums"]["client_sexe"] | null
          statut_legal?: Database["public"]["Enums"]["statut_legal_type"] | null
          statut_matrimonial?:
            | Database["public"]["Enums"]["client_statut_matrimonial"]
            | null
          statut_professionnel?:
            | Database["public"]["Enums"]["client_statut_professionnel"]
            | null
          tranche_age?: Database["public"]["Enums"]["client_tranche_age"] | null
          type_contrat?: Database["public"]["Enums"]["type_contrat_type"] | null
          type_offre?: Database["public"]["Enums"]["type_offre_type"] | null
          updated_at?: string | null
          vehicle_color?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          booking_id: string | null
          cancellation_id: string | null
          created_at: string | null
          failure_reason: string | null
          id: string
          net_refund: number
          order_id: string | null
          original_payment_reference: string | null
          paystack_refund_reference: string | null
          processed_at: string | null
          processed_by: string | null
          status: string | null
          transaction_fee_deducted: number | null
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          cancellation_id?: string | null
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          net_refund: number
          order_id?: string | null
          original_payment_reference?: string | null
          paystack_refund_reference?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          transaction_fee_deducted?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          cancellation_id?: string | null
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          net_refund?: number
          order_id?: string | null
          original_payment_reference?: string | null
          paystack_refund_reference?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          transaction_fee_deducted?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "service_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_cancellation_id_fkey"
            columns: ["cancellation_id"]
            isOneToOne: false
            referencedRelation: "cancellations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      review_replies: {
        Row: {
          created_at: string | null
          id: string
          reply: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reply: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reply?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "shop_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_availability_slots: {
        Row: {
          created_at: string | null
          date: string
          end_time: string
          id: string
          is_available: boolean | null
          service_id: string
          start_time: string
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          is_available?: boolean | null
          service_id: string
          start_time: string
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          service_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_availability_slots_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bookings: {
        Row: {
          advance_paid: number | null
          booking_date: string
          booking_time: string
          client_confirmed_at: string | null
          client_rating: number | null
          client_review: string | null
          commission_amount: number | null
          created_at: string | null
          customer_id: string | null
          delivery_address_id: string | null
          id: string
          notes: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          service_id: string
          slot_id: string | null
          status: string | null
          total_price: number
          tva_amount: number | null
          updated_at: string | null
          vendor_arrived_at: string | null
          vendor_confirmed_at: string | null
        }
        Insert: {
          advance_paid?: number | null
          booking_date: string
          booking_time: string
          client_confirmed_at?: string | null
          client_rating?: number | null
          client_review?: string | null
          commission_amount?: number | null
          created_at?: string | null
          customer_id?: string | null
          delivery_address_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          service_id: string
          slot_id?: string | null
          status?: string | null
          total_price: number
          tva_amount?: number | null
          updated_at?: string | null
          vendor_arrived_at?: string | null
          vendor_confirmed_at?: string | null
        }
        Update: {
          advance_paid?: number | null
          booking_date?: string
          booking_time?: string
          client_confirmed_at?: string | null
          client_rating?: number | null
          client_review?: string | null
          commission_amount?: number | null
          created_at?: string | null
          customer_id?: string | null
          delivery_address_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          service_id?: string
          slot_id?: string | null
          status?: string | null
          total_price?: number
          tva_amount?: number | null
          updated_at?: string | null
          vendor_arrived_at?: string | null
          vendor_confirmed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "delivery_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "service_availability_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      service_provider_types: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          auto_validation: boolean | null
          booking_advance_percent: number | null
          client_preparation: string | null
          created_at: string | null
          description: string | null
          discount_percent: number | null
          duration: number | null
          hover_media_url: string | null
          id: string
          includes: string | null
          is_active: boolean | null
          main_media_url: string | null
          media_urls: Json | null
          min_auto_price: number | null
          name: string
          portfolio_link: string | null
          price: number
          price_type: string
          requires_booking: boolean | null
          shop_id: string
          updated_at: string | null
          video_url: string | null
          weekly_availability: Json | null
        }
        Insert: {
          auto_validation?: boolean | null
          booking_advance_percent?: number | null
          client_preparation?: string | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          duration?: number | null
          hover_media_url?: string | null
          id?: string
          includes?: string | null
          is_active?: boolean | null
          main_media_url?: string | null
          media_urls?: Json | null
          min_auto_price?: number | null
          name: string
          portfolio_link?: string | null
          price: number
          price_type: string
          requires_booking?: boolean | null
          shop_id: string
          updated_at?: string | null
          video_url?: string | null
          weekly_availability?: Json | null
        }
        Update: {
          auto_validation?: boolean | null
          booking_advance_percent?: number | null
          client_preparation?: string | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          duration?: number | null
          hover_media_url?: string | null
          id?: string
          includes?: string | null
          is_active?: boolean | null
          main_media_url?: string | null
          media_urls?: Json | null
          min_auto_price?: number | null
          name?: string
          portfolio_link?: string | null
          price?: number
          price_type?: string
          requires_booking?: boolean | null
          shop_id?: string
          updated_at?: string | null
          video_url?: string | null
          weekly_availability?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "services_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_categories: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          shop_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          shop_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          shop_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          shop_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          shop_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_service_types: {
        Row: {
          created_at: string | null
          id: string
          service_type_id: string
          shop_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          service_type_id: string
          shop_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          service_type_id?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_service_types_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_provider_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_service_types_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_social_links: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          shop_id: string
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform: string
          shop_id: string
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          shop_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_social_links_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_stories: {
        Row: {
          caption: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          linked_product_id: string | null
          linked_service_id: string | null
          media_type: string
          media_url: string
          shop_id: string
          source_type: string | null
          visibility: Database["public"]["Enums"]["story_visibility"] | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          linked_product_id?: string | null
          linked_service_id?: string | null
          media_type: string
          media_url: string
          shop_id: string
          source_type?: string | null
          visibility?: Database["public"]["Enums"]["story_visibility"] | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          linked_product_id?: string | null
          linked_service_id?: string | null
          media_type?: string
          media_url?: string
          shop_id?: string
          source_type?: string | null
          visibility?: Database["public"]["Enums"]["story_visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_stories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_stories_linked_product_id_fkey"
            columns: ["linked_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_stories_linked_service_id_fkey"
            columns: ["linked_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_stories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_team_members: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assignment_type: string
          id: string
          member_id: string
          shop_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assignment_type: string
          id?: string
          member_id: string
          shop_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assignment_type?: string
          id?: string
          member_id?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_team_members_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_team_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_team_members_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          banner_url: string | null
          closing_time: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          creation_reason: string | null
          delivery_details: string | null
          delivery_zone_id: string | null
          description: string | null
          geolocation_lat: number | null
          geolocation_lng: number | null
          google_maps_link: string | null
          guide_name: string | null
          guide_url: string | null
          id: string
          is_active: boolean | null
          is_official: boolean | null
          logo_url: string | null
          name: string
          opening_time: string | null
          owner_id: string
          responsible_admin_id: string | null
          return_policy: string | null
          shop_type: string
          slug: string
          statut_legal: string | null
          support_phone: string | null
          updated_at: string | null
          verification_status: string | null
          whatsapp_catalog_link: string | null
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          closing_time?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          creation_reason?: string | null
          delivery_details?: string | null
          delivery_zone_id?: string | null
          description?: string | null
          geolocation_lat?: number | null
          geolocation_lng?: number | null
          google_maps_link?: string | null
          guide_name?: string | null
          guide_url?: string | null
          id?: string
          is_active?: boolean | null
          is_official?: boolean | null
          logo_url?: string | null
          name: string
          opening_time?: string | null
          owner_id: string
          responsible_admin_id?: string | null
          return_policy?: string | null
          shop_type: string
          slug: string
          statut_legal?: string | null
          support_phone?: string | null
          updated_at?: string | null
          verification_status?: string | null
          whatsapp_catalog_link?: string | null
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          closing_time?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          creation_reason?: string | null
          delivery_details?: string | null
          delivery_zone_id?: string | null
          description?: string | null
          geolocation_lat?: number | null
          geolocation_lng?: number | null
          google_maps_link?: string | null
          guide_name?: string | null
          guide_url?: string | null
          id?: string
          is_active?: boolean | null
          is_official?: boolean | null
          logo_url?: string | null
          name?: string
          opening_time?: string | null
          owner_id?: string
          responsible_admin_id?: string | null
          return_policy?: string | null
          shop_type?: string
          slug?: string
          statut_legal?: string | null
          support_phone?: string | null
          updated_at?: string | null
          verification_status?: string | null
          whatsapp_catalog_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shops_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shops_responsible_admin_id_fkey"
            columns: ["responsible_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string | null
          viewer_id: string | null
          viewer_ip: string | null
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string | null
          viewer_id?: string | null
          viewer_ip?: string | null
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string | null
          viewer_id?: string | null
          viewer_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "shop_stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_assignment_tags: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          label: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_assignment_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      token_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          payment_reference: string | null
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          payment_reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          payment_reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorials: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_published: boolean | null
          slug: string
          tag: string | null
          thumbnail_url: string | null
          title: string
          type: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          slug: string
          tag?: string | null
          thumbnail_url?: string | null
          title: string
          type: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          slug?: string
          tag?: string | null
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutorials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_departments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          department_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          department_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          department_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_penalties: {
        Row: {
          amount: number
          applied_at: string | null
          applied_to_booking_id: string | null
          applied_to_order_id: string | null
          blocks_cash_payment: boolean | null
          cancellation_id: string | null
          created_at: string | null
          id: string
          status: string | null
          user_id: string
          waived_at: string | null
          waived_by: string | null
          waived_reason: string | null
        }
        Insert: {
          amount: number
          applied_at?: string | null
          applied_to_booking_id?: string | null
          applied_to_order_id?: string | null
          blocks_cash_payment?: boolean | null
          cancellation_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          user_id: string
          waived_at?: string | null
          waived_by?: string | null
          waived_reason?: string | null
        }
        Update: {
          amount?: number
          applied_at?: string | null
          applied_to_booking_id?: string | null
          applied_to_order_id?: string | null
          blocks_cash_payment?: boolean | null
          cancellation_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          user_id?: string
          waived_at?: string | null
          waived_by?: string | null
          waived_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_penalties_applied_to_booking_id_fkey"
            columns: ["applied_to_booking_id"]
            isOneToOne: false
            referencedRelation: "service_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_penalties_applied_to_order_id_fkey"
            columns: ["applied_to_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_penalties_cancellation_id_fkey"
            columns: ["cancellation_id"]
            isOneToOne: false
            referencedRelation: "cancellations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tokens: {
        Row: {
          balance: number
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_admins: {
        Row: {
          admin_id: string
          assigned_at: string | null
          assigned_by: string | null
          id: string
          vendor_id: string
        }
        Insert: {
          admin_id: string
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          vendor_id: string
        }
        Update: {
          admin_id?: string
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_admins_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_admins_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_admins_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_tokens: {
        Args: {
          p_amount: number
          p_payment_reference: string
          p_user_id: string
        }
        Returns: number
      }
      assign_self_role: { Args: { role_name: string }; Returns: undefined }
      can_manage_product_media: {
        Args: { _file_path: string }
        Returns: boolean
      }
      can_manage_service_media: {
        Args: { _file_path: string }
        Returns: boolean
      }
      can_manage_shop_image: { Args: { _file_path: string }; Returns: boolean }
      can_manage_shop_reviews: {
        Args: { _shop_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_story_media: { Args: { _file_path: string }; Returns: boolean }
      cleanup_expired_stories: { Args: never; Returns: undefined }
      deduct_tokens: {
        Args: {
          p_amount: number
          p_description: string
          p_reference_id: string
          p_reference_type: string
          p_user_id: string
        }
        Returns: number
      }
      ensure_user_tokens: { Args: { p_user_id: string }; Returns: number }
      generate_order_number: { Args: never; Returns: string }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_created_by_profile: { Args: { _profile_id: string }; Returns: boolean }
      is_shop_team_member: {
        Args: { _shop_id: string; _user_id: string }
        Returns: boolean
      }
      mark_messages_as_read: {
        Args: { message_ids: string[] }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "vendeur"
        | "livreur"
        | "membre"
        | "equipe"
      client_piece_identite_type:
        | "carte_etudiant"
        | "cni"
        | "passeport"
        | "permis_conduire"
      client_sexe: "homme" | "femme" | "autre"
      client_statut_matrimonial: "celibataire" | "marie" | "divorce" | "veuf"
      client_statut_professionnel:
        | "etudiant"
        | "salarie"
        | "entrepreneur"
        | "sans_emploi"
        | "retraite"
      client_tranche_age: "18-25" | "26-35" | "36-45" | "46-55" | "55+"
      message_status: "failed" | "pending" | "sent" | "read"
      message_type: "text" | "image" | "audio"
      payment_status: "pending" | "success" | "failed" | "abandoned"
      payment_type:
        | "order"
        | "service_booking"
        | "subscription"
        | "commission_payout"
        | "tokens"
      piece_identite_type: "cni" | "passeport" | "permis"
      presence_type: "presentiel" | "distance" | "hybride"
      statut_legal_type: "particulier" | "entreprise"
      story_visibility: "public" | "clients_only" | "private"
      type_contrat_type: "cdd" | "cdi" | "prestataire"
      type_offre_type: "produits" | "services" | "les_deux"
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
      app_role: [
        "super_admin",
        "admin",
        "vendeur",
        "livreur",
        "membre",
        "equipe",
      ],
      client_piece_identite_type: [
        "carte_etudiant",
        "cni",
        "passeport",
        "permis_conduire",
      ],
      client_sexe: ["homme", "femme", "autre"],
      client_statut_matrimonial: ["celibataire", "marie", "divorce", "veuf"],
      client_statut_professionnel: [
        "etudiant",
        "salarie",
        "entrepreneur",
        "sans_emploi",
        "retraite",
      ],
      client_tranche_age: ["18-25", "26-35", "36-45", "46-55", "55+"],
      message_status: ["failed", "pending", "sent", "read"],
      message_type: ["text", "image", "audio"],
      payment_status: ["pending", "success", "failed", "abandoned"],
      payment_type: [
        "order",
        "service_booking",
        "subscription",
        "commission_payout",
        "tokens",
      ],
      piece_identite_type: ["cni", "passeport", "permis"],
      presence_type: ["presentiel", "distance", "hybride"],
      statut_legal_type: ["particulier", "entreprise"],
      story_visibility: ["public", "clients_only", "private"],
      type_contrat_type: ["cdd", "cdi", "prestataire"],
      type_offre_type: ["produits", "services", "les_deux"],
    },
  },
} as const
