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
          is_premium: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          is_premium?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          is_premium?: boolean;
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
          is_airfryer: boolean;
          is_flourless: boolean;
          is_public: boolean;
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
          is_airfryer?: boolean;
          is_flourless?: boolean;
          is_public?: boolean;
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
          is_airfryer?: boolean;
          is_flourless?: boolean;
          is_public?: boolean;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
