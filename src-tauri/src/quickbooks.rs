use crate::amount_to_words::amount_to_words_php;
use crate::models::{BillCreditItem, SignatoriesConfig, VoucherData, VoucherLineItem};
use serde::Deserialize;
use std::path::PathBuf;
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(Deserialize)]
struct BridgeResponse {
    success: bool,
    error: String,
    ref_number: String,
    date: String,
    due_date: String,
    payee_name: String,
    payee_address: String,
    bank_account: String,
    ap_account: String,
    tin: String,
    po_number: String,
    memo: String,
    total_amount: f64,
    line_items: Vec<VoucherLineItem>,
    bill_credits: Vec<BillCreditItem>,
}

fn find_qb_bridge_exe() -> Option<PathBuf> {
    let manifest_bin = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("bin")
        .join("QBBridge.exe");
    if manifest_bin.exists() {
        return Some(manifest_bin);
    }

    let relative_candidates = [
        PathBuf::from("bin\\QBBridge.exe"),
        PathBuf::from("src-tauri\\bin\\QBBridge.exe"),
        PathBuf::from("QBBridge.exe"),
    ];
    for p in &relative_candidates {
        if p.exists() {
            return Some(p.clone());
        }
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            let c1 = parent.join("bin").join("QBBridge.exe");
            if c1.exists() {
                return Some(c1);
            }
            let c2 = parent.join("QBBridge.exe");
            if c2.exists() {
                return Some(c2);
            }
        }
    }

    None
}

pub fn query_voucher_from_qb(
    form_type: &str,
    client_code: &str,
    company_name: &str,
    ref_number: &str,
    series_number: &str,
    signatories: SignatoriesConfig,
) -> Result<VoucherData, String> {
    if ref_number.trim().is_empty() {
        return Err("Please enter a Reference Number to search.".to_string());
    }

    let exe_path = find_qb_bridge_exe()
        .ok_or_else(|| "QBBridge.exe not found in src-tauri/bin/.".to_string())?;

    let mut cmd = Command::new(&exe_path);
    cmd.arg(form_type).arg(ref_number.trim());

    if let Some(bin_dir) = exe_path.parent() {
        cmd.current_dir(bin_dir);
    }

    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute QBBridge.exe: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "QBBridge returned empty output. Make sure QuickBooks Desktop is running with a company file open. {}",
            stderr
        ));
    }

    let parsed: BridgeResponse = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse QuickBooks response: {} (Raw: {})", e, stdout))?;

    if !parsed.success {
        return Err(parsed.error);
    }

    let words = amount_to_words_php(parsed.total_amount);

    Ok(VoucherData {
        form_type: form_type.to_string(),
        client_code: client_code.to_string(),
        company_name: company_name.to_string(),
        ref_number: parsed.ref_number,
        series_number: series_number.to_string(),
        date: parsed.date,
        due_date: if parsed.due_date.is_empty() {
            None
        } else {
            Some(parsed.due_date)
        },
        payee_name: parsed.payee_name,
        payee_address: parsed.payee_address,
        bank_account: parsed.bank_account,
        ap_account: parsed.ap_account,
        tin: parsed.tin,
        po_number: parsed.po_number,
        memo: parsed.memo,
        total_amount: parsed.total_amount,
        amount_in_words: words,
        currency_symbol: "₱".to_string(),
        line_items: parsed.line_items,
        bill_credits: parsed.bill_credits,
        signatories,
    })
}
