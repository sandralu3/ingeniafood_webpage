export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          country: string | null;
          language: string;
          is_premium: boolean;
          can_self_toggle_premium: boolean;
          is_tester: boolean;
          openai_photo_credits: number;
          referral_code: string;
          generations_left: number;
          daily_scan_limit: number;
          scans_used_today: number;
          scan_quota_date: string;
          health_score: number;
          premium_trial_remaining: number;
          premium_trial_claimed_at: string | null;
          weight_kg: number | null;
          height_cm: number | null;
          age_years: number | null;
          biological_sex: "female" | "male" | null;
          activity_level:
            | "sedentary"
            | "light"
            | "moderate"
            | "active"
            | "very_active"
            | null;
          nutrition_goal: "deficit" | "maintenance" | "surplus" | null;
          calorie_goal_override: number | null;
          protein_goal_override: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          country?: string | null;
          language?: string;
          is_premium?: boolean;
          can_self_toggle_premium?: boolean;
          is_tester?: boolean;
          openai_photo_credits?: number;
          referral_code?: string;
          generations_left?: number;
          daily_scan_limit?: number;
          scans_used_today?: number;
          scan_quota_date?: string;
          health_score?: number;
          premium_trial_remaining?: number;
          premium_trial_claimed_at?: string | null;
          weight_kg?: number | null;
          height_cm?: number | null;
          age_years?: number | null;
          biological_sex?: "female" | "male" | null;
          activity_level?:
            | "sedentary"
            | "light"
            | "moderate"
            | "active"
            | "very_active"
            | null;
          nutrition_goal?: "deficit" | "maintenance" | "surplus" | null;
          calorie_goal_override?: number | null;
          protein_goal_override?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          country?: string | null;
          language?: string;
          is_premium?: boolean;
          can_self_toggle_premium?: boolean;
          is_tester?: boolean;
          openai_photo_credits?: number;
          referral_code?: string;
          generations_left?: number;
          daily_scan_limit?: number;
          scans_used_today?: number;
          scan_quota_date?: string;
          health_score?: number;
          premium_trial_remaining?: number;
          premium_trial_claimed_at?: string | null;
          weight_kg?: number | null;
          height_cm?: number | null;
          age_years?: number | null;
          biological_sex?: "female" | "male" | null;
          activity_level?:
            | "sedentary"
            | "light"
            | "moderate"
            | "active"
            | "very_active"
            | null;
          nutrition_goal?: "deficit" | "maintenance" | "surplus" | null;
          calorie_goal_override?: number | null;
          protein_goal_override?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      subscriptions: {
        Row: {
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: string;
          price_id: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: string;
          price_id?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: string;
          price_id?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      recipes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          ingredients: Json;
          steps: Json;
          instructions: string;
          tip_sandra: string | null;
          cooking_time: number | null;
          image_url: string | null;
          reference_image_url: string | null;
          instagram_url: string | null;
          meal_type: string | null;
          cuisine_style: string | null;
          servings: number | null;
          complexity: string | null;
          meal_type_advisory: string | null;
          tags: Json | null;
          is_airfryer: boolean;
          is_flourless: boolean;
          is_public: boolean;
          es_instagram: boolean;
          macros: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          ingredients?: Json;
          steps?: Json;
          instructions: string;
          tip_sandra?: string | null;
          cooking_time?: number | null;
          image_url?: string | null;
          reference_image_url?: string | null;
          instagram_url?: string | null;
          meal_type?: string | null;
          cuisine_style?: string | null;
          servings?: number | null;
          complexity?: string | null;
          meal_type_advisory?: string | null;
          tags?: Json | null;
          is_airfryer?: boolean;
          is_flourless?: boolean;
          is_public?: boolean;
          es_instagram?: boolean;
          macros?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          ingredients?: Json;
          steps?: Json;
          instructions?: string;
          tip_sandra?: string | null;
          cooking_time?: number | null;
          image_url?: string | null;
          reference_image_url?: string | null;
          instagram_url?: string | null;
          meal_type?: string | null;
          cuisine_style?: string | null;
          servings?: number | null;
          complexity?: string | null;
          meal_type_advisory?: string | null;
          tags?: Json | null;
          is_airfryer?: boolean;
          is_flourless?: boolean;
          is_public?: boolean;
          es_instagram?: boolean;
          macros?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      dish_image_bank: {
        Row: {
          id: string;
          image_url: string;
          title: string;
          meal_types: string[];
          cuisine_styles: string[];
          keywords: string[];
          tags: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          image_url: string;
          title: string;
          meal_types?: string[];
          cuisine_styles?: string[];
          keywords?: string[];
          tags?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          image_url?: string;
          title?: string;
          meal_types?: string[];
          cuisine_styles?: string[];
          keywords?: string[];
          tags?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      master_ingredients: {
        Row: {
          id: string;
          name: string;
          category: "proteinas" | "vegetales" | "basicos_despensa";
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: "proteinas" | "vegetales" | "basicos_despensa";
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: "proteinas" | "vegetales" | "basicos_despensa";
          created_at?: string;
        };
        Relationships: [];
      };
      user_pantry_favorites: {
        Row: {
          id: string;
          user_id: string;
          ingredient_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ingredient_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ingredient_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_pantry_favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_pantry_favorites_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "master_ingredients";
            referencedColumns: ["id"];
          }
        ];
      };
      saved_recipes: {
        Row: {
          user_id: string;
          recipe_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          recipe_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          recipe_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_recipes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_recipes_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          }
        ];
      };
      tips_saludables: {
        Row: {
          id: string;
          contenido: string;
          creado_at: string;
          language: string;
        };
        Insert: {
          id?: string;
          contenido: string;
          creado_at?: string;
          language?: string;
        };
        Update: {
          id?: string;
          contenido?: string;
          creado_at?: string;
          language?: string;
        };
        Relationships: [];
      };
      retos_usuarios: {
        Row: {
          id: string;
          user_id: string;
          reto_id: string;
          completado_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reto_id: string;
          completado_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reto_id?: string;
          completado_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "retos_usuarios_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      retos_personalizados: {
        Row: {
          id: string;
          user_id: string;
          titulo: string;
          puntos: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          titulo: string;
          puntos?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          titulo?: string;
          puntos?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "retos_personalizados_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      retos_completados_diarios: {
        Row: {
          id: string;
          user_id: string;
          reto_id: string;
          completado_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reto_id: string;
          completado_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reto_id?: string;
          completado_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "retos_completados_diarios_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      retos_hoy_activos: {
        Row: {
          id: string;
          user_id: string;
          reto_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reto_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reto_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "retos_hoy_activos_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      plan_semanal: {
        Row: {
          id: string;
          user_id: string;
          semana_inicio: string;
          dia_semana: string;
          tipo_comida: string;
          recipe_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          semana_inicio: string;
          dia_semana: string;
          tipo_comida: string;
          recipe_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          semana_inicio?: string;
          dia_semana?: string;
          tipo_comida?: string;
          recipe_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_semanal_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plan_semanal_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
