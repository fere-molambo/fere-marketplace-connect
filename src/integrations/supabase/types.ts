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
      platform_settings: {
        Row: {
          app_description: string | null
          app_name: string
          cgu: string | null
          cookies: string | null
          created_at: string | null
          favicon: string | null
          id: string
          image_auth_login: string | null
          image_auth_signup: string | null
          logo_auth_page: string | null
          logo_principal: string | null
          logo_sidebar_collapsed: string | null
          updated_at: string | null
        }
        Insert: {
          app_description?: string | null
          app_name?: string
          cgu?: string | null
          cookies?: string | null
          created_at?: string | null
          favicon?: string | null
          id?: string
          image_auth_login?: string | null
          image_auth_signup?: string | null
          logo_auth_page?: string | null
          logo_principal?: string | null
          logo_sidebar_collapsed?: string | null
          updated_at?: string | null
        }
        Update: {
          app_description?: string | null
          app_name?: string
          cgu?: string | null
          cookies?: string | null
          created_at?: string | null
          favicon?: string | null
          id?: string
          image_auth_login?: string | null
          image_auth_signup?: string | null
          logo_auth_page?: string | null
          logo_principal?: string | null
          logo_sidebar_collapsed?: string | null
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
          colors: Json | null
          created_at: string | null
          description: string | null
          discount_percent: number | null
          id: string
          includes: string | null
          is_active: boolean | null
          main_media_url: string | null
          media_urls: Json | null
          min_quantity: number | null
          name: string
          price: number
          price_type: string
          product_type: string | null
          quantity_available: number | null
          quantity_intervals: Json | null
          shop_id: string
          sizes: Json | null
          updated_at: string | null
        }
        Insert: {
          colors?: Json | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          includes?: string | null
          is_active?: boolean | null
          main_media_url?: string | null
          media_urls?: Json | null
          min_quantity?: number | null
          name: string
          price: number
          price_type: string
          product_type?: string | null
          quantity_available?: number | null
          quantity_intervals?: Json | null
          shop_id: string
          sizes?: Json | null
          updated_at?: string | null
        }
        Update: {
          colors?: Json | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          includes?: string | null
          is_active?: boolean | null
          main_media_url?: string | null
          media_urls?: Json | null
          min_quantity?: number | null
          name?: string
          price?: number
          price_type?: string
          product_type?: string | null
          quantity_available?: number | null
          quantity_intervals?: Json | null
          shop_id?: string
          sizes?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
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
          department_id: string | null
          duree_contrat: string | null
          email: string | null
          geolocalisation_lat: number | null
          geolocalisation_lng: number | null
          id: string
          nom_complet: string
          photo_profil: string | null
          piece_identite_type:
            | Database["public"]["Enums"]["piece_identite_type"]
            | null
          piece_identite_url: string | null
          presence: Database["public"]["Enums"]["presence_type"] | null
          statut_legal: Database["public"]["Enums"]["statut_legal_type"] | null
          type_contrat: Database["public"]["Enums"]["type_contrat_type"] | null
          type_offre: Database["public"]["Enums"]["type_offre_type"] | null
          updated_at: string | null
        }
        Insert: {
          adresse?: string | null
          contact: string
          contrat_url?: string | null
          created_at?: string | null
          department_id?: string | null
          duree_contrat?: string | null
          email?: string | null
          geolocalisation_lat?: number | null
          geolocalisation_lng?: number | null
          id: string
          nom_complet: string
          photo_profil?: string | null
          piece_identite_type?:
            | Database["public"]["Enums"]["piece_identite_type"]
            | null
          piece_identite_url?: string | null
          presence?: Database["public"]["Enums"]["presence_type"] | null
          statut_legal?: Database["public"]["Enums"]["statut_legal_type"] | null
          type_contrat?: Database["public"]["Enums"]["type_contrat_type"] | null
          type_offre?: Database["public"]["Enums"]["type_offre_type"] | null
          updated_at?: string | null
        }
        Update: {
          adresse?: string | null
          contact?: string
          contrat_url?: string | null
          created_at?: string | null
          department_id?: string | null
          duree_contrat?: string | null
          email?: string | null
          geolocalisation_lat?: number | null
          geolocalisation_lng?: number | null
          id?: string
          nom_complet?: string
          photo_profil?: string | null
          piece_identite_type?:
            | Database["public"]["Enums"]["piece_identite_type"]
            | null
          piece_identite_url?: string | null
          presence?: Database["public"]["Enums"]["presence_type"] | null
          statut_legal?: Database["public"]["Enums"]["statut_legal_type"] | null
          type_contrat?: Database["public"]["Enums"]["type_contrat_type"] | null
          type_offre?: Database["public"]["Enums"]["type_offre_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
          booking_advance_percent: number | null
          client_preparation: string | null
          created_at: string | null
          description: string | null
          discount_percent: number | null
          id: string
          includes: string | null
          is_active: boolean | null
          main_media_url: string | null
          media_urls: Json | null
          name: string
          portfolio_link: string | null
          price: number
          price_type: string
          requires_booking: boolean | null
          shop_id: string
          updated_at: string | null
          weekly_availability: Json | null
        }
        Insert: {
          booking_advance_percent?: number | null
          client_preparation?: string | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          includes?: string | null
          is_active?: boolean | null
          main_media_url?: string | null
          media_urls?: Json | null
          name: string
          portfolio_link?: string | null
          price: number
          price_type: string
          requires_booking?: boolean | null
          shop_id: string
          updated_at?: string | null
          weekly_availability?: Json | null
        }
        Update: {
          booking_advance_percent?: number | null
          client_preparation?: string | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          includes?: string | null
          is_active?: boolean | null
          main_media_url?: string | null
          media_urls?: Json | null
          name?: string
          portfolio_link?: string | null
          price?: number
          price_type?: string
          requires_booking?: boolean | null
          shop_id?: string
          updated_at?: string | null
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
          expires_at: string | null
          id: string
          is_active: boolean | null
          media_type: string
          media_url: string
          shop_id: string
          source_type: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          media_type: string
          media_url: string
          shop_id: string
          source_type?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          media_type?: string
          media_url?: string
          shop_id?: string
          source_type?: string | null
        }
        Relationships: [
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
          description: string | null
          geolocation_lat: number | null
          geolocation_lng: number | null
          id: string
          is_active: boolean | null
          is_official: boolean | null
          logo_url: string | null
          name: string
          opening_time: string | null
          owner_id: string
          responsible_admin_id: string | null
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
          description?: string | null
          geolocation_lat?: number | null
          geolocation_lng?: number | null
          id?: string
          is_active?: boolean | null
          is_official?: boolean | null
          logo_url?: string | null
          name: string
          opening_time?: string | null
          owner_id: string
          responsible_admin_id?: string | null
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
          description?: string | null
          geolocation_lat?: number | null
          geolocation_lng?: number | null
          id?: string
          is_active?: boolean | null
          is_official?: boolean | null
          logo_url?: string | null
          name?: string
          opening_time?: string | null
          owner_id?: string
          responsible_admin_id?: string | null
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
      is_shop_team_member: {
        Args: { _shop_id: string; _user_id: string }
        Returns: boolean
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
      piece_identite_type: "cni" | "passeport" | "permis"
      presence_type: "presentiel" | "distance" | "hybride"
      statut_legal_type: "particulier" | "entreprise"
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
      piece_identite_type: ["cni", "passeport", "permis"],
      presence_type: ["presentiel", "distance", "hybride"],
      statut_legal_type: ["particulier", "entreprise"],
      type_contrat_type: ["cdd", "cdi", "prestataire"],
      type_offre_type: ["produits", "services", "les_deux"],
    },
  },
} as const
