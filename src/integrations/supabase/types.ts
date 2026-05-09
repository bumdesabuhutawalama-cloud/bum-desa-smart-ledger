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
          business_unit_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_header: boolean
          is_manual_input: boolean
          is_system_account: boolean
          kode_akun: string
          level: number
          nama_akun: string
          normal_balance: Database["public"]["Enums"]["normal_balance"] | null
          parent_id: string | null
          tipe_akun: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          business_unit_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_header?: boolean
          is_manual_input?: boolean
          is_system_account?: boolean
          kode_akun: string
          level?: number
          nama_akun: string
          normal_balance?: Database["public"]["Enums"]["normal_balance"] | null
          parent_id?: string | null
          tipe_akun: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          business_unit_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_header?: boolean
          is_manual_input?: boolean
          is_system_account?: boolean
          kode_akun?: string
          level?: number
          nama_akun?: string
          normal_balance?: Database["public"]["Enums"]["normal_balance"] | null
          parent_id?: string | null
          tipe_akun?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_entries: {
        Row: {
          business_unit_id: string
          created_at: string
          created_by: string | null
          id: string
          input_data: Json
          journal_id: string
          template_id: string
        }
        Insert: {
          business_unit_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          input_data?: Json
          journal_id: string
          template_id: string
        }
        Update: {
          business_unit_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          input_data?: Json
          journal_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_entries_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_entries_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "activity_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_templates: {
        Row: {
          applicable_units: string[] | null
          business_type: string
          code: string
          created_at: string
          description: string | null
          fields: Json
          icon: string | null
          id: string
          is_active: boolean
          keterangan_template: string
          lines: Json
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          applicable_units?: string[] | null
          business_type: string
          code: string
          created_at?: string
          description?: string | null
          fields?: Json
          icon?: string | null
          id?: string
          is_active?: boolean
          keterangan_template?: string
          lines?: Json
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          applicable_units?: string[] | null
          business_type?: string
          code?: string
          created_at?: string
          description?: string | null
          fields?: Json
          icon?: string | null
          id?: string
          is_active?: boolean
          keterangan_template?: string
          lines?: Json
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          accum_depr_account_id: string | null
          akumulasi_penyusutan: number
          asset_account_id: string | null
          business_unit_id: string
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
          business_unit_id?: string
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
          business_unit_id?: string
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
      business_unit_types: {
        Row: {
          created_at: string
          deskripsi: string | null
          icon: string
          id: string
          is_active: boolean
          is_system: boolean
          kode: string
          nama: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deskripsi?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          kode: string
          nama: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deskripsi?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          kode?: string
          nama?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      business_units: {
        Row: {
          created_at: string
          deskripsi: string | null
          id: string
          is_active: boolean
          is_default: boolean
          jenis: string
          kode: string
          nama: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deskripsi?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          jenis?: string
          kode: string
          nama: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deskripsi?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          jenis?: string
          kode?: string
          nama?: string
          updated_at?: string
        }
        Relationships: []
      }
      goods_receipts: {
        Row: {
          business_unit_id: string
          created_at: string
          created_by: string | null
          id: string
          journal_id: string | null
          kas_account_id: string | null
          metode_bayar: string
          nomor_bast: string
          po_id: string
          tanggal: string
          total: number
          updated_at: string
        }
        Insert: {
          business_unit_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          journal_id?: string | null
          kas_account_id?: string | null
          metode_bayar: string
          nomor_bast: string
          po_id: string
          tanggal: string
          total?: number
          updated_at?: string
        }
        Update: {
          business_unit_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          journal_id?: string | null
          kas_account_id?: string | null
          metode_bayar?: string
          nomor_bast?: string
          po_id?: string
          tanggal?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_kas_account_id_fkey"
            columns: ["kas_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          business_unit_id: string
          created_at: string
          harga_beli_default: number
          harga_jual: number
          harga_jual_default: number
          harga_perolehan: number
          id: string
          kategori_barang: string | null
          kode: string
          nama: string
          satuan: string | null
          stok: number
          tipe_barang: string
          unit_usaha_id: string | null
          updated_at: string
        }
        Insert: {
          business_unit_id?: string
          created_at?: string
          harga_beli_default?: number
          harga_jual?: number
          harga_jual_default?: number
          harga_perolehan?: number
          id?: string
          kategori_barang?: string | null
          kode: string
          nama: string
          satuan?: string | null
          stok?: number
          tipe_barang?: string
          unit_usaha_id?: string | null
          updated_at?: string
        }
        Update: {
          business_unit_id?: string
          created_at?: string
          harga_beli_default?: number
          harga_jual?: number
          harga_jual_default?: number
          harga_perolehan?: number
          id?: string
          kategori_barang?: string | null
          kode?: string
          nama?: string
          satuan?: string | null
          stok?: number
          tipe_barang?: string
          unit_usaha_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_unit_usaha_id_fkey"
            columns: ["unit_usaha_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          business_unit_id: string
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
          business_unit_id?: string
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
          business_unit_id?: string
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
          business_unit_id: string
          correction_group_id: string | null
          correction_type: string | null
          created_at: string
          created_by: string | null
          id: string
          is_correction: boolean
          is_transfer_transaction: boolean
          keterangan: string
          nomor_jurnal: string
          source: string
          source_ref: string | null
          source_unit_id: string | null
          status: Database["public"]["Enums"]["journal_status"]
          tanggal: string
          target_unit_id: string | null
          transfer_group_id: string | null
          updated_at: string
        }
        Insert: {
          business_unit_id?: string
          correction_group_id?: string | null
          correction_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_correction?: boolean
          is_transfer_transaction?: boolean
          keterangan: string
          nomor_jurnal: string
          source?: string
          source_ref?: string | null
          source_unit_id?: string | null
          status?: Database["public"]["Enums"]["journal_status"]
          tanggal: string
          target_unit_id?: string | null
          transfer_group_id?: string | null
          updated_at?: string
        }
        Update: {
          business_unit_id?: string
          correction_group_id?: string | null
          correction_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_correction?: boolean
          is_transfer_transaction?: boolean
          keterangan?: string
          nomor_jurnal?: string
          source?: string
          source_ref?: string | null
          source_unit_id?: string | null
          status?: Database["public"]["Enums"]["journal_status"]
          tanggal?: string
          target_unit_id?: string | null
          transfer_group_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payables: {
        Row: {
          business_unit_id: string
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
          business_unit_id?: string
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
          business_unit_id?: string
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
      purchase_order_items: {
        Row: {
          created_at: string
          harga: number
          id: string
          item_id: string
          po_id: string
          qty: number
          subtotal: number
        }
        Insert: {
          created_at?: string
          harga: number
          id?: string
          item_id: string
          po_id: string
          qty: number
          subtotal: number
        }
        Update: {
          created_at?: string
          harga?: number
          id?: string
          item_id?: string
          po_id?: string
          qty?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          business_unit_id: string
          catatan: string | null
          created_at: string
          created_by: string | null
          id: string
          nomor_po: string
          status: string
          supplier_id: string
          tanggal: string
          total: number
          updated_at: string
        }
        Insert: {
          business_unit_id: string
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nomor_po: string
          status?: string
          supplier_id: string
          tanggal: string
          total?: number
          updated_at?: string
        }
        Update: {
          business_unit_id?: string
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nomor_po?: string
          status?: string
          supplier_id?: string
          tanggal?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          business_unit_id: string
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
          business_unit_id?: string
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
          business_unit_id?: string
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
      sales_order_items: {
        Row: {
          created_at: string
          harga_jual: number
          hpp_per_unit: number
          id: string
          item_id: string
          qty: number
          so_id: string
          subtotal: number
        }
        Insert: {
          created_at?: string
          harga_jual: number
          hpp_per_unit: number
          id?: string
          item_id: string
          qty: number
          so_id: string
          subtotal: number
        }
        Update: {
          created_at?: string
          harga_jual?: number
          hpp_per_unit?: number
          id?: string
          item_id?: string
          qty?: number
          so_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_so_id_fkey"
            columns: ["so_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          business_unit_id: string
          created_at: string
          created_by: string | null
          id: string
          journal_id: string | null
          kas_account_id: string | null
          metode_bayar: string
          nomor_so: string
          pelanggan: string | null
          tanggal: string
          total: number
          total_hpp: number
          updated_at: string
        }
        Insert: {
          business_unit_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          journal_id?: string | null
          kas_account_id?: string | null
          metode_bayar?: string
          nomor_so: string
          pelanggan?: string | null
          tanggal: string
          total?: number
          total_hpp?: number
          updated_at?: string
        }
        Update: {
          business_unit_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          journal_id?: string | null
          kas_account_id?: string | null
          metode_bayar?: string
          nomor_so?: string
          pelanggan?: string | null
          tanggal?: string
          total?: number
          total_hpp?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_kas_account_id_fkey"
            columns: ["kas_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          alamat: string | null
          business_unit_id: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          nama_supplier: string
          telepon: string | null
          updated_at: string
        }
        Insert: {
          alamat?: string | null
          business_unit_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          nama_supplier: string
          telepon?: string | null
          updated_at?: string
        }
        Update: {
          alamat?: string | null
          business_unit_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          nama_supplier?: string
          telepon?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
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
      usp_loan_installments: {
        Row: {
          bunga: number
          business_unit_id: string
          created_at: string
          denda: number
          id: string
          loan_id: string
          pokok: number
          tanggal_bayar: string
          total_bayar: number
          updated_at: string
        }
        Insert: {
          bunga?: number
          business_unit_id: string
          created_at?: string
          denda?: number
          id?: string
          loan_id: string
          pokok?: number
          tanggal_bayar: string
          total_bayar?: number
          updated_at?: string
        }
        Update: {
          bunga?: number
          business_unit_id?: string
          created_at?: string
          denda?: number
          id?: string
          loan_id?: string
          pokok?: number
          tanggal_bayar?: string
          total_bayar?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usp_loan_installments_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usp_loan_installments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "usp_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      usp_loans: {
        Row: {
          angsuran_per_bulan: number
          bunga_persen_per_tahun: number
          business_unit_id: string
          created_at: string
          id: string
          jumlah_pinjaman: number
          member_id: string
          sisa_pinjaman: number
          status: string
          tanggal_pencairan: string
          tenor_bulan: number
          updated_at: string
        }
        Insert: {
          angsuran_per_bulan: number
          bunga_persen_per_tahun: number
          business_unit_id: string
          created_at?: string
          id?: string
          jumlah_pinjaman: number
          member_id: string
          sisa_pinjaman: number
          status?: string
          tanggal_pencairan: string
          tenor_bulan: number
          updated_at?: string
        }
        Update: {
          angsuran_per_bulan?: number
          bunga_persen_per_tahun?: number
          business_unit_id?: string
          created_at?: string
          id?: string
          jumlah_pinjaman?: number
          member_id?: string
          sisa_pinjaman?: number
          status?: string
          tanggal_pencairan?: string
          tenor_bulan?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usp_loans_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usp_loans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "usp_members"
            referencedColumns: ["id"]
          },
        ]
      }
      usp_members: {
        Row: {
          alamat: string | null
          business_unit_id: string
          created_at: string
          id: string
          nama: string
          no_hp: string | null
          status_aktif: boolean
          tanggal_daftar: string
          updated_at: string
        }
        Insert: {
          alamat?: string | null
          business_unit_id: string
          created_at?: string
          id?: string
          nama: string
          no_hp?: string | null
          status_aktif?: boolean
          tanggal_daftar?: string
          updated_at?: string
        }
        Update: {
          alamat?: string | null
          business_unit_id?: string
          created_at?: string
          id?: string
          nama?: string
          no_hp?: string | null
          status_aktif?: boolean
          tanggal_daftar?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usp_members_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_kode_akun: { Args: { p_parent_id: string }; Returns: string }
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
      insert_account_auto: {
        Args: {
          p_nama_akun: string
          p_parent_id: string
          p_tipe_akun: Database["public"]["Enums"]["account_type"]
        }
        Returns: undefined
      }
      insert_coa: {
        Args: {
          p_balance: Database["public"]["Enums"]["normal_balance"]
          p_header: boolean
          p_kode: string
          p_level: number
          p_nama: string
          p_parent_kode: string
          p_tipe: Database["public"]["Enums"]["account_type"]
        }
        Returns: undefined
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
