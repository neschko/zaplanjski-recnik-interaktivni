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
      analyses: {
        Row: {
          audio_filename: string | null
          confidence: number | null
          created_at: string
          detected_dialect: Database["public"]["Enums"]["dialect"] | null
          id: string
          input_text: string | null
          model: string | null
          owner_id: string | null
          reasoning: string | null
          source_type: string
          transcript: string | null
        }
        Insert: {
          audio_filename?: string | null
          confidence?: number | null
          created_at?: string
          detected_dialect?: Database["public"]["Enums"]["dialect"] | null
          id?: string
          input_text?: string | null
          model?: string | null
          owner_id?: string | null
          reasoning?: string | null
          source_type: string
          transcript?: string | null
        }
        Update: {
          audio_filename?: string | null
          confidence?: number | null
          created_at?: string
          detected_dialect?: Database["public"]["Enums"]["dialect"] | null
          id?: string
          input_text?: string | null
          model?: string | null
          owner_id?: string | null
          reasoning?: string | null
          source_type?: string
          transcript?: string | null
        }
        Relationships: []
      }
      analysis_word_hits: {
        Row: {
          analysis_id: string
          created_at: string
          entry_id: string | null
          id: string
          matched_word: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          entry_id?: string | null
          id?: string
          matched_word: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          entry_id?: string | null
          id?: string
          matched_word?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_word_hits_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          entry_id: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          entry_id: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          entry_id?: string
          id?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
          category_id: string | null
          created_at: string
          definition: string
          dialect: Database["public"]["Enums"]["dialect"]
          examples: string[]
          id: string
          owner_id: string | null
          scope: Database["public"]["Enums"]["entry_scope"]
          synonyms: string[]
          updated_at: string
          word: string
          word_normalized: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          definition: string
          dialect?: Database["public"]["Enums"]["dialect"]
          examples?: string[]
          id?: string
          owner_id?: string | null
          scope?: Database["public"]["Enums"]["entry_scope"]
          synonyms?: string[]
          updated_at?: string
          word: string
          word_normalized?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          definition?: string
          dialect?: Database["public"]["Enums"]["dialect"]
          examples?: string[]
          id?: string
          owner_id?: string | null
          scope?: Database["public"]["Enums"]["entry_scope"]
          synonyms?: string[]
          updated_at?: string
          word?: string
          word_normalized?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      dialect:
        | "prizrensko_juznomoravski"
        | "svrljisko_zaplanjski"
        | "timocko_luznicki"
        | "kosovsko_resavski"
        | "sumadijsko_vojvodjanski"
        | "ostalo"
        | "nepoznato"
      entry_scope: "osnovni" | "licni" | "zajednicki"
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
      app_role: ["admin", "user"],
      dialect: [
        "prizrensko_juznomoravski",
        "svrljisko_zaplanjski",
        "timocko_luznicki",
        "kosovsko_resavski",
        "sumadijsko_vojvodjanski",
        "ostalo",
        "nepoznato",
      ],
      entry_scope: ["osnovni", "licni", "zajednicki"],
    },
  },
} as const
