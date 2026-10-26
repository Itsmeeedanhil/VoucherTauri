export interface FieldOffset {
  x_mm: number;
  y_mm: number;
  font_size_pt?: number | null;
}

export type BradwellFieldKey =
  | "payee_name"
  | "payee_address"
  | "cv_number"
  | "date"
  | "particulars"
  | "top_amount"
  | "distribution_table"
  | "prepared_by"
  | "checked_by"
  | "approved_by"
  | "audited_by"
  | "amount_in_words"
  | "php_amount"
  | "received_by"
  | "received_date"
  | "bank_name"
  | "check_no"
  | "check_date";

export interface LayoutConfig {
  page_size: string;
  margin_top_mm: number;
  margin_bottom_mm: number;
  margin_left_mm: number;
  margin_right_mm: number;
  header_font_size: number;
  body_font_size: number;
  table_font_size: number;
  show_company_header: boolean;
  show_class_column: boolean;
  show_customer_job_column: boolean;
  show_tin: boolean;
  signatory_columns: number;
  check_x_offset_mm: number;
  check_y_offset_mm: number;
  check_date_spacing: number;
  check_rotate_90: boolean;
  custom_title?: string;
  preprinted_x_offset_mm?: number;
  preprinted_y_offset_mm?: number;
  show_amount_in_words_receipt?: boolean;
  show_distribution_totals?: boolean;
  field_offsets?: Record<string, FieldOffset>;
}

export interface ClientProfile {
  id: string;
  code: string;
  name: string;
  address: string;
  contact_number: string;
  website: string;
  tin: string;
  sub_companies: string[];
  enabled_forms: string[];
  logo_url?: string | null;
  layout_config: LayoutConfig;
}

export interface SeriesConfig {
  client_code: string;
  form_type: string;
  current_number: number;
  prefix: string;
  digit_count: number;
}

export interface SignatoriesConfig {
  client_code: string;
  prepared_by_name: string;
  prepared_by_pos: string;
  reviewed_by_name: string;
  reviewed_by_pos: string;
  approved_by_name: string;
  approved_by_pos: string;
  received_by_name: string;
  received_by_pos: string;
  checked_by_name: string;
  checked_by_pos: string;
  recommending_name: string;
  recommending_pos: string;
}

export interface VoucherLineItem {
  account_number: string;
  account_name: string;
  class_name: string;
  customer_job: string;
  memo: string;
  debit: number;
  credit: number;
  quantity?: number;
  unit_cost?: number;
  item_name?: string;
}

export interface BillCreditItem {
  credit_ref_number: string;
  applied_amount: number;
  account_name: string;
  class_name: string;
  memo: string;
}

export interface VoucherData {
  form_type: string;
  client_code: string;
  company_name: string;
  ref_number: string;
  series_number: string;
  date: string;
  due_date?: string | null;
  payee_name: string;
  payee_address: string;
  bank_account: string;
  ap_account: string;
  tin: string;
  po_number: string;
  memo: string;
  total_amount: number;
  amount_in_words: string;
  currency_symbol: string;
  line_items: VoucherLineItem[];
  bill_credits: BillCreditItem[];
  signatories: SignatoriesConfig;
}

export type FormType = "CV";

export const FORM_LABELS: Record<FormType, string> = {
  CV: "Check Voucher",
};

export type GuideOverlayMode = "scan_overlay" | "wireframe_guide" | "data_only";

