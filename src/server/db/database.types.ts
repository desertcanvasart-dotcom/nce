export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      allotments: {
        Row: {
          active: boolean;
          cabin_type_id: string;
          cabins: number;
          contract_ref: string | null;
          created_at: string;
          created_by: string | null;
          ends_on: string;
          id: string;
          notes: string | null;
          org_id: string;
          release_days: number;
          starts_on: string;
          updated_at: string;
          vessel_id: string;
        };
        Insert: {
          active?: boolean;
          cabin_type_id: string;
          cabins: number;
          contract_ref?: string | null;
          created_at?: string;
          created_by?: string | null;
          ends_on: string;
          id?: string;
          notes?: string | null;
          org_id: string;
          release_days?: number;
          starts_on: string;
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          active?: boolean;
          cabin_type_id?: string;
          cabins?: number;
          contract_ref?: string | null;
          created_at?: string;
          created_by?: string | null;
          ends_on?: string;
          id?: string;
          notes?: string | null;
          org_id?: string;
          release_days?: number;
          starts_on?: string;
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "allotments_cabin_type_id_fkey";
            columns: ["cabin_type_id"];
            isOneToOne: false;
            referencedRelation: "cabin_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "allotments_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "allotments_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      api_idempotency: {
        Row: {
          api_key_id: string | null;
          body_sha256: string;
          created_at: string;
          idempotency_key: string;
          org_id: string;
          response: Json | null;
          status_code: number | null;
        };
        Insert: {
          api_key_id?: string | null;
          body_sha256: string;
          created_at?: string;
          idempotency_key: string;
          org_id: string;
          response?: Json | null;
          status_code?: number | null;
        };
        Update: {
          api_key_id?: string | null;
          body_sha256?: string;
          created_at?: string;
          idempotency_key?: string;
          org_id?: string;
          response?: Json | null;
          status_code?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "api_idempotency_api_key_id_fkey";
            columns: ["api_key_id"];
            isOneToOne: false;
            referencedRelation: "api_keys";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "api_idempotency_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      api_keys: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          key_id: string;
          label: string;
          last_used_at: string | null;
          org_id: string;
          public_key: string;
          revoked_at: string | null;
          revoked_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          key_id: string;
          label: string;
          last_used_at?: string | null;
          org_id: string;
          public_key: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          key_id?: string;
          label?: string;
          last_used_at?: string | null;
          org_id?: string;
          public_key?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "api_keys_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
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
      booking_request_guests: {
        Row: {
          guests: Json;
          request_id: string;
        };
        Insert: {
          guests: Json;
          request_id: string;
        };
        Update: {
          guests?: Json;
          request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_request_guests_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: true;
            referencedRelation: "booking_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_requests: {
        Row: {
          alternative: Json | null;
          buyer_name: string | null;
          buyer_org_id: string | null;
          cabins: Json;
          client_reference: string | null;
          created_at: string;
          currency: string;
          customer_id: string;
          departure_id: string;
          escalated_at: string | null;
          guest_count: number;
          held: Json | null;
          hold_until: string | null;
          id: string;
          lead_nationality: string | null;
          org_id: string;
          reference: string;
          reminded_at: string | null;
          reservation_id: string | null;
          responded_at: string | null;
          responded_contact: string | null;
          response: string | null;
          response_channel: string | null;
          selling_total_minor: number | null;
          shown: Json;
          status: Database["public"]["Enums"]["booking_request_status"];
          total_minor: number;
          updated_at: string;
          vessel_id: string;
        };
        Insert: {
          alternative?: Json | null;
          buyer_name?: string | null;
          buyer_org_id?: string | null;
          cabins: Json;
          client_reference?: string | null;
          created_at?: string;
          currency: string;
          customer_id: string;
          departure_id: string;
          escalated_at?: string | null;
          guest_count: number;
          held?: Json | null;
          hold_until?: string | null;
          id?: string;
          lead_nationality?: string | null;
          org_id: string;
          reference: string;
          reminded_at?: string | null;
          reservation_id?: string | null;
          responded_at?: string | null;
          responded_contact?: string | null;
          response?: string | null;
          response_channel?: string | null;
          selling_total_minor?: number | null;
          shown?: Json;
          status?: Database["public"]["Enums"]["booking_request_status"];
          total_minor: number;
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          alternative?: Json | null;
          buyer_name?: string | null;
          buyer_org_id?: string | null;
          cabins?: Json;
          client_reference?: string | null;
          created_at?: string;
          currency?: string;
          customer_id?: string;
          departure_id?: string;
          escalated_at?: string | null;
          guest_count?: number;
          held?: Json | null;
          hold_until?: string | null;
          id?: string;
          lead_nationality?: string | null;
          org_id?: string;
          reference?: string;
          reminded_at?: string | null;
          reservation_id?: string | null;
          responded_at?: string | null;
          responded_contact?: string | null;
          response?: string | null;
          response_channel?: string | null;
          selling_total_minor?: number | null;
          shown?: Json;
          status?: Database["public"]["Enums"]["booking_request_status"];
          total_minor?: number;
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_requests_buyer_org_id_fkey";
            columns: ["buyer_org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_requests_departure_id_fkey";
            columns: ["departure_id"];
            isOneToOne: false;
            referencedRelation: "departures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_requests_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_requests_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_requests_responded_contact_fkey";
            columns: ["responded_contact"];
            isOneToOne: false;
            referencedRelation: "operator_contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_requests_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      cabin_type_translations: {
        Row: {
          cabin_type_id: string;
          description: string | null;
          locale: string;
          name: string | null;
        };
        Insert: {
          cabin_type_id: string;
          description?: string | null;
          locale: string;
          name?: string | null;
        };
        Update: {
          cabin_type_id?: string;
          description?: string | null;
          locale?: string;
          name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cabin_type_translations_cabin_type_id_fkey";
            columns: ["cabin_type_id"];
            isOneToOne: false;
            referencedRelation: "cabin_types";
            referencedColumns: ["id"];
          },
        ];
      };
      cabin_types: {
        Row: {
          active: boolean;
          amenities: string[];
          balcony: boolean;
          bed_configuration: string | null;
          cabin_count: number | null;
          code: string;
          created_at: string;
          deck: string;
          id: string;
          max_occupancy: number;
          name: string;
          size_m2: number | null;
          sort_order: number;
          updated_at: string;
          vessel_id: string;
          view: string | null;
        };
        Insert: {
          active?: boolean;
          amenities?: string[];
          balcony?: boolean;
          bed_configuration?: string | null;
          cabin_count?: number | null;
          code: string;
          created_at?: string;
          deck: string;
          id?: string;
          max_occupancy?: number;
          name: string;
          size_m2?: number | null;
          sort_order?: number;
          updated_at?: string;
          vessel_id: string;
          view?: string | null;
        };
        Update: {
          active?: boolean;
          amenities?: string[];
          balcony?: boolean;
          bed_configuration?: string | null;
          cabin_count?: number | null;
          code?: string;
          created_at?: string;
          deck?: string;
          id?: string;
          max_occupancy?: number;
          name?: string;
          size_m2?: number | null;
          sort_order?: number;
          updated_at?: string;
          vessel_id?: string;
          view?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cabin_types_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      cancellation_policies: {
        Row: {
          bands: Json;
          created_at: string;
          id: string;
          schedule_id: string | null;
          updated_at: string;
          vessel_id: string;
        };
        Insert: {
          bands: Json;
          created_at?: string;
          id?: string;
          schedule_id?: string | null;
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          bands?: Json;
          created_at?: string;
          id?: string;
          schedule_id?: string | null;
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cancellation_policies_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cancellation_policies_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      cancellation_policy_translations: {
        Row: {
          locale: string;
          policy_id: string;
          terms: string;
        };
        Insert: {
          locale: string;
          policy_id: string;
          terms: string;
        };
        Update: {
          locale?: string;
          policy_id?: string;
          terms?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cancellation_policy_translations_policy_id_fkey";
            columns: ["policy_id"];
            isOneToOne: false;
            referencedRelation: "cancellation_policies";
            referencedColumns: ["id"];
          },
        ];
      };
      cancellation_requests: {
        Row: {
          charge_minor: number;
          created_at: string;
          currency: string;
          days_before: number;
          decided_at: string | null;
          decided_by: string | null;
          decision_note: string | null;
          id: string;
          operator_note: string | null;
          operator_review: Database["public"]["Enums"]["operator_review"];
          operator_reviewed_at: string | null;
          operator_reviewed_by: string | null;
          paid_minor: number;
          percent: number;
          reason: string | null;
          refund_minor: number;
          requested_by: string | null;
          requested_on: string;
          reservation_id: string;
          status: Database["public"]["Enums"]["cancellation_status"];
          total_minor: number;
          unpaid_charge_minor: number;
          updated_at: string;
        };
        Insert: {
          charge_minor: number;
          created_at?: string;
          currency: string;
          days_before: number;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_note?: string | null;
          id?: string;
          operator_note?: string | null;
          operator_review?: Database["public"]["Enums"]["operator_review"];
          operator_reviewed_at?: string | null;
          operator_reviewed_by?: string | null;
          paid_minor: number;
          percent: number;
          reason?: string | null;
          refund_minor: number;
          requested_by?: string | null;
          requested_on: string;
          reservation_id: string;
          status?: Database["public"]["Enums"]["cancellation_status"];
          total_minor: number;
          unpaid_charge_minor: number;
          updated_at?: string;
        };
        Update: {
          charge_minor?: number;
          created_at?: string;
          currency?: string;
          days_before?: number;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_note?: string | null;
          id?: string;
          operator_note?: string | null;
          operator_review?: Database["public"]["Enums"]["operator_review"];
          operator_reviewed_at?: string | null;
          operator_reviewed_by?: string | null;
          paid_minor?: number;
          percent?: number;
          reason?: string | null;
          refund_minor?: number;
          requested_by?: string | null;
          requested_on?: string;
          reservation_id?: string;
          status?: Database["public"]["Enums"]["cancellation_status"];
          total_minor?: number;
          unpaid_charge_minor?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cancellation_requests_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      commission_entries: {
        Row: {
          base_minor: number;
          commission_bp: number;
          commission_minor: number;
          created_at: string;
          currency: string;
          id: string;
          kind: Database["public"]["Enums"]["commission_kind"];
          org_id: string;
          payable_minor: number;
          payment_id: string;
          reservation_id: string;
        };
        Insert: {
          base_minor: number;
          commission_bp: number;
          commission_minor: number;
          created_at?: string;
          currency: string;
          id?: string;
          kind: Database["public"]["Enums"]["commission_kind"];
          org_id: string;
          payable_minor: number;
          payment_id: string;
          reservation_id: string;
        };
        Update: {
          base_minor?: number;
          commission_bp?: number;
          commission_minor?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["commission_kind"];
          org_id?: string;
          payable_minor?: number;
          payment_id?: string;
          reservation_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "commission_entries_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commission_entries_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commission_entries_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_messages: {
        Row: {
          created_at: string;
          email: string;
          handled_at: string | null;
          handled_by: string | null;
          id: string;
          message: string;
          name: string;
          topic: Database["public"]["Enums"]["contact_topic"];
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          message: string;
          name: string;
          topic?: Database["public"]["Enums"]["contact_topic"];
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          message?: string;
          name?: string;
          topic?: Database["public"]["Enums"]["contact_topic"];
          user_id?: string | null;
        };
        Relationships: [];
      };
      cruise_requests: {
        Row: {
          adults: number;
          budget_currency: string | null;
          budget_minor: number | null;
          buyer_name: string | null;
          buyer_org_id: string | null;
          cabin_notes: string | null;
          cabins: number;
          child_ages: number[];
          created_at: string;
          customer_id: string;
          destination: string | null;
          earliest_departure: string;
          id: string;
          latest_departure: string;
          latest_finish: string | null;
          nights_max: number;
          nights_min: number;
          notes: string | null;
          origin: string | null;
          status: Database["public"]["Enums"]["request_status"];
          updated_at: string;
        };
        Insert: {
          adults: number;
          budget_currency?: string | null;
          budget_minor?: number | null;
          buyer_name?: string | null;
          buyer_org_id?: string | null;
          cabin_notes?: string | null;
          cabins: number;
          child_ages?: number[];
          created_at?: string;
          customer_id?: string;
          destination?: string | null;
          earliest_departure: string;
          id?: string;
          latest_departure: string;
          latest_finish?: string | null;
          nights_max: number;
          nights_min: number;
          notes?: string | null;
          origin?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          updated_at?: string;
        };
        Update: {
          adults?: number;
          budget_currency?: string | null;
          budget_minor?: number | null;
          buyer_name?: string | null;
          buyer_org_id?: string | null;
          cabin_notes?: string | null;
          cabins?: number;
          child_ages?: number[];
          created_at?: string;
          customer_id?: string;
          destination?: string | null;
          earliest_departure?: string;
          id?: string;
          latest_departure?: string;
          latest_finish?: string | null;
          nights_max?: number;
          nights_min?: number;
          notes?: string | null;
          origin?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cruise_requests_buyer_org_id_fkey";
            columns: ["buyer_org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      departures: {
        Row: {
          created_at: string;
          departs_on: string;
          id: string;
          returns_on: string;
          schedule_id: string;
          status: Database["public"]["Enums"]["departure_status"];
          updated_at: string;
          vessel_id: string;
        };
        Insert: {
          created_at?: string;
          departs_on: string;
          id?: string;
          returns_on: string;
          schedule_id: string;
          status?: Database["public"]["Enums"]["departure_status"];
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          created_at?: string;
          departs_on?: string;
          id?: string;
          returns_on?: string;
          schedule_id?: string;
          status?: Database["public"]["Enums"]["departure_status"];
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "departures_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "departures_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
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
      eligibility_proofs: {
        Row: {
          created_at: string;
          id: string;
          note: string | null;
          reservation_id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["proof_status"];
          storage_path: string;
          uploaded_by: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          note?: string | null;
          reservation_id: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["proof_status"];
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          note?: string | null;
          reservation_id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["proof_status"];
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "eligibility_proofs_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
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
      freesales: {
        Row: {
          active: boolean;
          cabin_type_id: string | null;
          contract_ref: string | null;
          created_at: string;
          created_by: string | null;
          ends_on: string;
          id: string;
          notes: string | null;
          org_id: string;
          starts_on: string;
          updated_at: string;
          vessel_id: string;
        };
        Insert: {
          active?: boolean;
          cabin_type_id?: string | null;
          contract_ref?: string | null;
          created_at?: string;
          created_by?: string | null;
          ends_on: string;
          id?: string;
          notes?: string | null;
          org_id: string;
          starts_on: string;
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          active?: boolean;
          cabin_type_id?: string | null;
          contract_ref?: string | null;
          created_at?: string;
          created_by?: string | null;
          ends_on?: string;
          id?: string;
          notes?: string | null;
          org_id?: string;
          starts_on?: string;
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "freesales_cabin_type_id_fkey";
            columns: ["cabin_type_id"];
            isOneToOne: false;
            referencedRelation: "cabin_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "freesales_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "freesales_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      holds: {
        Row: {
          booking_request_id: string | null;
          cabin_type_id: string;
          cabins: number;
          created_at: string;
          created_by: string | null;
          departure_id: string;
          ended_at: string | null;
          ended_by: string | null;
          expires_at: string;
          id: string;
          note: string | null;
          org_id: string;
          status: Database["public"]["Enums"]["hold_status"];
          updated_at: string;
          vessel_id: string;
        };
        Insert: {
          booking_request_id?: string | null;
          cabin_type_id: string;
          cabins: number;
          created_at?: string;
          created_by?: string | null;
          departure_id: string;
          ended_at?: string | null;
          ended_by?: string | null;
          expires_at: string;
          id?: string;
          note?: string | null;
          org_id: string;
          status?: Database["public"]["Enums"]["hold_status"];
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          booking_request_id?: string | null;
          cabin_type_id?: string;
          cabins?: number;
          created_at?: string;
          created_by?: string | null;
          departure_id?: string;
          ended_at?: string | null;
          ended_by?: string | null;
          expires_at?: string;
          id?: string;
          note?: string | null;
          org_id?: string;
          status?: Database["public"]["Enums"]["hold_status"];
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "holds_booking_request_id_fkey";
            columns: ["booking_request_id"];
            isOneToOne: false;
            referencedRelation: "booking_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "holds_cabin_type_id_fkey";
            columns: ["cabin_type_id"];
            isOneToOne: false;
            referencedRelation: "cabin_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "holds_departure_id_fkey";
            columns: ["departure_id"];
            isOneToOne: false;
            referencedRelation: "departures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "holds_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "holds_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory: {
        Row: {
          available: number;
          cabin_type_id: string;
          confirmed_at: string;
          departure_id: string;
          source: Database["public"]["Enums"]["inventory_source"];
          vessel_id: string;
        };
        Insert: {
          available: number;
          cabin_type_id: string;
          confirmed_at?: string;
          departure_id: string;
          source?: Database["public"]["Enums"]["inventory_source"];
          vessel_id: string;
        };
        Update: {
          available?: number;
          cabin_type_id?: string;
          confirmed_at?: string;
          departure_id?: string;
          source?: Database["public"]["Enums"]["inventory_source"];
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_cabin_type_id_fkey";
            columns: ["cabin_type_id"];
            isOneToOne: false;
            referencedRelation: "cabin_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_departure_id_fkey";
            columns: ["departure_id"];
            isOneToOne: false;
            referencedRelation: "departures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_feeds: {
        Row: {
          consecutive_failures: number;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          last_attempt_at: string | null;
          last_error: string | null;
          last_rows_changed: number | null;
          last_success_at: string | null;
          next_pull_at: string | null;
          org_id: string;
          requested_by: string | null;
          status: Database["public"]["Enums"]["feed_status"];
          status_reason: string | null;
          updated_at: string;
          url: string;
        };
        Insert: {
          consecutive_failures?: number;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          last_attempt_at?: string | null;
          last_error?: string | null;
          last_rows_changed?: number | null;
          last_success_at?: string | null;
          next_pull_at?: string | null;
          org_id: string;
          requested_by?: string | null;
          status?: Database["public"]["Enums"]["feed_status"];
          status_reason?: string | null;
          updated_at?: string;
          url: string;
        };
        Update: {
          consecutive_failures?: number;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          last_attempt_at?: string | null;
          last_error?: string | null;
          last_rows_changed?: number | null;
          last_success_at?: string | null;
          next_pull_at?: string | null;
          org_id?: string;
          requested_by?: string | null;
          status?: Database["public"]["Enums"]["feed_status"];
          status_reason?: string | null;
          updated_at?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_feeds_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_runs: {
        Row: {
          api_key_id: string | null;
          created_at: string;
          created_by: string | null;
          error: string | null;
          feed_id: string | null;
          finished_at: string | null;
          id: string;
          label: string | null;
          org_id: string;
          results: Json;
          rows: Json | null;
          rows_changed: number;
          rows_failed: number;
          rows_received: number;
          rows_skipped: number;
          rows_unchanged: number;
          source: Database["public"]["Enums"]["inventory_source"];
          status: Database["public"]["Enums"]["inventory_run_status"];
        };
        Insert: {
          api_key_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          error?: string | null;
          feed_id?: string | null;
          finished_at?: string | null;
          id?: string;
          label?: string | null;
          org_id: string;
          results?: Json;
          rows?: Json | null;
          rows_changed?: number;
          rows_failed?: number;
          rows_received?: number;
          rows_skipped?: number;
          rows_unchanged?: number;
          source: Database["public"]["Enums"]["inventory_source"];
          status: Database["public"]["Enums"]["inventory_run_status"];
        };
        Update: {
          api_key_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          error?: string | null;
          feed_id?: string | null;
          finished_at?: string | null;
          id?: string;
          label?: string | null;
          org_id?: string;
          results?: Json;
          rows?: Json | null;
          rows_changed?: number;
          rows_failed?: number;
          rows_received?: number;
          rows_skipped?: number;
          rows_unchanged?: number;
          source?: Database["public"]["Enums"]["inventory_source"];
          status?: Database["public"]["Enums"]["inventory_run_status"];
        };
        Relationships: [
          {
            foreignKeyName: "inventory_runs_api_key_id_fkey";
            columns: ["api_key_id"];
            isOneToOne: false;
            referencedRelation: "api_keys";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_runs_feed_id_fkey";
            columns: ["feed_id"];
            isOneToOne: false;
            referencedRelation: "inventory_feeds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_runs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      media: {
        Row: {
          cabin_type_id: string | null;
          created_at: string;
          credit: string | null;
          destination_id: string | null;
          height: number;
          id: string;
          is_sample: boolean;
          sort_order: number;
          storage_path: string;
          tour_id: string | null;
          updated_at: string;
          vessel_id: string | null;
          width: number;
        };
        Insert: {
          cabin_type_id?: string | null;
          created_at?: string;
          credit?: string | null;
          destination_id?: string | null;
          height: number;
          id?: string;
          is_sample?: boolean;
          sort_order?: number;
          storage_path: string;
          tour_id?: string | null;
          updated_at?: string;
          vessel_id?: string | null;
          width: number;
        };
        Update: {
          cabin_type_id?: string | null;
          created_at?: string;
          credit?: string | null;
          destination_id?: string | null;
          height?: number;
          id?: string;
          is_sample?: boolean;
          sort_order?: number;
          storage_path?: string;
          tour_id?: string | null;
          updated_at?: string;
          vessel_id?: string | null;
          width?: number;
        };
        Relationships: [
          {
            foreignKeyName: "media_cabin_type_id_fkey";
            columns: ["cabin_type_id"];
            isOneToOne: false;
            referencedRelation: "cabin_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_destination_id_fkey";
            columns: ["destination_id"];
            isOneToOne: false;
            referencedRelation: "destinations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_tour_id_fkey";
            columns: ["tour_id"];
            isOneToOne: false;
            referencedRelation: "tours";
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
      notifications: {
        Row: {
          created_at: string;
          email_attempts: number;
          email_status: string;
          emailed_at: string | null;
          id: string;
          kind: string;
          link: string | null;
          org_id: string | null;
          read_at: string | null;
          title: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email_attempts?: number;
          email_status?: string;
          emailed_at?: string | null;
          id?: string;
          kind: string;
          link?: string | null;
          org_id?: string | null;
          read_at?: string | null;
          title: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email_attempts?: number;
          email_status?: string;
          emailed_at?: string | null;
          id?: string;
          kind?: string;
          link?: string | null;
          org_id?: string | null;
          read_at?: string | null;
          title?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      offer_cabins: {
        Row: {
          adults: number;
          cabin_name: string;
          cabin_type_id: string;
          child_ages: number[];
          deck: string;
          line: number;
          offer_id: string;
          price_minor: number;
        };
        Insert: {
          adults: number;
          cabin_name: string;
          cabin_type_id: string;
          child_ages?: number[];
          deck: string;
          line: number;
          offer_id: string;
          price_minor: number;
        };
        Update: {
          adults?: number;
          cabin_name?: string;
          cabin_type_id?: string;
          child_ages?: number[];
          deck?: string;
          line?: number;
          offer_id?: string;
          price_minor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "offer_cabins_cabin_type_id_fkey";
            columns: ["cabin_type_id"];
            isOneToOne: false;
            referencedRelation: "cabin_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offer_cabins_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "offers";
            referencedColumns: ["id"];
          },
        ];
      };
      offers: {
        Row: {
          created_at: string;
          created_by: string | null;
          currency: string;
          departure_id: string;
          eligibility_conditions: string;
          expires_at: string;
          gratuity_usd_minor: number | null;
          id: string;
          inclusions: string | null;
          list_total_minor: number | null;
          org_id: string;
          pricing_note: string | null;
          rate_plan: Database["public"]["Enums"]["rate_plan"];
          request_id: string;
          status: Database["public"]["Enums"]["offer_status"];
          terms: string;
          thread_id: string;
          total_minor: number;
          updated_at: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          currency: string;
          departure_id: string;
          eligibility_conditions: string;
          expires_at: string;
          gratuity_usd_minor?: number | null;
          id?: string;
          inclusions?: string | null;
          list_total_minor?: number | null;
          org_id: string;
          pricing_note?: string | null;
          rate_plan: Database["public"]["Enums"]["rate_plan"];
          request_id: string;
          status?: Database["public"]["Enums"]["offer_status"];
          terms: string;
          thread_id?: string;
          total_minor: number;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          departure_id?: string;
          eligibility_conditions?: string;
          expires_at?: string;
          gratuity_usd_minor?: number | null;
          id?: string;
          inclusions?: string | null;
          list_total_minor?: number | null;
          org_id?: string;
          pricing_note?: string | null;
          rate_plan?: Database["public"]["Enums"]["rate_plan"];
          request_id?: string;
          status?: Database["public"]["Enums"]["offer_status"];
          terms?: string;
          thread_id?: string;
          total_minor?: number;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "offers_departure_id_fkey";
            columns: ["departure_id"];
            isOneToOne: false;
            referencedRelation: "departures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "cruise_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      operator_aliases: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          kind: string;
          org_id: string;
          sheet_name: string;
          target: string;
          vessel_slug: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind: string;
          org_id: string;
          sheet_name: string;
          target: string;
          vessel_slug?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: string;
          org_id?: string;
          sheet_name?: string;
          target?: string;
          vessel_slug?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "operator_aliases_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      operator_contacts: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          org_id: string;
          reservations: boolean;
          sheets: boolean;
          updated_at: string;
          whatsapp: string | null;
          whatsapp_opt_in_at: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          org_id: string;
          reservations?: boolean;
          sheets?: boolean;
          updated_at?: string;
          whatsapp?: string | null;
          whatsapp_opt_in_at?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          org_id?: string;
          reservations?: boolean;
          sheets?: boolean;
          updated_at?: string;
          whatsapp?: string | null;
          whatsapp_opt_in_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "operator_contacts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      operator_settings: {
        Row: {
          clean_imports: number;
          data_accuracy_low: boolean;
          org_id: string;
          reply_sla_hours: number;
          sheet_ack: boolean;
          sheet_auto_confirm: boolean;
          updated_at: string;
        };
        Insert: {
          clean_imports?: number;
          data_accuracy_low?: boolean;
          org_id: string;
          reply_sla_hours?: number;
          sheet_ack?: boolean;
          sheet_auto_confirm?: boolean;
          updated_at?: string;
        };
        Update: {
          clean_imports?: number;
          data_accuracy_low?: boolean;
          org_id?: string;
          reply_sla_hours?: number;
          sheet_ack?: boolean;
          sheet_auto_confirm?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "operator_settings_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "organisations";
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
          child_bands: Json | null;
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
          child_bands?: Json | null;
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
          child_bands?: Json | null;
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
      outbound_messages: {
        Row: {
          body_text: string | null;
          booking_request_id: string | null;
          channel: string;
          created_at: string;
          error: string | null;
          id: string;
          kind: string;
          org_id: string | null;
          provider_id: string | null;
          status: string;
          subject: string | null;
          to_address: string;
        };
        Insert: {
          body_text?: string | null;
          booking_request_id?: string | null;
          channel: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          kind: string;
          org_id?: string | null;
          provider_id?: string | null;
          status: string;
          subject?: string | null;
          to_address: string;
        };
        Update: {
          body_text?: string | null;
          booking_request_id?: string | null;
          channel?: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          kind?: string;
          org_id?: string | null;
          provider_id?: string | null;
          status?: string;
          subject?: string | null;
          to_address?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outbound_messages_booking_request_id_fkey";
            columns: ["booking_request_id"];
            isOneToOne: false;
            referencedRelation: "booking_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outbound_messages_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_booking_details: {
        Row: {
          client_reference: string | null;
          org_id: string;
          reservation_id: string;
          selling_total_minor: number | null;
          updated_at: string;
        };
        Insert: {
          client_reference?: string | null;
          org_id: string;
          reservation_id: string;
          selling_total_minor?: number | null;
          updated_at?: string;
        };
        Update: {
          client_reference?: string | null;
          org_id?: string;
          reservation_id?: string;
          selling_total_minor?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_booking_details_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_booking_details_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: true;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_rates: {
        Row: {
          amount_minor: number;
          cabin_type_id: string;
          child_bands: Json;
          created_at: string;
          currency: string;
          departure_id: string;
          id: string;
          occupancy: number;
          partner_org_id: string;
          updated_at: string;
          vessel_id: string;
        };
        Insert: {
          amount_minor: number;
          cabin_type_id: string;
          child_bands?: Json;
          created_at?: string;
          currency: string;
          departure_id: string;
          id?: string;
          occupancy: number;
          partner_org_id: string;
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          amount_minor?: number;
          cabin_type_id?: string;
          child_bands?: Json;
          created_at?: string;
          currency?: string;
          departure_id?: string;
          id?: string;
          occupancy?: number;
          partner_org_id?: string;
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_rates_cabin_type_id_fkey";
            columns: ["cabin_type_id"];
            isOneToOne: false;
            referencedRelation: "cabin_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_rates_departure_id_fkey";
            columns: ["departure_id"];
            isOneToOne: false;
            referencedRelation: "departures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_rates_partner_org_id_fkey";
            columns: ["partner_org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_rates_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      passengers: {
        Row: {
          date_of_birth: string;
          full_name: string;
          id: string;
          nationality: string | null;
          position: number;
          reservation_id: string;
        };
        Insert: {
          date_of_birth: string;
          full_name: string;
          id?: string;
          nationality?: string | null;
          position: number;
          reservation_id: string;
        };
        Update: {
          date_of_birth?: string;
          full_name?: string;
          id?: string;
          nationality?: string | null;
          position?: number;
          reservation_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "passengers_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_minor: number;
          created_at: string;
          currency: string;
          id: string;
          method: Database["public"]["Enums"]["payment_method"];
          note: string | null;
          paid_on: string | null;
          proof_path: string | null;
          receipt_number: string | null;
          reference: string | null;
          reported_by: string | null;
          reservation_id: string;
          status: Database["public"]["Enums"]["payment_status"];
          stripe_payment_intent_id: string | null;
          stripe_refund_id: string | null;
          stripe_session_id: string | null;
          updated_at: string;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          amount_minor: number;
          created_at?: string;
          currency: string;
          id?: string;
          method: Database["public"]["Enums"]["payment_method"];
          note?: string | null;
          paid_on?: string | null;
          proof_path?: string | null;
          receipt_number?: string | null;
          reference?: string | null;
          reported_by?: string | null;
          reservation_id: string;
          status: Database["public"]["Enums"]["payment_status"];
          stripe_payment_intent_id?: string | null;
          stripe_refund_id?: string | null;
          stripe_session_id?: string | null;
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          amount_minor?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          note?: string | null;
          paid_on?: string | null;
          proof_path?: string | null;
          receipt_number?: string | null;
          reference?: string | null;
          reported_by?: string | null;
          reservation_id?: string;
          status?: Database["public"]["Enums"]["payment_status"];
          stripe_payment_intent_id?: string | null;
          stripe_refund_id?: string | null;
          stripe_session_id?: string | null;
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      payouts: {
        Row: {
          amount_minor: number;
          created_at: string;
          currency: string;
          id: string;
          method: string;
          note: string | null;
          org_id: string;
          paid_on: string;
          recorded_by: string | null;
          reference: string | null;
        };
        Insert: {
          amount_minor: number;
          created_at?: string;
          currency: string;
          id?: string;
          method: string;
          note?: string | null;
          org_id: string;
          paid_on: string;
          recorded_by?: string | null;
          reference?: string | null;
        };
        Update: {
          amount_minor?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          method?: string;
          note?: string | null;
          org_id?: string;
          paid_on?: string;
          recorded_by?: string | null;
          reference?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payouts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_settings: {
        Row: {
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      premium_periods: {
        Row: {
          created_at: string;
          ends_on: string;
          id: string;
          name: string;
          starts_on: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          ends_on: string;
          id?: string;
          name: string;
          starts_on: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ends_on?: string;
          id?: string;
          name?: string;
          starts_on?: string;
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
          optional_emails: boolean;
          platform_role: Database["public"]["Enums"]["platform_role"];
          updated_at: string;
        };
        Insert: {
          admin_role?: Database["public"]["Enums"]["admin_role"] | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          locale?: string;
          optional_emails?: boolean;
          platform_role?: Database["public"]["Enums"]["platform_role"];
          updated_at?: string;
        };
        Update: {
          admin_role?: Database["public"]["Enums"]["admin_role"] | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          locale?: string;
          optional_emails?: boolean;
          platform_role?: Database["public"]["Enums"]["platform_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      program_items: {
        Row: {
          day_number: number;
          program_id: string;
          tour_id: string;
        };
        Insert: {
          day_number: number;
          program_id: string;
          tour_id: string;
        };
        Update: {
          day_number?: number;
          program_id?: string;
          tour_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "program_items_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "program_items_tour_id_fkey";
            columns: ["tour_id"];
            isOneToOne: false;
            referencedRelation: "tours";
            referencedColumns: ["id"];
          },
        ];
      };
      program_schedules: {
        Row: {
          program_id: string;
          schedule_id: string;
        };
        Insert: {
          program_id: string;
          schedule_id: string;
        };
        Update: {
          program_id?: string;
          schedule_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "program_schedules_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "program_schedules_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          },
        ];
      };
      program_translations: {
        Row: {
          description: string | null;
          locale: string;
          program_id: string;
          updated_at: string;
        };
        Insert: {
          description?: string | null;
          locale: string;
          program_id: string;
          updated_at?: string;
        };
        Update: {
          description?: string | null;
          locale?: string;
          program_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "program_translations_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
        ];
      };
      programs: {
        Row: {
          created_at: string;
          days: number;
          id: string;
          is_sample: boolean;
          name: string;
          updated_at: string;
          visibility: Database["public"]["Enums"]["visibility"];
        };
        Insert: {
          created_at?: string;
          days: number;
          id?: string;
          is_sample?: boolean;
          name: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Update: {
          created_at?: string;
          days?: number;
          id?: string;
          is_sample?: boolean;
          name?: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Relationships: [];
      };
      promotion_rates: {
        Row: {
          promotion_id: string;
          rate_id: string;
        };
        Insert: {
          promotion_id: string;
          rate_id: string;
        };
        Update: {
          promotion_id?: string;
          rate_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promotion_rates_promotion_id_fkey";
            columns: ["promotion_id"];
            isOneToOne: false;
            referencedRelation: "promotions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotion_rates_rate_id_fkey";
            columns: ["rate_id"];
            isOneToOne: true;
            referencedRelation: "rates";
            referencedColumns: ["id"];
          },
        ];
      };
      promotion_translations: {
        Row: {
          benefit: string;
          locale: string;
          promotion_id: string;
          terms: string | null;
        };
        Insert: {
          benefit: string;
          locale: string;
          promotion_id: string;
          terms?: string | null;
        };
        Update: {
          benefit?: string;
          locale?: string;
          promotion_id?: string;
          terms?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "promotion_translations_promotion_id_fkey";
            columns: ["promotion_id"];
            isOneToOne: false;
            referencedRelation: "promotions";
            referencedColumns: ["id"];
          },
        ];
      };
      promotions: {
        Row: {
          booking_from: string | null;
          booking_to: string | null;
          created_at: string;
          created_by: string | null;
          departure_from: string | null;
          departure_to: string | null;
          fixed_amount_minor: number | null;
          fixed_currency: string | null;
          id: string;
          kind: Database["public"]["Enums"]["promotion_kind"];
          paused: boolean;
          percent: number | null;
          updated_at: string;
          upgrade_to_cabin_type_id: string | null;
          vessel_id: string;
        };
        Insert: {
          booking_from?: string | null;
          booking_to?: string | null;
          created_at?: string;
          created_by?: string | null;
          departure_from?: string | null;
          departure_to?: string | null;
          fixed_amount_minor?: number | null;
          fixed_currency?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["promotion_kind"];
          paused?: boolean;
          percent?: number | null;
          updated_at?: string;
          upgrade_to_cabin_type_id?: string | null;
          vessel_id: string;
        };
        Update: {
          booking_from?: string | null;
          booking_to?: string | null;
          created_at?: string;
          created_by?: string | null;
          departure_from?: string | null;
          departure_to?: string | null;
          fixed_amount_minor?: number | null;
          fixed_currency?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["promotion_kind"];
          paused?: boolean;
          percent?: number | null;
          updated_at?: string;
          upgrade_to_cabin_type_id?: string | null;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promotions_upgrade_to_cabin_type_id_fkey";
            columns: ["upgrade_to_cabin_type_id"];
            isOneToOne: false;
            referencedRelation: "cabin_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotions_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limit_hits: {
        Row: {
          bucket: string;
          hits: number;
          window_start: string;
        };
        Insert: {
          bucket: string;
          hits?: number;
          window_start: string;
        };
        Update: {
          bucket?: string;
          hits?: number;
          window_start?: string;
        };
        Relationships: [];
      };
      rates: {
        Row: {
          amount_minor: number;
          cabin_type_id: string;
          child_bands: Json;
          created_at: string;
          currency: string;
          departure_id: string;
          id: string;
          occupancy: number;
          rate_plan: Database["public"]["Enums"]["rate_plan"];
          updated_at: string;
          vessel_id: string;
        };
        Insert: {
          amount_minor: number;
          cabin_type_id: string;
          child_bands?: Json;
          created_at?: string;
          currency: string;
          departure_id: string;
          id?: string;
          occupancy: number;
          rate_plan?: Database["public"]["Enums"]["rate_plan"];
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          amount_minor?: number;
          cabin_type_id?: string;
          child_bands?: Json;
          created_at?: string;
          currency?: string;
          departure_id?: string;
          id?: string;
          occupancy?: number;
          rate_plan?: Database["public"]["Enums"]["rate_plan"];
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rates_cabin_type_id_fkey";
            columns: ["cabin_type_id"];
            isOneToOne: false;
            referencedRelation: "cabin_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rates_departure_id_fkey";
            columns: ["departure_id"];
            isOneToOne: false;
            referencedRelation: "departures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rates_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      refunds: {
        Row: {
          amount_minor: number;
          cancellation_id: string;
          created_at: string;
          currency: string;
          how: string | null;
          id: string;
          method: Database["public"]["Enums"]["refund_method"];
          payment_id: string;
          recorded_by: string | null;
          reference: string | null;
          reservation_id: string;
          stripe_refund_id: string | null;
        };
        Insert: {
          amount_minor: number;
          cancellation_id: string;
          created_at?: string;
          currency: string;
          how?: string | null;
          id?: string;
          method: Database["public"]["Enums"]["refund_method"];
          payment_id: string;
          recorded_by?: string | null;
          reference?: string | null;
          reservation_id: string;
          stripe_refund_id?: string | null;
        };
        Update: {
          amount_minor?: number;
          cancellation_id?: string;
          created_at?: string;
          currency?: string;
          how?: string | null;
          id?: string;
          method?: Database["public"]["Enums"]["refund_method"];
          payment_id?: string;
          recorded_by?: string | null;
          reference?: string | null;
          reservation_id?: string;
          stripe_refund_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "refunds_cancellation_id_fkey";
            columns: ["cancellation_id"];
            isOneToOne: false;
            referencedRelation: "cancellation_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      reservation_cabins: {
        Row: {
          adults: number;
          allotment_id: string | null;
          cabin_name: string;
          cabin_type_id: string;
          child_ages: number[];
          deck: string;
          line: number;
          price_minor: number;
          reservation_id: string;
          supplement_minor: number;
        };
        Insert: {
          adults: number;
          allotment_id?: string | null;
          cabin_name: string;
          cabin_type_id: string;
          child_ages: number[];
          deck: string;
          line: number;
          price_minor: number;
          reservation_id: string;
          supplement_minor?: number;
        };
        Update: {
          adults?: number;
          allotment_id?: string | null;
          cabin_name?: string;
          cabin_type_id?: string;
          child_ages?: number[];
          deck?: string;
          line?: number;
          price_minor?: number;
          reservation_id?: string;
          supplement_minor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "reservation_cabins_allotment_id_fkey";
            columns: ["allotment_id"];
            isOneToOne: false;
            referencedRelation: "allotments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservation_cabins_cabin_type_id_fkey";
            columns: ["cabin_type_id"];
            isOneToOne: false;
            referencedRelation: "cabin_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservation_cabins_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      reservation_reminders: {
        Row: {
          reservation_id: string;
          sent_at: string;
          which: string;
        };
        Insert: {
          reservation_id: string;
          sent_at?: string;
          which: string;
        };
        Update: {
          reservation_id?: string;
          sent_at?: string;
          which?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservation_reminders_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      reservations: {
        Row: {
          booked_by: string | null;
          booked_on: string;
          buyer_name: string | null;
          buyer_org_id: string | null;
          cancelled_at: string | null;
          cancelled_reason: string | null;
          created_at: string;
          currency: string;
          customer_id: string;
          deadline_rule: string;
          departure_id: string;
          direct: boolean;
          gratuity_usd_minor: number | null;
          id: string;
          offer_id: string | null;
          org_id: string;
          package: string;
          payment_due_at: string;
          policy: Json;
          rate_plan: Database["public"]["Enums"]["rate_plan"];
          reference: string;
          request_id: string | null;
          seller_name: string | null;
          sightseeing: Json | null;
          status: Database["public"]["Enums"]["reservation_status"];
          terms: string;
          total_minor: number;
          updated_at: string;
          vessel_id: string;
        };
        Insert: {
          booked_by?: string | null;
          booked_on: string;
          buyer_name?: string | null;
          buyer_org_id?: string | null;
          cancelled_at?: string | null;
          cancelled_reason?: string | null;
          created_at?: string;
          currency: string;
          customer_id: string;
          deadline_rule: string;
          departure_id: string;
          direct?: boolean;
          gratuity_usd_minor?: number | null;
          id?: string;
          offer_id?: string | null;
          org_id: string;
          package?: string;
          payment_due_at: string;
          policy: Json;
          rate_plan: Database["public"]["Enums"]["rate_plan"];
          reference: string;
          request_id?: string | null;
          seller_name?: string | null;
          sightseeing?: Json | null;
          status?: Database["public"]["Enums"]["reservation_status"];
          terms: string;
          total_minor: number;
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          booked_by?: string | null;
          booked_on?: string;
          buyer_name?: string | null;
          buyer_org_id?: string | null;
          cancelled_at?: string | null;
          cancelled_reason?: string | null;
          created_at?: string;
          currency?: string;
          customer_id?: string;
          deadline_rule?: string;
          departure_id?: string;
          direct?: boolean;
          gratuity_usd_minor?: number | null;
          id?: string;
          offer_id?: string | null;
          org_id?: string;
          package?: string;
          payment_due_at?: string;
          policy?: Json;
          rate_plan?: Database["public"]["Enums"]["rate_plan"];
          reference?: string;
          request_id?: string | null;
          seller_name?: string | null;
          sightseeing?: Json | null;
          status?: Database["public"]["Enums"]["reservation_status"];
          terms?: string;
          total_minor?: number;
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_buyer_org_id_fkey";
            columns: ["buyer_org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_departure_id_fkey";
            columns: ["departure_id"];
            isOneToOne: false;
            referencedRelation: "departures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: true;
            referencedRelation: "offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "cruise_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
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
      schedule_days: {
        Row: {
          day_number: number;
          description: string | null;
          locale: string;
          schedule_id: string;
          title: string;
        };
        Insert: {
          day_number: number;
          description?: string | null;
          locale: string;
          schedule_id: string;
          title: string;
        };
        Update: {
          day_number?: number;
          description?: string | null;
          locale?: string;
          schedule_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_days_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_periods: {
        Row: {
          ends_on: string;
          id: string;
          schedule_id: string;
          starts_on: string;
        };
        Insert: {
          ends_on: string;
          id?: string;
          schedule_id: string;
          starts_on: string;
        };
        Update: {
          ends_on?: string;
          id?: string;
          schedule_id?: string;
          starts_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_periods_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_sightseeing: {
        Row: {
          guide: boolean;
          note: string | null;
          schedule_id: string;
          sites: string[];
          tickets_included: boolean;
          updated_at: string;
          vessel_id: string;
        };
        Insert: {
          guide: boolean;
          note?: string | null;
          schedule_id: string;
          sites: string[];
          tickets_included: boolean;
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          guide?: boolean;
          note?: string | null;
          schedule_id?: string;
          sites?: string[];
          tickets_included?: boolean;
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_sightseeing_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: true;
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_sightseeing_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      schedules: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          destination: string;
          id: string;
          nights: number;
          origin: string;
          sailing_days: number[];
          sailing_period: Database["public"]["Enums"]["sailing_period"] | null;
          sails_at: string | null;
          updated_at: string;
          vessel_id: string;
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          destination: string;
          id?: string;
          nights: number;
          origin: string;
          sailing_days: number[];
          sailing_period?: Database["public"]["Enums"]["sailing_period"] | null;
          sails_at?: string | null;
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          destination?: string;
          id?: string;
          nights?: number;
          origin?: string;
          sailing_days?: number[];
          sailing_period?: Database["public"]["Enums"]["sailing_period"] | null;
          sails_at?: string | null;
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedules_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      sheet_ingests: {
        Row: {
          auto_confirmed: boolean;
          body_text: string | null;
          channel: Database["public"]["Enums"]["sheet_channel"];
          content_type: string | null;
          created_at: string;
          edited: boolean;
          error: string | null;
          file_name: string | null;
          file_path: string | null;
          id: string;
          notes: Json;
          org_id: string | null;
          parser_version: string | null;
          raw_rows: Json | null;
          received_at: string;
          reviewed_at: string | null;
          reviewer: string | null;
          rows: Json | null;
          run_id: string | null;
          sender: string | null;
          sheet_date: string | null;
          size_bytes: number | null;
          status: Database["public"]["Enums"]["sheet_status"];
          unmatched: Json;
          updated_at: string;
        };
        Insert: {
          auto_confirmed?: boolean;
          body_text?: string | null;
          channel: Database["public"]["Enums"]["sheet_channel"];
          content_type?: string | null;
          created_at?: string;
          edited?: boolean;
          error?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          id?: string;
          notes?: Json;
          org_id?: string | null;
          parser_version?: string | null;
          raw_rows?: Json | null;
          received_at?: string;
          reviewed_at?: string | null;
          reviewer?: string | null;
          rows?: Json | null;
          run_id?: string | null;
          sender?: string | null;
          sheet_date?: string | null;
          size_bytes?: number | null;
          status?: Database["public"]["Enums"]["sheet_status"];
          unmatched?: Json;
          updated_at?: string;
        };
        Update: {
          auto_confirmed?: boolean;
          body_text?: string | null;
          channel?: Database["public"]["Enums"]["sheet_channel"];
          content_type?: string | null;
          created_at?: string;
          edited?: boolean;
          error?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          id?: string;
          notes?: Json;
          org_id?: string | null;
          parser_version?: string | null;
          raw_rows?: Json | null;
          received_at?: string;
          reviewed_at?: string | null;
          reviewer?: string | null;
          rows?: Json | null;
          run_id?: string | null;
          sender?: string | null;
          sheet_date?: string | null;
          size_bytes?: number | null;
          status?: Database["public"]["Enums"]["sheet_status"];
          unmatched?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sheet_ingests_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sheet_ingests_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "inventory_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      sightseeing_rates: {
        Row: {
          amount_minor: number;
          cabin_type_id: string;
          child_bands: Json;
          created_at: string;
          currency: string;
          departure_id: string;
          id: string;
          occupancy: number;
          rate_plan: Database["public"]["Enums"]["rate_plan"];
          updated_at: string;
          vessel_id: string;
        };
        Insert: {
          amount_minor: number;
          cabin_type_id: string;
          child_bands?: Json;
          created_at?: string;
          currency: string;
          departure_id: string;
          id?: string;
          occupancy: number;
          rate_plan?: Database["public"]["Enums"]["rate_plan"];
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          amount_minor?: number;
          cabin_type_id?: string;
          child_bands?: Json;
          created_at?: string;
          currency?: string;
          departure_id?: string;
          id?: string;
          occupancy?: number;
          rate_plan?: Database["public"]["Enums"]["rate_plan"];
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sightseeing_rates_cabin_type_id_fkey";
            columns: ["cabin_type_id"];
            isOneToOne: false;
            referencedRelation: "cabin_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sightseeing_rates_departure_id_fkey";
            columns: ["departure_id"];
            isOneToOne: false;
            referencedRelation: "departures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sightseeing_rates_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      stop_sales: {
        Row: {
          cabin_type_id: string | null;
          created_at: string;
          created_by: string | null;
          ends_on: string;
          id: string;
          lifted_at: string | null;
          lifted_by: string | null;
          org_id: string;
          reason: string | null;
          starts_on: string;
          updated_at: string;
          vessel_id: string;
        };
        Insert: {
          cabin_type_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          ends_on: string;
          id?: string;
          lifted_at?: string | null;
          lifted_by?: string | null;
          org_id: string;
          reason?: string | null;
          starts_on: string;
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          cabin_type_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          ends_on?: string;
          id?: string;
          lifted_at?: string | null;
          lifted_by?: string | null;
          org_id?: string;
          reason?: string | null;
          starts_on?: string;
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stop_sales_cabin_type_id_fkey";
            columns: ["cabin_type_id"];
            isOneToOne: false;
            referencedRelation: "cabin_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stop_sales_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stop_sales_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      supplements: {
        Row: {
          active: boolean;
          amount_minor: number;
          cabin_type_id: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          ends_on: string;
          id: string;
          kind: string;
          name: string;
          starts_on: string;
          updated_at: string;
          vessel_id: string;
        };
        Insert: {
          active?: boolean;
          amount_minor: number;
          cabin_type_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency: string;
          ends_on: string;
          id?: string;
          kind: string;
          name: string;
          starts_on: string;
          updated_at?: string;
          vessel_id: string;
        };
        Update: {
          active?: boolean;
          amount_minor?: number;
          cabin_type_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          ends_on?: string;
          id?: string;
          kind?: string;
          name?: string;
          starts_on?: string;
          updated_at?: string;
          vessel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supplements_cabin_type_id_fkey";
            columns: ["cabin_type_id"];
            isOneToOne: false;
            referencedRelation: "cabin_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplements_vessel_id_fkey";
            columns: ["vessel_id"];
            isOneToOne: false;
            referencedRelation: "vessels";
            referencedColumns: ["id"];
          },
        ];
      };
      tour_orders: {
        Row: {
          ages: number[];
          cancel_charge_minor: number | null;
          cancel_days_before: number | null;
          cancel_decided_at: string | null;
          cancel_decided_by: string | null;
          cancel_note: string | null;
          cancel_percent: number | null;
          cancel_reason: string | null;
          cancel_refund_minor: number | null;
          cancel_requested_on: string | null;
          cancel_state: Database["public"]["Enums"]["tour_cancel_state"] | null;
          cancelled_at: string | null;
          cancelled_reason: string | null;
          created_at: string;
          currency: string;
          customer_id: string;
          hold_until: string;
          id: string;
          label: string | null;
          lead_name: string;
          mode: Database["public"]["Enums"]["tour_rate_mode"];
          notes: string | null;
          policy: Json;
          rate_id: string | null;
          reference: string;
          reservation_id: string | null;
          session_id: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["tour_order_status"];
          total_minor: number;
          tour_id: string;
          updated_at: string;
          vehicle: string | null;
        };
        Insert: {
          ages: number[];
          cancel_charge_minor?: number | null;
          cancel_days_before?: number | null;
          cancel_decided_at?: string | null;
          cancel_decided_by?: string | null;
          cancel_note?: string | null;
          cancel_percent?: number | null;
          cancel_reason?: string | null;
          cancel_refund_minor?: number | null;
          cancel_requested_on?: string | null;
          cancel_state?: Database["public"]["Enums"]["tour_cancel_state"] | null;
          cancelled_at?: string | null;
          cancelled_reason?: string | null;
          created_at?: string;
          currency: string;
          customer_id: string;
          hold_until: string;
          id?: string;
          label?: string | null;
          lead_name: string;
          mode: Database["public"]["Enums"]["tour_rate_mode"];
          notes?: string | null;
          policy: Json;
          rate_id?: string | null;
          reference: string;
          reservation_id?: string | null;
          session_id?: string | null;
          starts_at: string;
          status?: Database["public"]["Enums"]["tour_order_status"];
          total_minor: number;
          tour_id: string;
          updated_at?: string;
          vehicle?: string | null;
        };
        Update: {
          ages?: number[];
          cancel_charge_minor?: number | null;
          cancel_days_before?: number | null;
          cancel_decided_at?: string | null;
          cancel_decided_by?: string | null;
          cancel_note?: string | null;
          cancel_percent?: number | null;
          cancel_reason?: string | null;
          cancel_refund_minor?: number | null;
          cancel_requested_on?: string | null;
          cancel_state?: Database["public"]["Enums"]["tour_cancel_state"] | null;
          cancelled_at?: string | null;
          cancelled_reason?: string | null;
          created_at?: string;
          currency?: string;
          customer_id?: string;
          hold_until?: string;
          id?: string;
          label?: string | null;
          lead_name?: string;
          mode?: Database["public"]["Enums"]["tour_rate_mode"];
          notes?: string | null;
          policy?: Json;
          rate_id?: string | null;
          reference?: string;
          reservation_id?: string | null;
          session_id?: string | null;
          starts_at?: string;
          status?: Database["public"]["Enums"]["tour_order_status"];
          total_minor?: number;
          tour_id?: string;
          updated_at?: string;
          vehicle?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tour_orders_rate_id_fkey";
            columns: ["rate_id"];
            isOneToOne: false;
            referencedRelation: "tour_rates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tour_orders_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tour_orders_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "tour_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tour_orders_tour_id_fkey";
            columns: ["tour_id"];
            isOneToOne: false;
            referencedRelation: "tours";
            referencedColumns: ["id"];
          },
        ];
      };
      tour_payments: {
        Row: {
          amount_minor: number;
          created_at: string;
          currency: string;
          id: string;
          note: string | null;
          order_id: string;
          receipt_number: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          stripe_payment_intent_id: string;
          stripe_refund_id: string | null;
          stripe_session_id: string | null;
        };
        Insert: {
          amount_minor: number;
          created_at?: string;
          currency: string;
          id?: string;
          note?: string | null;
          order_id: string;
          receipt_number?: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          stripe_payment_intent_id: string;
          stripe_refund_id?: string | null;
          stripe_session_id?: string | null;
        };
        Update: {
          amount_minor?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          note?: string | null;
          order_id?: string;
          receipt_number?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          stripe_payment_intent_id?: string;
          stripe_refund_id?: string | null;
          stripe_session_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tour_payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "tour_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      tour_rates: {
        Row: {
          active: boolean;
          created_at: string;
          currency: string;
          days: number[];
          id: string;
          label: string;
          lead_hours: number;
          max_guests: number;
          min_guests: number;
          mode: Database["public"]["Enums"]["tour_rate_mode"];
          prices: Json;
          start_times: string[];
          tickets_included: boolean | null;
          tour_id: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          currency?: string;
          days?: number[];
          id?: string;
          label?: string;
          lead_hours?: number;
          max_guests?: number;
          min_guests?: number;
          mode: Database["public"]["Enums"]["tour_rate_mode"];
          prices: Json;
          start_times?: string[];
          tickets_included?: boolean | null;
          tour_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          currency?: string;
          days?: number[];
          id?: string;
          label?: string;
          lead_hours?: number;
          max_guests?: number;
          min_guests?: number;
          mode?: Database["public"]["Enums"]["tour_rate_mode"];
          prices?: Json;
          start_times?: string[];
          tickets_included?: boolean | null;
          tour_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tour_rates_tour_id_fkey";
            columns: ["tour_id"];
            isOneToOne: false;
            referencedRelation: "tours";
            referencedColumns: ["id"];
          },
        ];
      };
      tour_refunds: {
        Row: {
          amount_minor: number;
          created_at: string;
          currency: string;
          how: string | null;
          id: string;
          method: Database["public"]["Enums"]["refund_method"];
          order_id: string;
          payment_id: string;
          recorded_by: string | null;
          reference: string | null;
          stripe_refund_id: string | null;
        };
        Insert: {
          amount_minor: number;
          created_at?: string;
          currency: string;
          how?: string | null;
          id?: string;
          method: Database["public"]["Enums"]["refund_method"];
          order_id: string;
          payment_id: string;
          recorded_by?: string | null;
          reference?: string | null;
          stripe_refund_id?: string | null;
        };
        Update: {
          amount_minor?: number;
          created_at?: string;
          currency?: string;
          how?: string | null;
          id?: string;
          method?: Database["public"]["Enums"]["refund_method"];
          order_id?: string;
          payment_id?: string;
          recorded_by?: string | null;
          reference?: string | null;
          stripe_refund_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tour_refunds_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "tour_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tour_refunds_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "tour_payments";
            referencedColumns: ["id"];
          },
        ];
      };
      tour_schedules: {
        Row: {
          schedule_id: string;
          tour_id: string;
        };
        Insert: {
          schedule_id: string;
          tour_id: string;
        };
        Update: {
          schedule_id?: string;
          tour_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tour_schedules_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tour_schedules_tour_id_fkey";
            columns: ["tour_id"];
            isOneToOne: false;
            referencedRelation: "tours";
            referencedColumns: ["id"];
          },
        ];
      };
      tour_seasons: {
        Row: {
          applies: string;
          created_at: string;
          ends_on: string;
          id: string;
          name: string;
          pct: number;
          starts_on: string;
        };
        Insert: {
          applies?: string;
          created_at?: string;
          ends_on: string;
          id?: string;
          name: string;
          pct: number;
          starts_on: string;
        };
        Update: {
          applies?: string;
          created_at?: string;
          ends_on?: string;
          id?: string;
          name?: string;
          pct?: number;
          starts_on?: string;
        };
        Relationships: [];
      };
      tour_sessions: {
        Row: {
          capacity: number;
          created_at: string;
          currency: string;
          ends_at: string;
          id: string;
          kind: Database["public"]["Enums"]["session_kind"];
          price_minor: number;
          pricing: Database["public"]["Enums"]["price_basis"];
          starts_at: string;
          status: Database["public"]["Enums"]["departure_status"];
          tour_id: string;
          updated_at: string;
        };
        Insert: {
          capacity: number;
          created_at?: string;
          currency: string;
          ends_at: string;
          id?: string;
          kind: Database["public"]["Enums"]["session_kind"];
          price_minor: number;
          pricing: Database["public"]["Enums"]["price_basis"];
          starts_at: string;
          status?: Database["public"]["Enums"]["departure_status"];
          tour_id: string;
          updated_at?: string;
        };
        Update: {
          capacity?: number;
          created_at?: string;
          currency?: string;
          ends_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["session_kind"];
          price_minor?: number;
          pricing?: Database["public"]["Enums"]["price_basis"];
          starts_at?: string;
          status?: Database["public"]["Enums"]["departure_status"];
          tour_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tour_sessions_tour_id_fkey";
            columns: ["tour_id"];
            isOneToOne: false;
            referencedRelation: "tours";
            referencedColumns: ["id"];
          },
        ];
      };
      tour_slot_closures: {
        Row: {
          closed_by: string | null;
          created_at: string;
          rate_id: string;
          reason: string;
          starts_at: string;
        };
        Insert: {
          closed_by?: string | null;
          created_at?: string;
          rate_id: string;
          reason: string;
          starts_at: string;
        };
        Update: {
          closed_by?: string | null;
          created_at?: string;
          rate_id?: string;
          reason?: string;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tour_slot_closures_rate_id_fkey";
            columns: ["rate_id"];
            isOneToOne: false;
            referencedRelation: "tour_rates";
            referencedColumns: ["id"];
          },
        ];
      };
      tour_suppliers: {
        Row: {
          contact_name: string | null;
          created_at: string;
          email: string | null;
          id: string;
          is_sample: boolean;
          name: string;
          notes: string | null;
          phone: string | null;
          registration: string | null;
          updated_at: string;
        };
        Insert: {
          contact_name?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_sample?: boolean;
          name: string;
          notes?: string | null;
          phone?: string | null;
          registration?: string | null;
          updated_at?: string;
        };
        Update: {
          contact_name?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_sample?: boolean;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          registration?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      tour_translations: {
        Row: {
          cancellation_terms: string | null;
          description: string | null;
          exclusions: string[];
          inclusions: string[];
          itinerary: string[];
          locale: string;
          meeting_point: string | null;
          tour_id: string;
          updated_at: string;
        };
        Insert: {
          cancellation_terms?: string | null;
          description?: string | null;
          exclusions?: string[];
          inclusions?: string[];
          itinerary?: string[];
          locale: string;
          meeting_point?: string | null;
          tour_id: string;
          updated_at?: string;
        };
        Update: {
          cancellation_terms?: string | null;
          description?: string | null;
          exclusions?: string[];
          inclusions?: string[];
          itinerary?: string[];
          locale?: string;
          meeting_point?: string | null;
          tour_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tour_translations_tour_id_fkey";
            columns: ["tour_id"];
            isOneToOne: false;
            referencedRelation: "tours";
            referencedColumns: ["id"];
          },
        ];
      };
      tours: {
        Row: {
          adults_only: boolean;
          cancellation_bands: Json;
          created_at: string;
          destination_id: string | null;
          duration_minutes: number;
          id: string;
          is_sample: boolean;
          kind: Database["public"]["Enums"]["tour_kind"];
          location: string;
          name: string;
          office_id: string | null;
          slug: string;
          standalone: boolean;
          supplier_id: string | null;
          updated_at: string;
          visibility: Database["public"]["Enums"]["visibility"];
        };
        Insert: {
          adults_only?: boolean;
          cancellation_bands?: Json;
          created_at?: string;
          destination_id?: string | null;
          duration_minutes: number;
          id?: string;
          is_sample?: boolean;
          kind: Database["public"]["Enums"]["tour_kind"];
          location: string;
          name: string;
          office_id?: string | null;
          slug: string;
          standalone?: boolean;
          supplier_id?: string | null;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Update: {
          adults_only?: boolean;
          cancellation_bands?: Json;
          created_at?: string;
          destination_id?: string | null;
          duration_minutes?: number;
          id?: string;
          is_sample?: boolean;
          kind?: Database["public"]["Enums"]["tour_kind"];
          location?: string;
          name?: string;
          office_id?: string | null;
          slug?: string;
          standalone?: boolean;
          supplier_id?: string | null;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "tours_destination_id_fkey";
            columns: ["destination_id"];
            isOneToOne: false;
            referencedRelation: "destinations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tours_office_id_fkey";
            columns: ["office_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tours_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "tour_suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      used_action_tokens: {
        Row: {
          request_id: string;
          token_hash: string;
          used_at: string;
        };
        Insert: {
          request_id: string;
          token_hash: string;
          used_at?: string;
        };
        Update: {
          request_id?: string;
          token_hash?: string;
          used_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "used_action_tokens_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "booking_requests";
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
          gratuity_usd_minor: number | null;
          id: string;
          is_sample: boolean;
          max_guests: number | null;
          mooring: Database["public"]["Enums"]["mooring_practice"] | null;
          name: string;
          operator_org_id: string | null;
          published_at: string | null;
          route_text: string | null;
          shared_spaces: string[];
          showcase_reason: string | null;
          showcase_until: string | null;
          sightseeing_approved_at: string | null;
          sightseeing_approved_by: string | null;
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
          gratuity_usd_minor?: number | null;
          id?: string;
          is_sample?: boolean;
          max_guests?: number | null;
          mooring?: Database["public"]["Enums"]["mooring_practice"] | null;
          name: string;
          operator_org_id?: string | null;
          published_at?: string | null;
          route_text?: string | null;
          shared_spaces?: string[];
          showcase_reason?: string | null;
          showcase_until?: string | null;
          sightseeing_approved_at?: string | null;
          sightseeing_approved_by?: string | null;
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
          gratuity_usd_minor?: number | null;
          id?: string;
          is_sample?: boolean;
          max_guests?: number | null;
          mooring?: Database["public"]["Enums"]["mooring_practice"] | null;
          name?: string;
          operator_org_id?: string | null;
          published_at?: string | null;
          route_text?: string | null;
          shared_spaces?: string[];
          showcase_reason?: string | null;
          showcase_until?: string | null;
          sightseeing_approved_at?: string | null;
          sightseeing_approved_by?: string | null;
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
      webhook_deliveries: {
        Row: {
          attempts: number;
          created_at: string;
          dedupe_key: string | null;
          event: string;
          id: string;
          last_error: string | null;
          last_status: number | null;
          next_attempt_at: string;
          org_id: string;
          payload: Json;
          sent_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          dedupe_key?: string | null;
          event: string;
          id?: string;
          last_error?: string | null;
          last_status?: number | null;
          next_attempt_at?: string;
          org_id: string;
          payload: Json;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          dedupe_key?: string | null;
          event?: string;
          id?: string;
          last_error?: string | null;
          last_status?: number | null;
          next_attempt_at?: string;
          org_id?: string;
          payload?: Json;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_endpoints: {
        Row: {
          active: boolean;
          created_at: string;
          last_error: string | null;
          last_error_at: string | null;
          last_sent_at: string | null;
          org_id: string;
          updated_at: string;
          url: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          last_error?: string | null;
          last_error_at?: string | null;
          last_sent_at?: string | null;
          org_id: string;
          updated_at?: string;
          url: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          last_error?: string | null;
          last_error_at?: string | null;
          last_sent_at?: string | null;
          org_id?: string;
          updated_at?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
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
      accept_offer: {
        Args: { guests: Json; target: string; terms_read: boolean };
        Returns: string;
      };
      admin_extend_hold: {
        Args: { hours: number; target: string };
        Returns: string;
      };
      admin_place_hold: {
        Args: {
          cab: string;
          dep: string;
          hours: number;
          n: number;
          note?: string;
        };
        Returns: string;
      };
      admin_release_hold: { Args: { target: string }; Returns: undefined };
      allotment_usage: {
        Args: { target: string };
        Returns: {
          booked: number;
          cabins: number;
          departs_on: string;
          departure_id: string;
          released: boolean;
        }[];
      };
      apply_as_operator: {
        Args: { display_name: string; legal_name: string; registration: Json };
        Returns: string;
      };
      apply_as_partner: {
        Args: { display_name: string; legal_name: string; registration: Json };
        Returns: string;
      };
      apply_inventory_paste: { Args: { run: string }; Returns: Json };
      approve_submission: {
        Args: { new_slug?: string; target: string };
        Returns: string;
      };
      approved_partners: {
        Args: never;
        Returns: {
          display_name: string;
          id: string;
        }[];
      };
      cancellation_quote: {
        Args: { res: string };
        Returns: {
          charge_minor: number;
          days_before: number;
          paid_minor: number;
          percent: number;
          refund_minor: number;
          total_minor: number;
          unpaid_charge_minor: number;
        }[];
      };
      confirm_sheet: { Args: { auto?: boolean; ingest: string }; Returns: Json };
      create_api_key: {
        Args: { key_label: string; key_public: string; target_org: string };
        Returns: {
          id: string;
          key_id: string;
        }[];
      };
      customer_accept_alternative: { Args: { req: string }; Returns: string };
      customer_add_programme: { Args: { res: string }; Returns: string };
      customer_request_booking: {
        Args: {
          cabins: Json;
          cur: string;
          dep: string;
          guests: Json;
          terms_read: boolean;
        };
        Returns: string;
      };
      customer_reserve: {
        Args: {
          cabins: Json;
          cur: string;
          dep: string;
          guests: Json;
          terms_read: boolean;
        };
        Returns: string;
      };
      customer_withdraw_booking_request: {
        Args: { req: string };
        Returns: undefined;
      };
      decide_cancellation: {
        Args: { approve: boolean; note?: string; target: string };
        Returns: Database["public"]["Enums"]["cancellation_status"];
      };
      decide_inventory_feed: {
        Args: {
          decision: Database["public"]["Enums"]["feed_status"];
          reason?: string;
          target_org: string;
        };
        Returns: undefined;
      };
      decide_tour_cancellation: {
        Args: { approve: boolean; note?: string; target: string };
        Returns: undefined;
      };
      departure_bookable: { Args: { dep: string }; Returns: boolean };
      discard_inventory_paste: { Args: { run: string }; Returns: undefined };
      generate_departures: {
        Args: { horizon?: string; target: string };
        Returns: number;
      };
      office_cancel_slot: {
        Args: { rate: string; starts: string; why: string };
        Returns: number;
      };
      operator_answer_booking_request: {
        Args: { act: string; alt?: Json; req: string };
        Returns: Json;
      };
      operator_confirm_hours: { Args: { target_org: string }; Returns: number };
      operator_reply_stats: {
        Args: { target_org: string };
        Returns: {
          answered: number;
          confirm_within_hours: number;
          decline_rate_pct: number;
          median_minutes: number;
          shown_free: number;
          shown_free_declined: number;
          within_sla_pct: number;
        }[];
      };
      order_tour: {
        Args: {
          guest_ages: number[];
          lead: string;
          order_notes: string;
          sess: string;
          terms_read: boolean;
        };
        Returns: string;
      };
      order_tour_slot: {
        Args: {
          guest_ages: number[];
          lead: string;
          order_notes: string;
          rate: string;
          starts: string;
          terms_read: boolean;
        };
        Returns: string;
      };
      partner_request_booking: {
        Args: {
          cabins: Json;
          client_ref: string;
          cur: string;
          dep: string;
          guests: Json;
          org: string;
          selling_total: number;
          terms_read: boolean;
        };
        Returns: string;
      };
      partner_reserve: {
        Args: {
          cabins: Json;
          client_ref: string;
          cur: string;
          dep: string;
          guests: Json;
          org: string;
          selling_total: number;
          terms_read: boolean;
        };
        Returns: string;
      };
      partner_search: {
        Args: {
          from_day: string;
          nights_max?: number;
          nights_min?: number;
          org: string;
          route_destination?: string;
          route_origin?: string;
          to_day: string;
        };
        Returns: {
          amount_minor: number;
          available: number;
          booking_mode: string;
          cabin_name: string;
          cabin_type_id: string;
          child_bands: Json;
          confirmed_at: string;
          currency: string;
          deck: string;
          departs_on: string;
          departure_id: string;
          destination: string;
          gratuity_usd_minor: number;
          max_occupancy: number;
          nights: number;
          occupancy: number;
          operator_org_id: string;
          origin: string;
          returns_on: string;
          sailing_period: string;
          sails_at: string;
          schedule_id: string;
          supplement_minor: number;
          tier: string;
          vessel_id: string;
          vessel_name: string;
        }[];
      };
      preview_inventory_paste: {
        Args: { input: Json; label?: string; target_org: string };
        Returns: string;
      };
      preview_sheet: { Args: { ingest: string }; Returns: string };
      programme_quote: {
        Args: { ages: number[]; dep: string };
        Returns: {
          currency: string;
          rate_id: string;
          total_minor: number;
          tour_name: string;
          tour_slug: string;
        }[];
      };
      public_party_price: {
        Args: {
          ages: number[];
          cab: string;
          cur: string;
          dep: string;
          pkg?: string;
        };
        Returns: number;
      };
      public_sailing_modes: {
        Args: { target: string };
        Returns: {
          booking_mode: string;
          departs_on: string;
          departure_id: string;
          returns_on: string;
          schedule_id: string;
        }[];
      };
      public_vessel_prices: {
        Args: never;
        Returns: {
          amount_minor: number;
          bookable: boolean;
          currency: string;
          sightseeing_amount_minor: number;
          sightseeing_by: string;
          sightseeing_currency: string;
          vessel_id: string;
        }[];
      };
      record_manual_payment: {
        Args: {
          amount: number;
          cur: string;
          how: string;
          paid_date: string;
          ref: string;
          res: string;
        };
        Returns: string;
      };
      record_manual_refund: {
        Args: { amount: number; how: string; ref: string; target: string };
        Returns: undefined;
      };
      record_payout: {
        Args: {
          amount: number;
          cur: string;
          how: string;
          paid_date: string;
          payout_note?: string;
          ref: string;
          target_org: string;
        };
        Returns: string;
      };
      record_tour_manual_refund: {
        Args: { amount: number; how: string; ref: string; target: string };
        Returns: undefined;
      };
      reject_sheet: {
        Args: { ingest: string; why: string };
        Returns: undefined;
      };
      reject_submission: {
        Args: { note: string; target: string };
        Returns: undefined;
      };
      remove_inventory_feed: {
        Args: { target_org: string };
        Returns: undefined;
      };
      report_payment: {
        Args: {
          amount: number;
          cur: string;
          paid_date: string;
          proof?: string;
          ref: string;
          res: string;
        };
        Returns: string;
      };
      request_cancellation: {
        Args: { policy_read: boolean; res: string; why: string };
        Returns: string;
      };
      request_submission_changes: {
        Args: { note: string; target: string };
        Returns: undefined;
      };
      request_tour_cancellation: {
        Args: { policy_read: boolean; target: string; why: string };
        Returns: undefined;
      };
      reservation_balance: {
        Args: { res: string };
        Returns: {
          currency: string;
          outstanding_minor: number;
          paid_minor: number;
          payment_due_at: string;
          refunded_minor: number;
          reported_minor: number;
          total_minor: number;
        }[];
      };
      review_cancellation: {
        Args: { agree: boolean; review_note?: string; target: string };
        Returns: undefined;
      };
      review_eligibility_proof: {
        Args: {
          decision: Database["public"]["Enums"]["proof_status"];
          review_note?: string;
          target: string;
        };
        Returns: undefined;
      };
      revoke_api_key: { Args: { target: string }; Returns: undefined };
      sailing_inventory: {
        Args: { dep: string };
        Returns: {
          allotment_left: number;
          booked: number;
          cabin_count: number;
          cabin_type_id: string;
          code: string;
          confirmed_at: string;
          free: number;
          freesale: boolean;
          held: number;
          mode: string;
          name: string;
          source: string;
          stop_sale: boolean;
        }[];
      };
      sailing_supplements: {
        Args: { dep: string };
        Returns: {
          amount_minor: number;
          cabin_type_id: string;
          currency: string;
          ends_on: string;
          kind: string;
          name: string;
          starts_on: string;
        }[];
      };
      save_bank_details: { Args: { details: Json }; Returns: undefined };
      save_inventory_feed: {
        Args: { feed_url: string; target_org: string };
        Returns: undefined;
      };
      send_offer: {
        Args: {
          cabins: Json;
          cur: string;
          dep: string;
          eligibility: string;
          expires_in_hours?: number;
          inclusions_text: string;
          list_total: number;
          note: string;
          plan: Database["public"]["Enums"]["rate_plan"];
          previous?: string;
          req: string;
          terms_text: string;
          total: number;
        };
        Returns: string;
      };
      send_payment_reminder: { Args: { res: string }; Returns: undefined };
      service_answer_booking_request: {
        Args: {
          act: string;
          alt?: Json;
          channel: string;
          contact?: string;
          req: string;
          token_hash?: string;
        };
        Returns: Json;
      };
      service_apply_inventory: {
        Args: {
          api_key?: string;
          feed?: string;
          input: Json;
          run_label?: string;
          src: Database["public"]["Enums"]["inventory_source"];
          target_org: string;
        };
        Returns: Json;
      };
      service_card_payment: {
        Args: {
          amount: number;
          cur: string;
          intent: string;
          res: string;
          session_id: string;
        };
        Returns: string;
      };
      service_card_refunded: {
        Args: {
          amount: number;
          cur: string;
          intent: string;
          refund: string;
          res: string;
          session_id: string;
        };
        Returns: undefined;
      };
      service_claim_due_feeds: {
        Args: { max_feeds?: number };
        Returns: {
          id: string;
          org_id: string;
          url: string;
        }[];
      };
      service_claim_webhooks: {
        Args: { n?: number };
        Returns: {
          attempts: number;
          created_at: string;
          event: string;
          id: string;
          org_id: string;
          payload: Json;
          url: string;
        }[];
      };
      service_due_booking_requests: {
        Args: never;
        Returns: {
          due: string;
          org_id: string;
          request_id: string;
        }[];
      };
      service_due_booking_requests_internal: { Args: never; Returns: string[] };
      service_mark_booking_request: {
        Args: { req: string; what: string };
        Returns: undefined;
      };
      service_mark_notice_email: {
        Args: { notice: string; outcome: string };
        Returns: undefined;
      };
      service_rate_limit: {
        Args: {
          add?: boolean;
          bucket: string;
          max_hits: number;
          window_seconds: number;
        };
        Returns: number;
      };
      service_record_feed_failure: {
        Args: { feed: string; problem: string };
        Returns: undefined;
      };
      service_record_stripe_refund: {
        Args: { amount: number; pay: string; refund: string; target: string };
        Returns: undefined;
      };
      service_record_tour_refund: {
        Args: { amount: number; pay: string; refund: string; target: string };
        Returns: undefined;
      };
      service_tour_payment: {
        Args: {
          amount: number;
          cur: string;
          intent: string;
          session_id: string;
          target: string;
        };
        Returns: string;
      };
      service_tour_refunded: {
        Args: {
          amount: number;
          cur: string;
          intent: string;
          refund: string;
          session_id: string;
          target: string;
        };
        Returns: undefined;
      };
      service_webhook_result: {
        Args: {
          error?: string;
          http_status: number;
          ok: boolean;
          target: string;
        };
        Returns: undefined;
      };
      session_places_left: { Args: { sess: string }; Returns: number };
      set_sightseeing_approval: {
        Args: { approved: boolean; target: string };
        Returns: undefined;
      };
      stripe_refund_plan: {
        Args: { target: string };
        Returns: {
          amount_minor: number;
          currency: string;
          payment_id: string;
          payment_intent: string;
        }[];
      };
      submit_submission: { Args: { target: string }; Returns: undefined };
      tour_cancel_quote: {
        Args: { target: string };
        Returns: {
          charge_minor: number;
          days_before: number;
          paid_minor: number;
          percent: number;
          refund_minor: number;
        }[];
      };
      tour_is_bookable: { Args: { target: string }; Returns: boolean };
      tour_slot_quote: {
        Args: { guest_ages: number[]; rate: string; starts: string };
        Returns: {
          places_left: number;
          total_minor: number;
          vehicle: string;
        }[];
      };
      tour_slots: {
        Args: { from_day: string; rate: string; to_day: string };
        Returns: {
          closed: boolean;
          starts_at: string;
          taken: number;
        }[];
      };
      verify_payment: {
        Args: {
          decision: Database["public"]["Enums"]["payment_status"];
          review_note?: string;
          target: string;
        };
        Returns: undefined;
      };
      vessel_departure_prices: {
        Args: { pkg?: string; target: string };
        Returns: {
          bookable: boolean;
          booking_mode: string;
          cabin_type_id: string;
          confirmed_at: string;
          currency: string;
          departs_on: string;
          departure_id: string;
          double_minor: number;
          places_left: number;
          returns_on: string;
          schedule_id: string;
          single_minor: number;
          supplement_minor: number;
          triple_minor: number;
        }[];
      };
      vessel_product_summary: {
        Args: { only_vessel?: string };
        Returns: {
          bookable_departures: number;
          cabin_types: number;
          schedules: number;
          upcoming_departures: number;
          vessel_id: string;
        }[];
      };
      vessel_type_stats: {
        Args: never;
        Returns: {
          cabins_high: number;
          cabins_low: number;
          guests_high: number;
          guests_low: number;
          type: Database["public"]["Enums"]["vessel_type"];
          vessels: number;
        }[];
      };
      withdraw_cancellation: { Args: { target: string }; Returns: undefined };
      withdraw_offer: { Args: { target: string }; Returns: undefined };
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
      booking_request_status: "waiting" | "held" | "confirmed" | "declined" | "alternative_offered" | "expired" | "withdrawn";
      cancellation_status: "requested" | "withdrawn" | "rejected" | "refund_due" | "closed";
      commission_kind: "payment" | "reversal";
      contact_topic: "cruise" | "booking" | "vessel" | "partner" | "other";
      departure_status: "scheduled" | "cancelled";
      evaluation_verdict: "recommended" | "recommended_with_reservations" | "not_recommended";
      feed_status: "pending" | "active" | "paused" | "rejected";
      hold_status: "active" | "confirmed" | "expired" | "released";
      inventory_run_status: "previewed" | "applied" | "discarded" | "failed";
      inventory_source: "manual" | "paste" | "feed" | "api" | "tap" | "sheet";
      mooring_practice: "private_bank" | "rafted" | "varies";
      offer_status: "sent" | "superseded" | "withdrawn" | "accepted" | "closed";
      operator_review: "pending" | "confirmed" | "contested";
      org_kind: "operator" | "partner" | "nilecruz" | "tour_office";
      org_status: "applied" | "approved" | "paused" | "rejected";
      payment_method: "card" | "transfer" | "manual";
      payment_status: "reported" | "verified" | "rejected" | "refunded";
      platform_role: "customer" | "admin";
      price_basis: "per_guest" | "per_group";
      promotion_kind: "percent" | "fixed" | "extra" | "upgrade";
      proof_status: "submitted" | "verified" | "rejected";
      rate_plan: "international" | "egyptian_citizen" | "foreign_resident" | "trade";
      refund_method: "stripe" | "manual";
      request_status: "open" | "accepted" | "closed";
      reservation_status: "awaiting_payment" | "confirmed" | "cancelled";
      safety_status: "open" | "under_review" | "resolved";
      sailing_period: "morning" | "noon" | "evening";
      session_kind: "shared" | "private";
      sheet_channel: "email" | "whatsapp" | "upload";
      sheet_status: "received" | "unknown_sender" | "preview" | "confirmed" | "rejected" | "failed";
      submission_event: "created" | "edited" | "submitted" | "changes_requested" | "approved" | "rejected";
      submission_status: "draft" | "submitted" | "changes_requested" | "approved" | "rejected";
      team_role: "owner" | "reservations" | "finance" | "viewer";
      tour_cancel_state: "requested" | "refused" | "approved";
      tour_kind: "museum_visit" | "excursion" | "evening_tour" | "transfer" | "other";
      tour_order_status: "awaiting_payment" | "confirmed" | "cancelled";
      tour_rate_mode: "shared" | "private" | "transfer" | "assist" | "program";
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
      booking_request_status: ["waiting", "held", "confirmed", "declined", "alternative_offered", "expired", "withdrawn"],
      cancellation_status: ["requested", "withdrawn", "rejected", "refund_due", "closed"],
      commission_kind: ["payment", "reversal"],
      contact_topic: ["cruise", "booking", "vessel", "partner", "other"],
      departure_status: ["scheduled", "cancelled"],
      evaluation_verdict: ["recommended", "recommended_with_reservations", "not_recommended"],
      feed_status: ["pending", "active", "paused", "rejected"],
      hold_status: ["active", "confirmed", "expired", "released"],
      inventory_run_status: ["previewed", "applied", "discarded", "failed"],
      inventory_source: ["manual", "paste", "feed", "api", "tap", "sheet"],
      mooring_practice: ["private_bank", "rafted", "varies"],
      offer_status: ["sent", "superseded", "withdrawn", "accepted", "closed"],
      operator_review: ["pending", "confirmed", "contested"],
      org_kind: ["operator", "partner", "nilecruz", "tour_office"],
      org_status: ["applied", "approved", "paused", "rejected"],
      payment_method: ["card", "transfer", "manual"],
      payment_status: ["reported", "verified", "rejected", "refunded"],
      platform_role: ["customer", "admin"],
      price_basis: ["per_guest", "per_group"],
      promotion_kind: ["percent", "fixed", "extra", "upgrade"],
      proof_status: ["submitted", "verified", "rejected"],
      rate_plan: ["international", "egyptian_citizen", "foreign_resident", "trade"],
      refund_method: ["stripe", "manual"],
      request_status: ["open", "accepted", "closed"],
      reservation_status: ["awaiting_payment", "confirmed", "cancelled"],
      safety_status: ["open", "under_review", "resolved"],
      sailing_period: ["morning", "noon", "evening"],
      session_kind: ["shared", "private"],
      sheet_channel: ["email", "whatsapp", "upload"],
      sheet_status: ["received", "unknown_sender", "preview", "confirmed", "rejected", "failed"],
      submission_event: ["created", "edited", "submitted", "changes_requested", "approved", "rejected"],
      submission_status: ["draft", "submitted", "changes_requested", "approved", "rejected"],
      team_role: ["owner", "reservations", "finance", "viewer"],
      tour_cancel_state: ["requested", "refused", "approved"],
      tour_kind: ["museum_visit", "excursion", "evening_tour", "transfer", "other"],
      tour_order_status: ["awaiting_payment", "confirmed", "cancelled"],
      tour_rate_mode: ["shared", "private", "transfer", "assist", "program"],
      vessel_category: ["basic", "standard", "superior", "deluxe", "luxury"],
      vessel_type: ["sail", "motor", "steam"],
      visibility: ["private", "showcase", "published"],
    },
  },
} as const;
