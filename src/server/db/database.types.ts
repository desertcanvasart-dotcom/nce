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
      evaluation_translations: {
        Row: {
          evaluation_id: string;
          locale: string;
          notes: string | null;
        };
        Insert: {
          evaluation_id: string;
          locale: string;
          notes?: string | null;
        };
        Update: {
          evaluation_id?: string;
          locale?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "evaluation_translations_evaluation_id_fkey";
            columns: ["evaluation_id"];
            isOneToOne: false;
            referencedRelation: "evaluations";
            referencedColumns: ["id"];
          },
        ];
      };
      evaluations: {
        Row: {
          assessed_on: string;
          created_at: string;
          created_by: string | null;
          dimension_results: Json;
          evaluator: string;
          id: string;
          method_version: number;
          overall_score: number;
          published: boolean;
          published_at: string | null;
          scores: Json;
          updated_at: string;
          verdict: Database["public"]["Enums"]["evaluation_verdict"];
          vessel_id: string;
        };
        Insert: {
          assessed_on: string;
          created_at?: string;
          created_by?: string | null;
          dimension_results?: Json;
          evaluator: string;
          id?: string;
          method_version?: number;
          overall_score?: number;
          published?: boolean;
          published_at?: string | null;
          scores: Json;
          updated_at?: string;
          verdict: Database["public"]["Enums"]["evaluation_verdict"];
          vessel_id: string;
        };
        Update: {
          assessed_on?: string;
          created_at?: string;
          created_by?: string | null;
          dimension_results?: Json;
          evaluator?: string;
          id?: string;
          method_version?: number;
          overall_score?: number;
          published?: boolean;
          published_at?: string | null;
          scores?: Json;
          updated_at?: string;
          verdict?: Database["public"]["Enums"]["evaluation_verdict"];
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evaluations_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      external_ratings: {
        Row: {
          created_at: string;
          id: string;
          rating: number;
          retrieved_on: string;
          review_count: number | null;
          scale: number;
          source_name: string;
          updated_at: string;
          url: string | null;
          vessel_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          rating: number;
          retrieved_on: string;
          review_count?: number | null;
          scale: number;
          source_name: string;
          updated_at?: string;
          url?: string | null;
          vessel_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          rating?: number;
          retrieved_on?: string;
          review_count?: number | null;
          scale?: number;
          source_name?: string;
          updated_at?: string;
          url?: string | null;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "external_ratings_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
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
      org_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          org_id: string;
          revoked_at: string | null;
          team_role: Database["public"]["Enums"]["team_role"];
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          org_id: string;
          revoked_at?: string | null;
          team_role: Database["public"]["Enums"]["team_role"];
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          org_id?: string;
          revoked_at?: string | null;
          team_role?: Database["public"]["Enums"]["team_role"];
        };
        Relationships: [
          {
            foreignKeyName: "org_invitations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
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
          status_reason: string | null;
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
          status_reason?: string | null;
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
          status_reason?: string | null;
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
      safety_observations: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          notes: string;
          observed_on: string;
          status: Database["public"]["Enums"]["safety_status"];
          updated_at: string;
          vessel_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          notes: string;
          observed_on: string;
          status?: Database["public"]["Enums"]["safety_status"];
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          notes?: string;
          observed_on?: string;
          status?: Database["public"]["Enums"]["safety_status"];
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "safety_observations_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      vessel_import_batches: {
        Row: {
          created_at: string;
          created_by: string | null;
          file_name: string;
          id: string;
          imported_at: string | null;
          rows: Json;
          status: string;
          summary: Json;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          file_name: string;
          id?: string;
          imported_at?: string | null;
          rows: Json;
          status?: string;
          summary?: Json;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          file_name?: string;
          id?: string;
          imported_at?: string | null;
          rows?: Json;
          status?: string;
          summary?: Json;
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
      vessel_submission_events: {
        Row: {
          actor: string | null;
          event: Database["public"]["Enums"]["submission_event"];
          id: number;
          message: string | null;
          occurred_at: string;
          submission_id: string;
        };
        Insert: {
          actor?: string | null;
          event: Database["public"]["Enums"]["submission_event"];
          id?: never;
          message?: string | null;
          occurred_at?: string;
          submission_id: string;
        };
        Update: {
          actor?: string | null;
          event?: Database["public"]["Enums"]["submission_event"];
          id?: never;
          message?: string | null;
          occurred_at?: string;
          submission_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vessel_submission_events_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "vessel_submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      vessel_submissions: {
        Row: {
          created_at: string;
          created_by: string | null;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          org_id: string;
          proposal: Json;
          status: Database["public"]["Enums"]["submission_status"];
          submitted_at: string | null;
          updated_at: string;
          vessel_id: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          org_id: string;
          proposal?: Json;
          status?: Database["public"]["Enums"]["submission_status"];
          submitted_at?: string | null;
          updated_at?: string;
          vessel_id?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          org_id?: string;
          proposal?: Json;
          status?: Database["public"]["Enums"]["submission_status"];
          submitted_at?: string | null;
          updated_at?: string;
          vessel_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vessel_submissions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vessel_submissions_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
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
          best_for: Database["public"]["Enums"]["best_for_label"][];
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
          showcase_reason: string | null;
          showcase_until: string | null;
          slug: string;
          source_ref: string | null;
          type: Database["public"]["Enums"]["vessel_type"];
          updated_at: string;
          visibility: Database["public"]["Enums"]["visibility"];
          year_built: number | null;
        };
        Insert: {
          best_for?: Database["public"]["Enums"]["best_for_label"][];
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
          showcase_reason?: string | null;
          showcase_until?: string | null;
          slug: string;
          source_ref?: string | null;
          type: Database["public"]["Enums"]["vessel_type"];
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["visibility"];
          year_built?: number | null;
        };
        Update: {
          best_for?: Database["public"]["Enums"]["best_for_label"][];
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
          showcase_reason?: string | null;
          showcase_until?: string | null;
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
      accept_invitation: { Args: { invitation: string }; Returns: string };
      apply_as_operator: {
        Args: { display_name: string; legal_name: string; registration: Json };
        Returns: string;
      };
      approve_submission: {
        Args: { new_slug?: string; target: string };
        Returns: string;
      };
      reject_submission: {
        Args: { note: string; target: string };
        Returns: undefined;
      };
      request_submission_changes: {
        Args: { note: string; target: string };
        Returns: undefined;
      };
      submit_submission: { Args: { target: string }; Returns: undefined };
    };
    Enums: {
      admin_role: "super" | "catalogue" | "finance" | "content";
      best_for_label:
        | "first_time_visitors"
        | "cabins"
        | "quiet_stays"
        | "food_lovers"
        | "families"
        | "couples"
        | "luxury_travellers"
        | "value"
        | "traditional_character"
        | "contemporary_design";
      evaluation_verdict: "recommended" | "recommended_with_reservations" | "not_recommended";
      org_kind: "operator" | "partner" | "nilecruz";
      org_status: "applied" | "approved" | "paused" | "rejected";
      platform_role: "customer" | "admin";
      safety_status: "open" | "under_review" | "resolved";
      submission_event: "created" | "edited" | "submitted" | "changes_requested" | "approved" | "rejected";
      submission_status: "draft" | "submitted" | "changes_requested" | "approved" | "rejected";
      team_role: "owner" | "reservations" | "finance" | "viewer";
      vessel_category: "basic" | "standard" | "superior" | "deluxe" | "luxury";
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
      best_for_label: [
        "first_time_visitors",
        "cabins",
        "quiet_stays",
        "food_lovers",
        "families",
        "couples",
        "luxury_travellers",
        "value",
        "traditional_character",
        "contemporary_design",
      ],
      evaluation_verdict: ["recommended", "recommended_with_reservations", "not_recommended"],
      org_kind: ["operator", "partner", "nilecruz"],
      org_status: ["applied", "approved", "paused", "rejected"],
      platform_role: ["customer", "admin"],
      safety_status: ["open", "under_review", "resolved"],
      submission_event: ["created", "edited", "submitted", "changes_requested", "approved", "rejected"],
      submission_status: ["draft", "submitted", "changes_requested", "approved", "rejected"],
      team_role: ["owner", "reservations", "finance", "viewer"],
      vessel_category: ["basic", "standard", "superior", "deluxe", "luxury"],
      vessel_type: ["sail", "motor", "steam"],
      visibility: ["private", "showcase", "published"],
    },
  },
} as const;
