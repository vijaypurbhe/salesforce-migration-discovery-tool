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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          id: string
          initiative_id: string | null
          new_value_summary: string | null
          object_id: string
          object_type: string
          old_value_summary: string | null
          role: string
          summary: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string
          id?: string
          initiative_id?: string | null
          new_value_summary?: string | null
          object_id?: string
          object_type: string
          old_value_summary?: string | null
          role?: string
          summary?: string
          tenant_id?: string
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          id?: string
          initiative_id?: string | null
          new_value_summary?: string | null
          object_id?: string
          object_type?: string
          old_value_summary?: string | null
          role?: string
          summary?: string
          tenant_id?: string
        }
        Relationships: []
      }
      agent_actions: {
        Row: {
          agent_id: string
          authorization_state: string
          authorized_at: string | null
          authorized_by: string | null
          created_at: string
          data: Json
          id: string
          position: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          authorization_state?: string
          authorized_at?: string | null
          authorized_by?: string | null
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          authorization_state?: string
          authorized_at?: string | null
          authorized_by?: string | null
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_boundaries: {
        Row: {
          agent_id: string
          created_at: string
          data: Json
          id: string
          position: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_boundaries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_escalations: {
        Row: {
          agent_id: string
          created_at: string
          data: Json
          id: string
          position: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_escalations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_grounding: {
        Row: {
          agent_id: string
          created_at: string
          data: Json
          id: string
          position: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_grounding_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_guardrails: {
        Row: {
          agent_id: string
          created_at: string
          data: Json
          id: string
          position: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_guardrails_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_reviews: {
        Row: {
          agent_id: string
          comments: string
          decided_at: string
          id: string
          outcome: string
          reviewer: string
          reviewer_role: Database["public"]["Enums"]["axion_role"]
          stage: string
        }
        Insert: {
          agent_id: string
          comments?: string
          decided_at?: string
          id?: string
          outcome?: string
          reviewer?: string
          reviewer_role: Database["public"]["Enums"]["axion_role"]
          stage: string
        }
        Update: {
          agent_id?: string
          comments?: string
          decided_at?: string
          id?: string
          outcome?: string
          reviewer?: string
          reviewer_role?: Database["public"]["Enums"]["axion_role"]
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_reviews_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_suggestion_decisions: {
        Row: {
          agent_id: string
          confidence: number | null
          decided_at: string
          decided_by: string
          decision: string
          id: string
          kind: string
          rationale: string
          title: string
        }
        Insert: {
          agent_id: string
          confidence?: number | null
          decided_at?: string
          decided_by?: string
          decision: string
          id?: string
          kind: string
          rationale?: string
          title: string
        }
        Update: {
          agent_id?: string
          confidence?: number | null
          decided_at?: string
          decided_by?: string
          decision?: string
          id?: string
          kind?: string
          rationale?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_suggestion_decisions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_topics: {
        Row: {
          agent_id: string
          created_at: string
          data: Json
          id: string
          position: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_topics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_versions: {
        Row: {
          agent_id: string
          content_hash: string
          counts: Json
          created_at: string
          created_by: string
          id: string
          payload: Json
          status: string
          summary: string
          version: string
        }
        Insert: {
          agent_id: string
          content_hash?: string
          counts?: Json
          created_at?: string
          created_by?: string
          id?: string
          payload?: Json
          status?: string
          summary?: string
          version: string
        }
        Update: {
          agent_id?: string
          content_hash?: string
          counts?: Json
          created_at?: string
          created_by?: string
          id?: string
          payload?: Json
          status?: string
          summary?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_versions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          backlog: Json
          consumption: Json
          created_at: string
          created_by: string
          id: string
          identity_policy_id: string | null
          initiative_id: string
          instructions: Json
          lifecycle_stage: string
          linked_decision_ids: string[]
          linked_risk_ids: string[]
          monitoring: Json
          origin: string
          overview: Json
          pattern_id: string
          reference: string
          release: string
          risk_rating: string
          status: string
          tenant_id: string
          test_status: string
          tests: Json
          updated_at: string
          updated_by: string
          version: string
        }
        Insert: {
          backlog?: Json
          consumption?: Json
          created_at?: string
          created_by?: string
          id?: string
          identity_policy_id?: string | null
          initiative_id: string
          instructions?: Json
          lifecycle_stage?: string
          linked_decision_ids?: string[]
          linked_risk_ids?: string[]
          monitoring?: Json
          origin?: string
          overview?: Json
          pattern_id: string
          reference: string
          release?: string
          risk_rating?: string
          status?: string
          tenant_id: string
          test_status?: string
          tests?: Json
          updated_at?: string
          updated_by?: string
          version?: string
        }
        Update: {
          backlog?: Json
          consumption?: Json
          created_at?: string
          created_by?: string
          id?: string
          identity_policy_id?: string | null
          initiative_id?: string
          instructions?: Json
          lifecycle_stage?: string
          linked_decision_ids?: string[]
          linked_risk_ids?: string[]
          monitoring?: Json
          origin?: string
          overview?: Json
          pattern_id?: string
          reference?: string
          release?: string
          risk_rating?: string
          status?: string
          tenant_id?: string
          test_status?: string
          tests?: Json
          updated_at?: string
          updated_by?: string
          version?: string
        }
        Relationships: []
      }
      ai_discovery_reviews: {
        Row: {
          approved: boolean
          assessment_id: string
          created_at: string
          created_by: string
          id: string
          model: string | null
          notes: string
          project_id: string
          result: Json | null
        }
        Insert: {
          approved?: boolean
          assessment_id: string
          created_at?: string
          created_by?: string
          id?: string
          model?: string | null
          notes: string
          project_id: string
          result?: Json | null
        }
        Update: {
          approved?: boolean
          assessment_id?: string
          created_at?: string
          created_by?: string
          id?: string
          model?: string | null
          notes?: string
          project_id?: string
          result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_discovery_reviews_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      analysis_runs: {
        Row: {
          assessment_id: string
          created_at: string
          created_by: string
          created_count: number
          flagged_count: number
          id: string
          input_hash: string
          project_id: string
          rule_version: string
          updated_count: number
        }
        Insert: {
          assessment_id: string
          created_at?: string
          created_by?: string
          created_count?: number
          flagged_count?: number
          id?: string
          input_hash: string
          project_id: string
          rule_version: string
          updated_count?: number
        }
        Update: {
          assessment_id?: string
          created_at?: string
          created_by?: string
          created_count?: number
          flagged_count?: number
          id?: string
          input_hash?: string
          project_id?: string
          rule_version?: string
          updated_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "analysis_runs_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      answer_revisions: {
        Row: {
          answer_id: string
          assessment_id: string
          changed_at: string
          changed_by: string
          confidence: string
          id: string
          na_reason: string | null
          notes: string | null
          project_id: string
          question_id: string
          review_status: string
          row_version: number
          state: string
          value: Json | null
        }
        Insert: {
          answer_id: string
          assessment_id: string
          changed_at?: string
          changed_by: string
          confidence: string
          id?: string
          na_reason?: string | null
          notes?: string | null
          project_id: string
          question_id: string
          review_status: string
          row_version: number
          state: string
          value?: Json | null
        }
        Update: {
          answer_id?: string
          assessment_id?: string
          changed_at?: string
          changed_by?: string
          confidence?: string
          id?: string
          na_reason?: string | null
          notes?: string | null
          project_id?: string
          question_id?: string
          review_status?: string
          row_version?: number
          state?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "answer_revisions_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_revisions_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      answers: {
        Row: {
          assessment_id: string
          confidence: string
          created_at: string
          due_date: string | null
          id: string
          instance_key: string
          na_reason: string | null
          needs_revalidation: boolean
          notes: string | null
          owner_label: string | null
          project_id: string
          question_id: string
          review_status: string
          row_version: number
          state: string
          updated_at: string
          updated_by: string
          value: Json | null
        }
        Insert: {
          assessment_id: string
          confidence?: string
          created_at?: string
          due_date?: string | null
          id?: string
          instance_key?: string
          na_reason?: string | null
          needs_revalidation?: boolean
          notes?: string | null
          owner_label?: string | null
          project_id: string
          question_id: string
          review_status?: string
          row_version?: number
          state: string
          updated_at?: string
          updated_by: string
          value?: Json | null
        }
        Update: {
          assessment_id?: string
          confidence?: string
          created_at?: string
          due_date?: string | null
          id?: string
          instance_key?: string
          na_reason?: string | null
          needs_revalidation?: boolean
          notes?: string | null
          owner_label?: string | null
          project_id?: string
          question_id?: string
          review_status?: string
          row_version?: number
          state?: string
          updated_at?: string
          updated_by?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      app_user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["studio_app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["studio_app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["studio_app_role"]
          user_id?: string
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          agent_id: string
          created_at: string
          due_by: string | null
          id: string
          requested_by: string
          required_roles: string[]
          stage: string
          state: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          due_by?: string | null
          id?: string
          requested_by?: string
          required_roles?: string[]
          stage: string
          state?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          due_by?: string | null
          id?: string
          requested_by?: string
          required_roles?: string[]
          stage?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          bulk_na: Json
          code: string
          created_at: string
          created_by: string
          decision_weights: Json
          entitlement_notes: string
          id: string
          locale: string
          name: string
          project_id: string
          rubric_version: string
          rule_version: string
          stage: string
          target_product_name: string
          target_release: string
          template_version: string
          timezone: string
          updated_at: string
        }
        Insert: {
          bulk_na?: Json
          code?: string
          created_at?: string
          created_by?: string
          decision_weights?: Json
          entitlement_notes?: string
          id?: string
          locale?: string
          name: string
          project_id: string
          rubric_version?: string
          rule_version?: string
          stage?: string
          target_product_name?: string
          target_release?: string
          template_version?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          bulk_na?: Json
          code?: string
          created_at?: string
          created_by?: string
          decision_weights?: Json
          entitlement_notes?: string
          id?: string
          locale?: string
          name?: string
          project_id?: string
          rubric_version?: string
          rule_version?: string
          stage?: string
          target_product_name?: string
          target_release?: string
          template_version?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          assessment_id: string
          assignee_id: string | null
          assignee_label: string
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          kind: string
          note: string
          project_id: string
          question_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          assignee_id?: string | null
          assignee_label?: string
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          kind: string
          note?: string
          project_id: string
          question_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          assignee_id?: string | null
          assignee_label?: string
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          kind?: string
          note?: string
          project_id?: string
          question_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor: string | null
          assessment_id: string | null
          created_at: string
          id: string
          object_id: string
          object_type: string
          project_id: string
          summary: string
        }
        Insert: {
          action: string
          actor?: string | null
          assessment_id?: string | null
          created_at?: string
          id?: string
          object_id: string
          object_type: string
          project_id: string
          summary?: string
        }
        Update: {
          action?: string
          actor?: string | null
          assessment_id?: string | null
          created_at?: string
          id?: string
          object_id?: string
          object_type?: string
          project_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      axion_user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["axion_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["axion_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["axion_role"]
          user_id?: string
        }
        Relationships: []
      }
      client_members: {
        Row: {
          client_id: string
          created_at: string
          id: string
          invited_by: string
          is_client_admin: boolean
          role: Database["public"]["Enums"]["axion_role"]
          status: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          invited_by?: string
          is_client_admin?: boolean
          role: Database["public"]["Enums"]["axion_role"]
          status?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          is_client_admin?: boolean
          role?: Database["public"]["Enums"]["axion_role"]
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          branding_accent: string
          created_at: string
          created_by: string
          description: string
          geography: string
          id: string
          industry: string
          is_demo: boolean
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          branding_accent?: string
          created_at?: string
          created_by?: string
          description?: string
          geography?: string
          id: string
          industry?: string
          is_demo?: boolean
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          branding_accent?: string
          created_at?: string
          created_by?: string
          description?: string
          geography?: string
          id?: string
          industry?: string
          is_demo?: boolean
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          assessment_id: string
          author: string
          body: string
          created_at: string
          id: string
          project_id: string
          target_id: string
          target_type: string
          visibility: string
        }
        Insert: {
          assessment_id: string
          author?: string
          body: string
          created_at?: string
          id?: string
          project_id: string
          target_id: string
          target_type: string
          visibility?: string
        }
        Update: {
          assessment_id?: string
          author?: string
          body?: string
          created_at?: string
          id?: string
          project_id?: string
          target_id?: string
          target_type?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      commercial_inputs: {
        Row: {
          assessment_id: string
          contingency_model: string
          contingency_pct: number | null
          currency: string | null
          customer_sme_capacity: string
          expenses_note: string
          hours_per_person_week: number | null
          id: string
          margin_note: string
          project_id: string
          risk_hours_high: number | null
          risk_hours_likely: number | null
          risk_hours_low: number | null
          role_rates: Json
          role_split: Json
          rom_basis: string
          rom_selected: boolean
          target_weeks: number | null
          updated_at: string
        }
        Insert: {
          assessment_id: string
          contingency_model?: string
          contingency_pct?: number | null
          currency?: string | null
          customer_sme_capacity?: string
          expenses_note?: string
          hours_per_person_week?: number | null
          id?: string
          margin_note?: string
          project_id: string
          risk_hours_high?: number | null
          risk_hours_likely?: number | null
          risk_hours_low?: number | null
          role_rates?: Json
          role_split?: Json
          rom_basis?: string
          rom_selected?: boolean
          target_weeks?: number | null
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          contingency_model?: string
          contingency_pct?: number | null
          currency?: string | null
          customer_sme_capacity?: string
          expenses_note?: string
          hours_per_person_week?: number | null
          id?: string
          margin_note?: string
          project_id?: string
          risk_hours_high?: number | null
          risk_hours_likely?: number | null
          risk_hours_low?: number | null
          role_rates?: Json
          role_split?: Json
          rom_basis?: string
          rom_selected?: boolean
          target_weeks?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_inputs_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      complexity_scores: {
        Row: {
          assessment_id: string
          axis: number
          id: string
          project_id: string
          rationale: string
          reviewed: boolean
          reviewed_by: string | null
          score: number | null
          uncertainty: boolean
          updated_at: string
        }
        Insert: {
          assessment_id: string
          axis: number
          id?: string
          project_id: string
          rationale?: string
          reviewed?: boolean
          reviewed_by?: string | null
          score?: number | null
          uncertainty?: boolean
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          axis?: number
          id?: string
          project_id?: string
          rationale?: string
          reviewed?: boolean
          reviewed_by?: string | null
          score?: number | null
          uncertainty?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complexity_scores_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      customer_surveys: {
        Row: {
          assessment_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          imported_at: string | null
          question_ids: string[]
          recipient_label: string
          respondent_email: string | null
          responses: Json
          revoked_at: string | null
          row_version: number
          scope: string
          submitted_at: string | null
          token_hash: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          imported_at?: string | null
          question_ids: string[]
          recipient_label?: string
          respondent_email?: string | null
          responses?: Json
          revoked_at?: string | null
          row_version?: number
          scope: string
          submitted_at?: string | null
          token_hash: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          imported_at?: string | null
          question_ids?: string[]
          recipient_label?: string
          respondent_email?: string | null
          responses?: Json
          revoked_at?: string | null
          row_version?: number
          scope?: string
          submitted_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_surveys_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          archived: boolean
          code: string
          created_at: string
          created_by: string
          description: string
          id: string
          industry: string
          is_demo: boolean
          name: string
          region: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          code?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          industry?: string
          is_demo?: boolean
          name: string
          region?: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          code?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          industry?: string
          is_demo?: boolean
          name?: string
          region?: string
          updated_at?: string
        }
        Relationships: []
      }
      effort_catalog: {
        Row: {
          benchmark_ref: string
          hours_high: number | null
          hours_likely: number | null
          hours_low: number | null
          id: string
          is_demo: boolean
          label: string
          unit_type: string
          updated_at: string
          updated_by: string | null
          version: string
        }
        Insert: {
          benchmark_ref?: string
          hours_high?: number | null
          hours_likely?: number | null
          hours_low?: number | null
          id?: string
          is_demo?: boolean
          label: string
          unit_type: string
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Update: {
          benchmark_ref?: string
          hours_high?: number | null
          hours_likely?: number | null
          hours_low?: number | null
          id?: string
          is_demo?: boolean
          label?: string
          unit_type?: string
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Relationships: []
      }
      estimate_lines: {
        Row: {
          allocation_pct: number
          assessment_id: string
          basis: string
          created_at: string
          description: string
          hours_high: number | null
          hours_likely: number | null
          hours_low: number | null
          id: string
          is_fixed_task: boolean
          project_id: string
          qty_high: number | null
          qty_likely: number | null
          qty_low: number | null
          quantity_mode: string
          unit_type: string
          updated_at: string
          work_package_id: string
        }
        Insert: {
          allocation_pct?: number
          assessment_id: string
          basis?: string
          created_at?: string
          description?: string
          hours_high?: number | null
          hours_likely?: number | null
          hours_low?: number | null
          id?: string
          is_fixed_task?: boolean
          project_id: string
          qty_high?: number | null
          qty_likely?: number | null
          qty_low?: number | null
          quantity_mode?: string
          unit_type: string
          updated_at?: string
          work_package_id: string
        }
        Update: {
          allocation_pct?: number
          assessment_id?: string
          basis?: string
          created_at?: string
          description?: string
          hours_high?: number | null
          hours_likely?: number | null
          hours_low?: number | null
          id?: string
          is_fixed_task?: boolean
          project_id?: string
          qty_high?: number | null
          qty_likely?: number | null
          qty_low?: number | null
          quantity_mode?: string
          unit_type?: string
          updated_at?: string
          work_package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_lines_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "estimate_lines_work_package_id_fkey"
            columns: ["work_package_id"]
            isOneToOne: false
            referencedRelation: "work_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_files: {
        Row: {
          assessment_id: string
          checksum: string
          classification: string
          created_at: string
          description: string
          id: string
          mime_type: string
          original_filename: string
          project_id: string
          question_id: string | null
          replaces_id: string | null
          size_bytes: number
          status: string
          storage_path: string
          target_id: string | null
          target_type: string | null
          uploaded_by: string
          version: number
        }
        Insert: {
          assessment_id: string
          checksum: string
          classification?: string
          created_at?: string
          description?: string
          id?: string
          mime_type: string
          original_filename: string
          project_id: string
          question_id?: string | null
          replaces_id?: string | null
          size_bytes: number
          status?: string
          storage_path: string
          target_id?: string | null
          target_type?: string | null
          uploaded_by?: string
          version?: number
        }
        Update: {
          assessment_id?: string
          checksum?: string
          classification?: string
          created_at?: string
          description?: string
          id?: string
          mime_type?: string
          original_filename?: string
          project_id?: string
          question_id?: string | null
          replaces_id?: string | null
          size_bytes?: number
          status?: string
          storage_path?: string
          target_id?: string | null
          target_type?: string | null
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "evidence_files_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "evidence_files_replaces_id_fkey"
            columns: ["replaces_id"]
            isOneToOne: false
            referencedRelation: "evidence_files"
            referencedColumns: ["id"]
          },
        ]
      }
      export_jobs: {
        Row: {
          agent_id: string
          byte_size: number
          content_hash: string
          created_at: string
          error: string | null
          format: string
          id: string
          requested_by: string
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          byte_size?: number
          content_hash?: string
          created_at?: string
          error?: string | null
          format: string
          id?: string
          requested_by?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          byte_size?: number
          content_hash?: string
          created_at?: string
          error?: string | null
          format?: string
          id?: string
          requested_by?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          acceptance_criterion: string
          analysis_run_id: string | null
          assessment_id: string
          categories: string[]
          code: string
          confidence: string
          created_at: string
          created_by: string
          current_state: string
          decision: string
          decision_rationale: string
          delivery_risk: number | null
          delta_type: string
          dependency_criticality: number | null
          domain: string
          due_date: string | null
          evidence_note: string
          finding_key: string
          fit_status: string
          id: string
          impact: number | null
          internal_wording: string
          is_blocker: boolean
          kinds: string[]
          linked_question_ids: string[]
          manual: boolean
          needs_review: boolean
          owner_label: string
          project_id: string
          proposed_treatment: string
          required_state: string
          rule_id: string
          rule_version: string
          source_answer_versions: Json
          status: string
          title: string
          updated_at: string
          urgency: number | null
          validation_task: string
          visibility: string
          work_package_id: string | null
        }
        Insert: {
          acceptance_criterion?: string
          analysis_run_id?: string | null
          assessment_id: string
          categories?: string[]
          code: string
          confidence?: string
          created_at?: string
          created_by?: string
          current_state?: string
          decision?: string
          decision_rationale?: string
          delivery_risk?: number | null
          delta_type?: string
          dependency_criticality?: number | null
          domain?: string
          due_date?: string | null
          evidence_note?: string
          finding_key?: string
          fit_status?: string
          id?: string
          impact?: number | null
          internal_wording?: string
          is_blocker?: boolean
          kinds?: string[]
          linked_question_ids?: string[]
          manual?: boolean
          needs_review?: boolean
          owner_label?: string
          project_id: string
          proposed_treatment?: string
          required_state?: string
          rule_id: string
          rule_version?: string
          source_answer_versions?: Json
          status?: string
          title: string
          updated_at?: string
          urgency?: number | null
          validation_task?: string
          visibility?: string
          work_package_id?: string | null
        }
        Update: {
          acceptance_criterion?: string
          analysis_run_id?: string | null
          assessment_id?: string
          categories?: string[]
          code?: string
          confidence?: string
          created_at?: string
          created_by?: string
          current_state?: string
          decision?: string
          decision_rationale?: string
          delivery_risk?: number | null
          delta_type?: string
          dependency_criticality?: number | null
          domain?: string
          due_date?: string | null
          evidence_note?: string
          finding_key?: string
          fit_status?: string
          id?: string
          impact?: number | null
          internal_wording?: string
          is_blocker?: boolean
          kinds?: string[]
          linked_question_ids?: string[]
          manual?: boolean
          needs_review?: boolean
          owner_label?: string
          project_id?: string
          proposed_treatment?: string
          required_state?: string
          rule_id?: string
          rule_version?: string
          source_answer_versions?: Json
          status?: string
          title?: string
          updated_at?: string
          urgency?: number | null
          validation_task?: string
          visibility?: string
          work_package_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "findings_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      internal_notes: {
        Row: {
          assessment_id: string
          author: string
          body: string
          created_at: string
          id: string
          project_id: string
          target_id: string
          target_type: string
        }
        Insert: {
          assessment_id: string
          author?: string
          body: string
          created_at?: string
          id?: string
          project_id: string
          target_id: string
          target_type: string
        }
        Update: {
          assessment_id?: string
          author?: string
          body?: string
          created_at?: string
          id?: string
          project_id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_notes_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      login_audit_log: {
        Row: {
          email: string
          id: string
          ip_address: string | null
          location: string | null
          logged_in_at: string
          metadata: Json
          user_agent: string | null
          user_id: string
        }
        Insert: {
          email: string
          id?: string
          ip_address?: string | null
          location?: string | null
          logged_in_at?: string
          metadata?: Json
          user_agent?: string | null
          user_id: string
        }
        Update: {
          email?: string
          id?: string
          ip_address?: string | null
          location?: string | null
          logged_in_at?: string
          metadata?: Json
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mappings: {
        Row: {
          api_names_validated: boolean
          architect_rationale: string
          archived: boolean
          artifact_ids: string[]
          assessment_id: string
          business_impact: string
          candidate_target: string
          code: string
          created_at: string
          created_by: string
          discovery_proof: string
          disposition: string
          domain: string
          entitlement_status: string
          fit_status: string
          gap_category: string
          id: string
          is_seed_prompt: boolean
          legacy_area: string
          linked_question_ids: string[]
          poc_result: string
          project_id: string
          release_availability: string
          requirement_ids: string[]
          scenario_ids: string[]
          target_api_names: string
          updated_at: string
          validation_date: string | null
          verified_at: string | null
          verified_by: string | null
          visibility: string
          work_package_id: string | null
        }
        Insert: {
          api_names_validated?: boolean
          architect_rationale?: string
          archived?: boolean
          artifact_ids?: string[]
          assessment_id: string
          business_impact?: string
          candidate_target?: string
          code: string
          created_at?: string
          created_by?: string
          discovery_proof?: string
          disposition?: string
          domain?: string
          entitlement_status?: string
          fit_status?: string
          gap_category?: string
          id?: string
          is_seed_prompt?: boolean
          legacy_area: string
          linked_question_ids?: string[]
          poc_result?: string
          project_id: string
          release_availability?: string
          requirement_ids?: string[]
          scenario_ids?: string[]
          target_api_names?: string
          updated_at?: string
          validation_date?: string | null
          verified_at?: string | null
          verified_by?: string | null
          visibility?: string
          work_package_id?: string | null
        }
        Update: {
          api_names_validated?: boolean
          architect_rationale?: string
          archived?: boolean
          artifact_ids?: string[]
          assessment_id?: string
          business_impact?: string
          candidate_target?: string
          code?: string
          created_at?: string
          created_by?: string
          discovery_proof?: string
          disposition?: string
          domain?: string
          entitlement_status?: string
          fit_status?: string
          gap_category?: string
          id?: string
          is_seed_prompt?: boolean
          legacy_area?: string
          linked_question_ids?: string[]
          poc_result?: string
          project_id?: string
          release_availability?: string
          requirement_ids?: string[]
          scenario_ids?: string[]
          target_api_names?: string
          updated_at?: string
          validation_date?: string | null
          verified_at?: string | null
          verified_by?: string | null
          visibility?: string
          work_package_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mappings_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      private_workspace_access: {
        Row: {
          created_at: string
          email_label: string
          id: string
          revoked_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_label: string
          id?: string
          revoked_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_label?: string
          id?: string
          revoked_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_persona: string
          display_name: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_persona?: string
          display_name?: string
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_persona?: string
          display_name?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          added_by: string | null
          assigned_modules: string[]
          assigned_registers: string[]
          can_view_commercials: boolean
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Insert: {
          added_by?: string | null
          assigned_modules?: string[]
          assigned_registers?: string[]
          can_view_commercials?: boolean
          created_at?: string
          id?: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Update: {
          added_by?: string | null
          assigned_modules?: string[]
          assigned_registers?: string[]
          can_view_commercials?: boolean
          created_at?: string
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          ai_processing_enabled: boolean
          archived: boolean
          code: string
          created_at: string
          created_by: string
          customer_id: string
          id: string
          is_demo: boolean
          name: string
          retention_note: string
          updated_at: string
        }
        Insert: {
          ai_processing_enabled?: boolean
          archived?: boolean
          code?: string
          created_at?: string
          created_by?: string
          customer_id: string
          id?: string
          is_demo?: boolean
          name: string
          retention_note?: string
          updated_at?: string
        }
        Update: {
          ai_processing_enabled?: boolean
          archived?: boolean
          code?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          is_demo?: boolean
          name?: string
          retention_note?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_sections: {
        Row: {
          approved: boolean
          assessment_id: string
          body: string
          id: string
          internal_only: boolean
          project_id: string
          section_no: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved?: boolean
          assessment_id: string
          body?: string
          id?: string
          internal_only?: boolean
          project_id: string
          section_no: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved?: boolean
          assessment_id?: string
          body?: string
          id?: string
          internal_only?: boolean
          project_id?: string
          section_no?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_sections_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      readiness_gates: {
        Row: {
          applicable: boolean
          assessed: boolean
          assessment_id: string
          evidence_note: string
          gate_no: number
          id: string
          na_reason: string
          na_reviewed: boolean
          project_id: string
          state: number
          updated_at: string
        }
        Insert: {
          applicable?: boolean
          assessed?: boolean
          assessment_id: string
          evidence_note?: string
          gate_no: number
          id?: string
          na_reason?: string
          na_reviewed?: boolean
          project_id: string
          state?: number
          updated_at?: string
        }
        Update: {
          applicable?: boolean
          assessed?: boolean
          assessment_id?: string
          evidence_note?: string
          gate_no?: number
          id?: string
          na_reason?: string
          na_reviewed?: boolean
          project_id?: string
          state?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "readiness_gates_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      register_items: {
        Row: {
          archived: boolean
          assessment_id: string
          code: string
          created_at: string
          created_by: string
          data: Json
          id: string
          linked_question_ids: string[]
          project_id: string
          register_type: string
          review_status: string
          row_version: number
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          visibility: string
        }
        Insert: {
          archived?: boolean
          assessment_id: string
          code: string
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          linked_question_ids?: string[]
          project_id: string
          register_type: string
          review_status?: string
          row_version?: number
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
        }
        Update: {
          archived?: boolean
          assessment_id?: string
          code?: string
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          linked_question_ids?: string[]
          project_id?: string
          register_type?: string
          review_status?: string
          row_version?: number
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "register_items_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      requirements: {
        Row: {
          acceptance_criteria: string
          applicability: string
          archived: boolean
          assessment_id: string
          axis: number
          code: string
          created_at: string
          created_by: string
          critical: boolean
          current_behavior: string
          current_score: number | null
          future_behavior: string
          id: string
          linked_question_ids: string[]
          priority: string
          project_id: string
          proposed_coverage: number | null
          requirement_type: string
          reviewed_by: string | null
          scope: string
          score_rationale: string
          score_reviewed: boolean
          target_score: number | null
          title: string
          updated_at: string
          visibility: string
          wave: string
        }
        Insert: {
          acceptance_criteria?: string
          applicability?: string
          archived?: boolean
          assessment_id: string
          axis: number
          code: string
          created_at?: string
          created_by?: string
          critical?: boolean
          current_behavior?: string
          current_score?: number | null
          future_behavior?: string
          id?: string
          linked_question_ids?: string[]
          priority?: string
          project_id: string
          proposed_coverage?: number | null
          requirement_type?: string
          reviewed_by?: string | null
          scope?: string
          score_rationale?: string
          score_reviewed?: boolean
          target_score?: number | null
          title: string
          updated_at?: string
          visibility?: string
          wave?: string
        }
        Update: {
          acceptance_criteria?: string
          applicability?: string
          archived?: boolean
          assessment_id?: string
          axis?: number
          code?: string
          created_at?: string
          created_by?: string
          critical?: boolean
          current_behavior?: string
          current_score?: number | null
          future_behavior?: string
          id?: string
          linked_question_ids?: string[]
          priority?: string
          project_id?: string
          proposed_coverage?: number | null
          requirement_type?: string
          reviewed_by?: string | null
          scope?: string
          score_rationale?: string
          score_reviewed?: boolean
          target_score?: number | null
          title?: string
          updated_at?: string
          visibility?: string
          wave?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirements_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      snapshots: {
        Row: {
          approved: boolean
          assessment_id: string
          created_at: string
          created_by: string
          id: string
          kind: string
          name: string
          payload: Json
          payload_hash: string
          project_id: string
          rubric_version: string
          rule_version: string
          template_version: string
        }
        Insert: {
          approved?: boolean
          assessment_id: string
          created_at?: string
          created_by?: string
          id?: string
          kind: string
          name: string
          payload: Json
          payload_hash: string
          project_id: string
          rubric_version: string
          rule_version: string
          template_version: string
        }
        Update: {
          approved?: boolean
          assessment_id?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          name?: string
          payload?: Json
          payload_hash?: string
          project_id?: string
          rubric_version?: string
          rule_version?: string
          template_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshots_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      source_references: {
        Row: {
          capability_tags: string[]
          checked_date: string
          guidance: string
          id: string
          provider: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          capability_tags?: string[]
          checked_date: string
          guidance?: string
          id: string
          provider: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          capability_tags?: string[]
          checked_date?: string
          guidance?: string
          id?: string
          provider?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      strategy_scenarios: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assessment_id: string
          created_at: string
          created_by: string
          criteria_scores: Json
          deployment_model: string
          design_strategy: string
          details: Json
          id: string
          is_recommended: boolean
          name: string
          project_id: string
          recommendation_rationale: string
          rollout_pattern: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assessment_id: string
          created_at?: string
          created_by?: string
          criteria_scores?: Json
          deployment_model?: string
          design_strategy: string
          details?: Json
          id?: string
          is_recommended?: boolean
          name: string
          project_id: string
          recommendation_rationale?: string
          rollout_pattern?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assessment_id?: string
          created_at?: string
          created_by?: string
          criteria_scores?: Json
          deployment_model?: string
          design_strategy?: string
          details?: Json
          id?: string
          is_recommended?: boolean
          name?: string
          project_id?: string
          recommendation_rationale?: string
          rollout_pattern?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_scenarios_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      user_assessment_state: {
        Row: {
          assessment_id: string
          last_question_id: string | null
          last_view: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          last_question_id?: string | null
          last_view?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          assessment_id?: string
          last_question_id?: string | null
          last_view?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_assessment_state_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onboarding: {
        Row: {
          checklist_dismissed: boolean
          chosen_role: Database["public"]["Enums"]["axion_role"] | null
          completed_steps: string[]
          created_at: string
          updated_at: string
          user_id: string
          wizard_complete: boolean
          wizard_step: number
        }
        Insert: {
          checklist_dismissed?: boolean
          chosen_role?: Database["public"]["Enums"]["axion_role"] | null
          completed_steps?: string[]
          created_at?: string
          updated_at?: string
          user_id: string
          wizard_complete?: boolean
          wizard_step?: number
        }
        Update: {
          checklist_dismissed?: boolean
          chosen_role?: Database["public"]["Enums"]["axion_role"] | null
          completed_steps?: string[]
          created_at?: string
          updated_at?: string
          user_id?: string
          wizard_complete?: boolean
          wizard_step?: number
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          organisation: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          email: string
          id: string
          organisation?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          organisation?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_packages: {
        Row: {
          acceptance_criteria: string
          archived: boolean
          assessment_id: string
          assumptions: string
          code: string
          conditional: boolean
          created_at: string
          created_by: string
          customer_responsibilities: string
          deliverables: string
          dependencies: string
          finding_ids: string[]
          id: string
          name: string
          project_id: string
          required: boolean
          requirement_ids: string[]
          role_mix: Json
          updated_at: string
          visibility: string
          wave: string
          workstream: string
        }
        Insert: {
          acceptance_criteria?: string
          archived?: boolean
          assessment_id: string
          assumptions?: string
          code: string
          conditional?: boolean
          created_at?: string
          created_by?: string
          customer_responsibilities?: string
          deliverables?: string
          dependencies?: string
          finding_ids?: string[]
          id?: string
          name: string
          project_id: string
          required?: boolean
          requirement_ids?: string[]
          role_mix?: Json
          updated_at?: string
          visibility?: string
          wave?: string
          workstream: string
        }
        Update: {
          acceptance_criteria?: string
          archived?: boolean
          assessment_id?: string
          assumptions?: string
          code?: string
          conditional?: boolean
          created_at?: string
          created_by?: string
          customer_responsibilities?: string
          deliverables?: string
          dependencies?: string
          finding_ids?: string[]
          id?: string
          name?: string
          project_id?: string
          required?: boolean
          requirement_ids?: string[]
          role_mix?: Json
          updated_at?: string
          visibility?: string
          wave?: string
          workstream?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_packages_assessment_id_project_id_fkey"
            columns: ["assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      workspace_records: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          data: Json
          id: string
          initiative_id: string | null
          is_seed: boolean
          kind: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string
          data?: Json
          id: string
          initiative_id?: string | null
          is_seed?: boolean
          kind: string
          updated_at?: string
          updated_by?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          initiative_id?: string | null
          is_seed?: boolean
          kind?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_project_member: {
        Args: {
          p_commercials: boolean
          p_email: string
          p_modules: string[]
          p_project: string
          p_registers: string[]
          p_role: Database["public"]["Enums"]["project_role"]
        }
        Returns: Json
      }
      can_access_customer: { Args: { _customer: string }; Returns: boolean }
      can_edit_internal: { Args: { _project: string }; Returns: boolean }
      can_view_commercials: { Args: { _project: string }; Returns: boolean }
      can_write_register: {
        Args: { _project: string; _type: string }
        Returns: boolean
      }
      current_user_email: { Args: never; Returns: string }
      ensure_axion_access: {
        Args: { _display_name: string; _persona: string }
        Returns: boolean
      }
      ensure_login_report_admin: { Args: never; Returns: boolean }
      flag_answers_revalidation: {
        Args: { p_assessment: string; p_questions: string[] }
        Returns: undefined
      }
      has_agent_access: { Args: { _agent_id: string }; Returns: boolean }
      has_app_role: {
        Args: {
          _role: Database["public"]["Enums"]["studio_app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_axion_role: {
        Args: {
          _role: Database["public"]["Enums"]["axion_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_client_access: { Args: { _client_id: string }; Returns: boolean }
      has_client_role: {
        Args: {
          _client_id: string
          _role: Database["public"]["Enums"]["axion_role"]
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_customer_survey: { Args: { p_survey: string }; Returns: Json }
      is_client_admin: { Args: { _client_id: string }; Returns: boolean }
      is_internal_member: { Args: { _project: string }; Returns: boolean }
      is_project_lead: { Args: { _project: string }; Returns: boolean }
      is_project_member: { Args: { _project: string }; Returns: boolean }
      is_techmahindra_user: { Args: never; Returns: boolean }
      join_demo_project: { Args: never; Returns: Json }
      project_role_of: {
        Args: { _project: string }
        Returns: Database["public"]["Enums"]["project_role"]
      }
      remove_project_member: {
        Args: { p_project: string; p_user: string }
        Returns: undefined
      }
      reset_demo_project: { Args: { p_project: string }; Returns: undefined }
      save_answer: {
        Args: {
          p_assessment: string
          p_confidence: string
          p_due?: string
          p_expected_version: number
          p_instance: string
          p_na_reason: string
          p_notes: string
          p_owner?: string
          p_question: string
          p_state: string
          p_value: Json
        }
        Returns: Json
      }
      set_answer_review: {
        Args: { p_answer: string; p_status: string }
        Returns: undefined
      }
      set_internal_staff: {
        Args: { p_email: string; p_enabled: boolean }
        Returns: Json
      }
      shares_project_with: { Args: { _other: string }; Returns: boolean }
    }
    Enums: {
      app_role: "login_report_admin"
      axion_role:
        | "executive-sponsor"
        | "enterprise-architect"
        | "data360-architect"
        | "data-steward"
        | "data-engineer"
        | "agentforce-architect"
      project_role:
        | "engagement_lead"
        | "solution_architect"
        | "customer_contributor"
        | "customer_reviewer"
        | "internal_viewer"
      studio_app_role: "workspace_admin" | "internal_staff"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["login_report_admin"],
      axion_role: [
        "executive-sponsor",
        "enterprise-architect",
        "data360-architect",
        "data-steward",
        "data-engineer",
        "agentforce-architect",
      ],
      project_role: [
        "engagement_lead",
        "solution_architect",
        "customer_contributor",
        "customer_reviewer",
        "internal_viewer",
      ],
      studio_app_role: ["workspace_admin", "internal_staff"],
    },
  },
} as const
