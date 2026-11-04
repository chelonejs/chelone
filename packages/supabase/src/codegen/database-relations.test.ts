import { describe, expect, it } from "vitest";
import { readDatabaseRelations } from "./database-relations";

// The shape `supabase gen types typescript` writes, trimmed to what matters.
const databaseText = `export type Json = string | number | boolean | null

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12.2.3"
  }
  public: {
    Tables: {
      posts: {
        Row: {
          id: number
          author_id: string
          editor_id: string | null
          title: string
        }
        Insert: {
          id?: number
          author_id: string
          title: string
        }
        Update: {
          id?: number
          author_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      authors: {
        Row: {
          id: string
          name: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "authors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      "blog-comments": {
        Row: {
          id: number
          post_id: number
          tenant_id: string
        }
        Insert: {
          id?: number
          post_id: number
          tenant_id: string
        }
        Update: {
          id?: number
          post_id?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_post_fkey"
            columns: ["post_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
    }
    Views: {
      published_posts: {
        Row: {
          id: number | null
          author_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      count_posts: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      post_status: "draft" | "published"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  other: {
    Tables: {
      notes: {
        Row: { id: number }
        Insert: { id?: number }
        Update: { id?: number }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
  }
}

export type Tables<T> = T
`;

describe("readDatabaseRelations", () => {
  it("reads the tables and views of a schema in order", () => {
    expect(
      readDatabaseRelations(databaseText, "public").map(
        ({ name, kind }) => `${kind} ${name}`,
      ),
    ).toEqual([
      "table posts",
      "table authors",
      "table blog-comments",
      "view published_posts",
    ]);
    expect(readDatabaseRelations(databaseText, "other")).toEqual([
      { name: "notes", kind: "table", references: [] },
    ]);
  });

  it("turns a one-column foreign key into a reference", () => {
    const relations = readDatabaseRelations(databaseText, "public");
    expect(relations.find(({ name }) => name === "posts")?.references).toEqual([
      { column: "author_id", relation: "authors" },
      { column: "editor_id", relation: "users" },
    ]);
    expect(
      relations.find(({ name }) => name === "published_posts")?.references,
    ).toEqual([{ column: "author_id", relation: "authors" }]);
  });

  it("skips a compound foreign key", () => {
    const relations = readDatabaseRelations(databaseText, "public");
    expect(
      relations.find(({ name }) => name === "blog-comments")?.references,
    ).toEqual([]);
  });

  it("ignores __InternalSupabase, Functions, Enums and CompositeTypes", () => {
    const names = readDatabaseRelations(databaseText, "public").map(
      ({ name }) => name,
    );
    for (const ignored of [
      "__InternalSupabase",
      "PostgrestVersion",
      "count_posts",
      "post_status",
    ]) {
      expect(names).not.toContain(ignored);
    }
    expect(() =>
      readDatabaseRelations(databaseText, "__InternalSupabase"),
    ).toThrow(/__InternalSupabase/);
  });

  it("throws naming a missing Database type or schema", () => {
    expect(() => readDatabaseRelations(databaseText, "billing")).toThrow(
      /billing/,
    );
    expect(() =>
      readDatabaseRelations("export type Json = string", "public"),
    ).toThrow(/Database/);
  });
});
