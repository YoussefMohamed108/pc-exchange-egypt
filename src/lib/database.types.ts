import type { Product, InspectionReport, Order, Role, InventoryRow } from "./domain";
import type { ContactProfile, SellerListing, Benchmark } from "./marketplace-validation";
import type { FieldReport, InspectionRequest } from "./inspections";
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
export type Database = {
  public: {
    Tables: {
      profiles: Table<{ id: string; full_name: string; created_at: string }>;
      account_roles: Table<{ user_id: string; role: Role }>;
      profile_contacts: Table<ContactProfile>;
      marketplace_listings: Table<SellerListing>;
      benchmark_submissions: Table<Benchmark>;
      inspection_requests: Table<InspectionRequest>;
      field_inspections: Table<FieldReport & { created_at: string; revision: number }>;
      inspection_reports: Table<InspectionReport>;
      audit_logs: Table<{
        id: number;
        entity_id: string;
        action: string;
        details: Record<string, Json>;
        created_at: string;
      }>;
      categories: Table<{ slug: string; name_en: string; name_ar: string; display_order: number }>;
      products: Table<
        Omit<Product, "available_quantity" | "verification_status" | "inspection_id"> & {
          status: string;
          updated_at: string;
          admin_paused: boolean;
          deleted_at: string | null;
        }
      >;
      inventory_items: Table<
        Omit<InventoryRow, "products"> & {
          serial_number: string | null;
          created_at: string;
          updated_at: string;
        }
      >;
      orders: Table<
        Order & {
          idempotency_key: string;
          fulfillment_method: string;
          verified_by: string | null;
          verified_at: string | null;
          updated_at: string;
        }
      >;
      platform_settings: Table<{ key: string; value: Json; updated_at: string }>;
    };
    Views: {
      all_catalog_products: { Row: Product & { search_document: string }; Relationships: [] };
      public_products: { Row: Product & { search_document: string }; Relationships: [] };
      public_inspection_reports: { Row: InspectionReport; Relationships: [] };
      public_field_inspections: { Row: FieldReport; Relationships: [] };
      customer_order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          title: string;
          quantity: number;
          unit_price_piastres: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      seller_delete_listing: {
        Args: { lid: string; expected_updated_at: string; confirmation: string };
        Returns: string;
      };
      seller_pending_file_cleanup: {
        Args: Record<string, never>;
        Returns: { bucket_id: string; object_path: string }[];
      };
      seller_finish_file_cleanup: { Args: Record<string, never>; Returns: undefined };
      seller_listing_action: {
        Args: {
          lid: string;
          expected_updated_at: string;
          operation: string;
          confirmation: string;
        };
        Returns: undefined;
      };
      admin_delete_product: {
        Args: {
          source: string;
          pid: string;
          expected_updated_at: string;
          confirmation: string;
          reason: string;
        };
        Returns: string;
      };
      admin_pending_file_cleanup: {
        Args: Record<string, never>;
        Returns: { bucket_id: string; object_path: string }[];
      };
      admin_finish_file_cleanup: { Args: Record<string, never>; Returns: undefined };
      admin_review_queue: {
        Args: { queue_kind: string; term: string; filter_status: string; page_number: number };
        Returns: Json;
      };
      admin_find_products: {
        Args: { term: string; kind: string; state: string; page_number: number };
        Returns: Json;
      };
      admin_product_contact: {
        Args: { lid: string };
        Returns: {
          display_name: string;
          phone: string;
          social_url: string;
          governorate: string;
        } | null;
      };
      admin_product_action: {
        Args: {
          source: string;
          pid: string;
          expected_updated_at: string;
          operation: string;
          reason: string;
        };
        Returns: undefined;
      };
      request_field_inspection: {
        Args: { lid: string; expected_revision: number; note: string };
        Returns: string;
      };
      manage_inspection_request: {
        Args: { rid: string; decision: string; note: string; appointment: string | null };
        Returns: undefined;
      };
      publish_field_inspection: { Args: { data: Json }; Returns: string };
      save_contact: { Args: { data: Json }; Returns: undefined };
      save_marketplace_listing: { Args: { data: Json }; Returns: string };
      seller_contact: {
        Args: { lid: string };
        Returns: { display_name: string; phone: string; social_url: string; governorate: string }[];
      };
      review_benchmark: {
        Args: { sid: string; decision: string; note: string };
        Returns: undefined;
      };
      moderate_listing: {
        Args: { lid: string; hide: boolean; reason: string };
        Returns: undefined;
      };
      save_inventory: { Args: { data: Json }; Returns: string };
      publish_inspection: { Args: { data: Json }; Returns: string };
      place_order: {
        Args: {
          p_items: Json;
          p_payment_method: string;
          p_phone: string;
          p_idempotency_key: string;
        };
        Returns: string;
      };
      submit_payment_reference: {
        Args: { p_order_id: string; p_reference: string };
        Returns: undefined;
      };
      process_order: { Args: { p_order_id: string; p_action: string }; Returns: undefined };
    };
    Enums: { app_role: Role };
    CompositeTypes: Record<string, never>;
  };
};
