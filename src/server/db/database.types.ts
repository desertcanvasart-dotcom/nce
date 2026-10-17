export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          context: Json;
          id: number;
          new_data: Json | null;
          occurred_at: string;
          old_data: Json | null;
          row_id: string | null;
          table_name: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          context?: Json;
          id?: never;
          new_data?: Json | null;
          occurred_at?: string;
          old_data?: Json | null;
          row_id?: string | null;
          table_name?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          context?: Json;
          id?: never;
          new_data?: Json | null;
          occurred_at?: string;
          old_data?: Json | null;
          row_id?: string | null;
          table_name?: string | null;
        };
        Relationships: [];
      };
      destination_translations: {
        Row: {
          destination_id: string;
          locale: string;
          name: string | null;
          summary: string | null;
          updated_at: string;
        };
        Insert: {
          destination_id: string;
          locale: string;
          name?: string | null;
          summary?: string | null;
          updated_at?: string;
        };
        Update: {
          destination_id?: string;
          locale?: string;
          name?: string | null;
          summary?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "destination_translations_destination_id_fkey";
            columns: ["destination_id"];
            isOneToOne: false;
            referencedRelation: "destinations";
            referencedColumns: ["id"];
          },
        ];
      };
      destinations: {
        Row: {
          created_at: string;
          id: string;
          is_sample: boolean;
          name: string;
          slug: string;
          updated_at: string;
          visibility: Database["public"]["Enums"]["visibility"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Update: {
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Relationships: [];
      };
      media: {
        Row: {
          created_at: string;
          credit: string | null;
          destination_id: string | null;
          height: number;
          id: string;
          is_sample: boolean;
          sort_order: number;
          storage_path: string;
          updated_at: string;
          vessel_id: string | null;
          width: number;
        };
        Insert: {
          created_at?: string;
          credit?: string | null;
          destination_id?: string | null;
          height: number;
          id?: string;
          is_sample?: boolean;
          sort_order?: number;
          storage_path: string;
          updated_at?: string;
          vessel_id?: string | null;
          width: number;
        };
        Update: {
          created_at?: string;
          credit?: string | null;
          destination_id?: string | null;
          height?: number;
          id?: string;
          is_sample?: boolean;
          sort_order?: number;
          storage_path?: string;
          updated_at?: string;
          vessel_id?: string | null;
          width?: number;
        };
        Relationships: [
          {
            foreignKeyName: "media_destination_id_fkey";
            columns: ["destination_id"];
            isOneToOne: false;
            referencedRelation: "destinations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      media_translations: {
        Row: {
          alt: string;
          locale: string;
          media_id: string;
        };
        Insert: {
          alt: string;
          locale: string;
          media_id: string;
        };
        Update: {
          alt?: string;
          locale?: string;
          media_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_translations_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          created_at: string;
          org_id: string;
          team_role: Database["public"]["Enums"]["team_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          org_id: string;
          team_role: Database["public"]["Enums"]["team_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          org_id?: string;
          team_role?: Database["public"]["Enums"]["team_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organisations: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          kind: Database["public"]["Enums"]["org_kind"];
          legal_name: string | null;
          registration: Json;
          status: Database["public"]["Enums"]["org_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          id?: string;
          kind: Database["public"]["Enums"]["org_kind"];
          legal_name?: string | null;
          registration?: Json;
          status?: Database["public"]["Enums"]["org_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["org_kind"];
          legal_name?: string | null;
          registration?: Json;
          status?: Database["public"]["Enums"]["org_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          admin_role: Database["public"]["Enums"]["admin_role"] | null;
          created_at: string;
          full_name: string | null;
          id: string;
          locale: string;
          platform_role: Database["public"]["Enums"]["platform_role"];
          updated_at: string;
        };
        Insert: {
          admin_role?: Database["public"]["Enums"]["admin_role"] | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          locale?: string;
          platform_role?: Database["public"]["Enums"]["platform_role"];
          updated_at?: string;
        };
        Update: {
          admin_role?: Database["public"]["Enums"]["admin_role"] | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          locale?: string;
          platform_role?: Database["public"]["Enums"]["platform_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      vessel_private: {
        Row: {
          aliases: string[];
          claimed_operator_name: string | null;
          import_flags: string | null;
          raw_class_rating: string | null;
          raw_type: string | null;
          source_urls: string[];
          updated_at: string;
          verification_note: string | null;
          vessel_id: string;
        };
        Insert: {
          aliases?: string[];
          claimed_operator_name?: string | null;
          import_flags?: string | null;
          raw_class_rating?: string | null;
          raw_type?: string | null;
          source_urls?: string[];
          updated_at?: string;
          verification_note?: string | null;
          vessel_id: string;
        };
        Update: {
          aliases?: string[];
          claimed_operator_name?: string | null;
          import_flags?: string | null;
          raw_class_rating?: string | null;
          raw_type?: string | null;
          source_urls?: string[];
          updated_at?: string;
          verification_note?: string | null;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vessel_private_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: true;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      vessel_translations: {
        Row: {
          description: string | null;
          locale: string;
          summary: string | null;
          updated_at: string;
          vessel_id: string;
        };
        Insert: {
          description?: string | null;
          locale: string;
          summary?: string | null;
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          description?: string | null;
          locale?: string;
          summary?: string | null;
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vessel_translations_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      vessels: {
        Row: {
          cabin_count: number | null;
          category: Database["public"]["Enums"]["vessel_category"] | null;
          created_at: string;
          deck_count: number | null;
          id: string;
          is_sample: boolean;
          max_guests: number | null;
          name: string;
          operator_org_id: string | null;
          published_at: string | null;
          route_text: string | null;
          slug: string;
          source_ref: string | null;
          type: Database["public"]["Enums"]["vessel_type"];
          updated_at: string;
          visibility: Database["public"]["Enums"]["visibility"];
          year_built: number | null;
        };
        Insert: {
          cabin_count?: number | null;
          category?: Database["public"]["Enums"]["vessel_category"] | null;
          created_at?: string;
          deck_count?: number | null;
          id?: string;
          is_sample?: boolean;
          max_guests?: number | null;
          name: string;
          operator_org_id?: string | null;
          published_at?: string | null;
          route_text?: string | null;
          slug: string;
          source_ref?: string | null;
          type: Database["public"]["Enums"]["vessel_type"];
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["visibility"];
          year_built?: number | null;
        };
        Update: {
          cabin_count?: number | null;
          category?: Database["public"]["Enums"]["vessel_category"] | null;
          created_at?: string;
          deck_count?: number | null;
          id?: string;
          is_sample?: boolean;
          max_guests?: number | null;
          name?: string;
          operator_org_id?: string | null;
          published_at?: string | null;
          route_text?: string | null;
          slug?: string;
          source_ref?: string | null;
          type?: Database["public"]["Enums"]["vessel_type"];
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["visibility"];
          year_built?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "vessels_operator_org_id_fkey";
            columns: ["operator_org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      admin_role: "super" | "catalogue" | "finance" | "content";
      org_kind: "operator" | "partner" | "nilecruz";
      org_status: "applied" | "approved" | "paused" | "rejected";
      platform_role: "customer" | "admin";
      team_role: "owner" | "reservations" | "finance" | "viewer";
      vessel_category: "luxury" | "value";
      vessel_type: "sail" | "motor" | "steam";
      visibility: "private" | "showcase" | "published";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      admin_role: ["super", "catalogue", "finance", "content"],
      org_kind: ["operator", "partner", "nilecruz"],
      org_status: ["applied", "approved", "paused", "rejected"],
      platform_role: ["customer", "admin"],
      team_role: ["owner", "reservations", "finance", "viewer"],
      vessel_category: ["luxury", "value"],
      vessel_type: ["sail", "motor", "steam"],
      visibility: ["private", "showcase", "published"],
    },
  },
} as const;
