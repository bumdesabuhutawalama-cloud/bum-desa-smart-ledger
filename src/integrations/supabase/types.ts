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
      accounts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_header: boolean
          kode_akun: string
          level: number
          nama_akun: string
          normal_balance: Database["public"]["Enums"]["normal_balance"]
          parent_id: string | null
          tipe_akun: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_header?: boolean
          kode_akun: string
          level?: number
          nama_akun: string
          normal_balance: Database["public"]["Enums"]["normal_balance"]
          parent_id?: string | null
          tipe_akun: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_header?: boolean
          kode_akun?: string
          level?: number
          nama_akun?: string
          normal_balance?: Database["public"]["Enums"]["normal_balance"]
          parent_id?: string | null
          tipe_akun?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          accum_depr_account_id: string | null
          akumulasi_penyusutan: number
          asset_account_id: string | null
          created_at: string
          depr_expense_account_id: string | null
          harga_perolehan: number
          id: string
          is_active: boolean
          journal_id: string | null
          kategori: string | null
          masa_manfaat_bulan: number
          metode: string
          nama: string
          nilai_residu: number
          tanggal_perolehan: string
          updated_at: string
        }
        Insert: {
          accum_depr_account_id?: string | null
          akumulasi_penyusutan?: number
          asset_account_id?: string | null
          created_at?: string
          depr_expense_account_id?: string | null
          harga_perolehan: number
          id?: string
          is_active?: boolean
          journal_id?: string | null
          kategori?: string | null
          masa_manfaat_bulan: number
          metode?: string
          nama: string
          nilai_residu?: number
          tanggal_perolehan: string
          updated_at?: string
        }
        Update: {
          accum_depr_account_id?: string | null
          akumulasi_penyusutan?: number
          asset_account_id?: string | null
          created_at?: string
          depr_expense_account_id?: string | null
          harga_perolehan?: number
          id?: string
          is_active?: boolean
          journal_id?: string | null
          kategori?: string | null
          masa_manfaat_bulan?: number
          metode?: string
          nama?: string
          nilai_residu?: number
          tanggal_perolehan?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_accum_depr_account_id_fkey"
            columns: ["accum_depr_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_asset_account_id_fkey"
            columns: ["asset_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_depr_expense_account_id_fkey"
            columns: ["depr_expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          created_at: string
          harga_jual: number
          harga_perolehan: number
          id: string
          kode: string
          nama: string
          satuan: string | null
          stok: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          harga_jual?: number
          harga_perolehan?: number
          id?: string
          kode: string
          nama: string
          satuan?: string | null
          stok?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          harga_jual?: number
          harga_perolehan?: number
          id?: string
          kode?: string
          nama?: string
          satuan?: string | null
          stok?: number
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          harga: number
          id: string
          item_id: string
          keterangan: string | null
          qty: number
          tanggal: string
          tipe: string
        }
        Insert: {
          created_at?: string
          harga?: number
          id?: string
          item_id: string
          keterangan?: string | null
          qty: number
          tanggal: string
          tipe: string
        }
        Update: {
          created_at?: string
          harga?: number
          id?: string
          item_id?: string
          keterangan?: string | null
          qty?: number
          tanggal?: string
          tipe?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          created_at: string
          debit: number
          id: string
          journal_id: string
          keterangan: string | null
          kredit: number
          line_order: number
        }
        Insert: {
          account_id: string
          created_at?: string
          debit?: number
          id?: string
          journal_id: string
          keterangan?: string | null
          kredit?: number
          line_order?: number
        }
        Update: {
          account_id?: string
          created_at?: string
          debit?: number
          id?: string
          journal_id?: string
          keterangan?: string | null
          kredit?: number
          line_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      journals: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          keterangan: string
          nomor_jurnal: string
          source: string
          source_ref: string | null
          status: Database["public"]["Enums"]["journal_status"]
          tanggal: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          keterangan: string
          nomor_jurnal: string
          source?: string
          source_ref?: string | null
          status?: Database["public"]["Enums"]["journal_status"]
          tanggal: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          keterangan?: string
          nomor_jurnal?: string
          source?: string
          source_ref?: string | null
          status?: Database["public"]["Enums"]["journal_status"]
          tanggal?: string
          updated_at?: string
        }
        Relationships: []
      }
      payables: {
        Row: {
          created_at: string
          id: string
          is_paid: boolean
          jatuh_tempo: string | null
          jumlah: number
          keterangan: string | null
          klasifikasi: string
          nama_kreditur: string
          tanggal: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_paid?: boolean
          jatuh_tempo?: string | null
          jumlah: number
          keterangan?: string | null
          klasifikasi?: string
          nama_kreditur: string
          tanggal: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_paid?: boolean
          jatuh_tempo?: string | null
          jumlah?: number
          keterangan?: string | null
          klasifikasi?: string
          nama_kreditur?: string
          tanggal?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      receivables: {
        Row: {
          created_at: string
          id: string
          jatuh_tempo: string | null
          jumlah: number
          keterangan: string | null
          nama_debitur: string
          penyisihan: number
          status: Database["public"]["Enums"]["receivable_status"]
          tanggal: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          jatuh_tempo?: string | null
          jumlah: number
          keterangan?: string | null
          nama_debitur: string
          penyisihan?: number
          status?: Database["public"]["Enums"]["receivable_status"]
          tanggal: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          jatuh_tempo?: string | null
          jumlah?: number
          keterangan?: string | null
          nama_debitur?: string
          penyisihan?: number
          status?: Database["public"]["Enums"]["receivable_status"]
          tanggal?: string
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
    }
    Enums: {
      account_type:
        | "ASET"
        | "KEWAJIBAN"
        | "EKUITAS"
        | "PENDAPATAN"
        | "BEBAN"
        | "HPP"
        | "PENDAPATAN_LAIN"
        | "BEBAN_LAIN"
      app_role: "admin" | "bendahara" | "auditor"
      journal_status: "draft" | "posted"
      normal_balance: "DEBIT" | "KREDIT"
      receivable_status: "lancar" | "kurang_lancar" | "diragukan" | "macet"
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
      account_type: [
        "ASET",
        "KEWAJIBAN",
        "EKUITAS",
        "PENDAPATAN",
        "BEBAN",
        "HPP",
        "PENDAPATAN_LAIN",
        "BEBAN_LAIN",
      ],
      app_role: ["admin", "bendahara", "auditor"],
      journal_status: ["draft", "posted"],
      normal_balance: ["DEBIT", "KREDIT"],
      receivable_status: ["lancar", "kurang_lancar", "diragukan", "macet"],
    },
  },
} as const
