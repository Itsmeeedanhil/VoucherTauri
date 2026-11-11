use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldOffset {
    pub x_mm: f64,
    pub y_mm: f64,
    pub font_size_pt: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutConfig {
    pub page_size: String, // "Letter"
    pub margin_top_mm: f64,
    pub margin_bottom_mm: f64,
    pub margin_left_mm: f64,
    pub margin_right_mm: f64,
    pub header_font_size: u32,
    pub body_font_size: u32,
    pub table_font_size: u32,
    pub show_company_header: bool,
    pub show_class_column: bool,
    pub show_customer_job_column: bool,
    pub show_tin: bool,
    pub signatory_columns: u32,
    pub check_x_offset_mm: f64,
    pub check_y_offset_mm: f64,
    pub check_date_spacing: u32,
    pub check_rotate_90: bool,
    pub custom_title: Option<String>,
    #[serde(default)]
    pub preprinted_x_offset_mm: f64,
    #[serde(default)]
    pub preprinted_y_offset_mm: f64,
    #[serde(default)]
    pub show_amount_in_words_receipt: bool,
    #[serde(default)]
    pub show_distribution_totals: bool,
    #[serde(default)]
    pub field_offsets: HashMap<String, FieldOffset>,
}

impl Default for LayoutConfig {
    fn default() -> Self {
        Self {
            page_size: "Letter".to_string(),
            margin_top_mm: 0.0,
            margin_bottom_mm: 0.0,
            margin_left_mm: 0.0,
            margin_right_mm: 0.0,
            header_font_size: 11,
            body_font_size: 10,
            table_font_size: 9,
            show_company_header: false,
            show_class_column: false,
            show_customer_job_column: false,
            show_tin: false,
            signatory_columns: 4,
            check_x_offset_mm: 0.0,
            check_y_offset_mm: 0.0,
            check_date_spacing: 2,
            check_rotate_90: false,
            custom_title: Some("CHECK VOUCHER".to_string()),
            preprinted_x_offset_mm: 0.0,
            preprinted_y_offset_mm: 0.0,
            show_amount_in_words_receipt: false,
            show_distribution_totals: false,
            field_offsets: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientProfile {
    pub id: String,
    pub code: String,
    pub name: String,
    pub address: String,
    pub contact_number: String,
    pub website: String,
    pub tin: String,
    pub sub_companies: Vec<String>,
    pub enabled_forms: Vec<String>, // ["CV", "Check"]
    pub logo_url: Option<String>,
    pub layout_config: LayoutConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeriesConfig {
    pub client_code: String,
    pub form_type: String,
    pub current_number: i64,
    pub prefix: String,
    pub digit_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SignatoriesConfig {
    pub client_code: String,
    pub prepared_by_name: String,
    pub prepared_by_pos: String,
    pub reviewed_by_name: String,
    pub reviewed_by_pos: String,
    pub approved_by_name: String,
    pub approved_by_pos: String,
    pub received_by_name: String,
    pub received_by_pos: String,
    pub checked_by_name: String,
    pub checked_by_pos: String,
    pub recommending_name: String,
    pub recommending_pos: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct VoucherLineItem {
    pub account_number: String,
    pub account_name: String,
    pub class_name: String,
    pub customer_job: String,
    pub memo: String,
    pub debit: f64,
    pub credit: f64,
    #[serde(default)]
    pub quantity: f64,
    #[serde(default)]
    pub unit_cost: f64,
    #[serde(default)]
    pub item_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BillCreditItem {
    pub credit_ref_number: String,
    pub applied_amount: f64,
    pub account_name: String,
    pub class_name: String,
    pub memo: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct VoucherData {
    pub form_type: String,
    pub client_code: String,
    pub company_name: String,
    pub ref_number: String,
    pub series_number: String,
    pub date: String,
    pub due_date: Option<String>,
    pub payee_name: String,
    pub payee_address: String,
    pub bank_account: String,
    pub ap_account: String,
    pub tin: String,
    #[serde(default)]
    pub payee_zip: String,
    #[serde(default)]
    pub payor_name: String,
    #[serde(default)]
    pub payor_address: String,
    #[serde(default)]
    pub payor_tin: String,
    #[serde(default)]
    pub payor_zip: String,
    pub po_number: String,
    pub memo: String,
    pub total_amount: f64,
    pub amount_in_words: String,
    pub currency_symbol: String,
    pub line_items: Vec<VoucherLineItem>,
    pub bill_credits: Vec<BillCreditItem>,
    pub signatories: SignatoriesConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Form2307Row {
    pub description: String,
    pub atc: String,
    pub month1: f64,
    pub month2: f64,
    pub month3: f64,
    pub total: f64,
    pub tax_withheld: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Form2307Data {
    pub company_name: String,
    pub from_date: String, // YYYY-MM-DD
    pub to_date: String,   // YYYY-MM-DD
    pub payee_tin: String,
    pub payee_name: String,
    pub payee_address: String,
    pub payee_zip: String,
    pub payee_foreign_address: String,
    pub payor_tin: String,
    pub payor_name: String,
    pub payor_address: String,
    pub payor_zip: String,
    pub payor_signatory: String,
    pub payor_title_tin: String,
    #[serde(default)]
    pub payor_title: String,
    #[serde(default)]
    pub payor_rep_tin: String,
    #[serde(default)]
    pub payor_signature_url: String,
    pub payee_signatory: String,
    pub payee_title_tin: String,
    pub table1: Vec<Form2307Row>,
    pub table2: Vec<Form2307Row>,
}

impl Default for Form2307Data {
    fn default() -> Self {
        let default_rows = || (0..10).map(|_| Form2307Row::default()).collect();
        Self {
            company_name: "".to_string(),
            from_date: "".to_string(),
            to_date: "".to_string(),
            payee_tin: "".to_string(),
            payee_name: "".to_string(),
            payee_address: "".to_string(),
            payee_zip: "".to_string(),
            payee_foreign_address: "".to_string(),
            payor_tin: "".to_string(),
            payor_name: "".to_string(),
            payor_address: "".to_string(),
            payor_zip: "".to_string(),
            payor_signatory: "".to_string(),
            payor_title_tin: "".to_string(),
            payor_title: "".to_string(),
            payor_rep_tin: "".to_string(),
            payor_signature_url: "".to_string(),
            payee_signatory: "".to_string(),
            payee_title_tin: "".to_string(),
            table1: default_rows(),
            table2: default_rows(),
        }
    }
}


