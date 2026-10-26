# VoucherPRO (Tauri + React + QuickBooks SDK)

A desktop Check Voucher printing system built with **Tauri v2**, **React 18**, **TypeScript**, **Tailwind CSS v4**, and **QuickBooks Desktop SDK (`QBFC16Lib`)**.

Designed for **pre-printed Check Voucher forms**, VoucherPRO connects directly to QuickBooks Desktop to fetch Check and Bill Payment transactions, resolves Chart of Accounts codes and Item Asset/Expense accounts, and prints strictly the data fields aligned to the physical form.

---

## Key Features

- **Live QuickBooks Desktop SDK (`QBFC16Lib`) Integration**
  - Queries both **Write Checks** (`ICheckQuery`) and **Pay Bills Checks** (`IBillPaymentCheckQuery` + `IBillQuery` for applied bills).
  - Automatically maps QuickBooks Chart of Accounts (`Account Code` & `Account Title`) and resolves Inventory, Non-Inventory, Service, and Other Charge items to their corresponding Asset or Expense accounts.
  - Consolidates debit and credit distribution rows and appends the balancing Bank Account credit line.

- **Pre-Printed Check Voucher Data-Only Output**
  - Outputs **only the data fields** (`Payee`, `Address`, `CV Number`, `Date`, `Particulars`, `Amount`, `Distribution of Accounts`, `Signatories`, `Receipt Amount`, `Received By`, `Bank`, `Check No.`, and `Check Date`) on an `8.5" x 11"` portrait sheet.
  - Includes an interactive **Move / Adjust Layout Fields** mode in the top toolbar to drag any field or fine-tune its `X (mm)`, `Y (mm)`, and `Font (pt)` settings with an optional non-printing form lines guide.

- **Multi-Company & Multi-Client Extensibility**
  - Supports switching between multiple companies (with independent per-company CV Series Number tracking in SQLite):
    - *Bradwell Sales and Marketing Corp.*
    - *Mapleway International Distributions Corp.*
    - *StoneBridge Materials Corp.*
  - Built with a modular client profile & layout architecture in SQLite (`rusqlite`) to easily add new clients and custom voucher layouts in the future.

- **Persistent Local Storage (SQLite)**
  - Saves per-company CV Series Numbers (with auto-increment on print and manual `+` / `-` controls).
  - Saves authorized signatories (`Prepared By`, `Checked By`, `Approved By`, `Audited By`, `Received By`).
  - Saves custom field position offsets and font sizes per client profile.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite 6, Tailwind CSS v4, Lucide Icons |
| **Desktop Core** | Tauri v2 (Rust), `rusqlite` (bundled SQLite) |
| **QuickBooks Bridge** | C# (.NET Framework 4.0 x86) + `Interop.QBFC16Lib.dll` (`QBBridge.exe`) |

---

## Project Structure

```text
VoucherProTVersion/
├── src/
│   ├── components/
│   │   ├── layouts/
│   │   │   └── BradwellCheckVoucherLayout.tsx  # Pre-printed CV data-only layout & drag calibration
│   │   ├── Sidebar.tsx                         # Company selector, series counter, QB search, print
│   │   ├── SignatoriesModal.tsx                # Signatories configuration modal
│   │   └── VoucherCanvas.tsx                   # Top layout adjustment toolbar & print canvas
│   ├── types/
│   │   └── voucher.ts                          # TypeScript interfaces
│   ├── App.tsx                                 # Application state & Tauri command bindings
│   ├── index.css                               # Print stylesheet (@media print) & UI styles
│   └── main.tsx                                # React entry point
├── src-tauri/
│   ├── bin/
│   │   ├── QBBridge.cs                         # QuickBooks SDK (QBFC16Lib) C# source
│   │   ├── QBBridge.exe                        # Compiled x86 QuickBooks COM bridge executable
│   │   └── Interop.QBFC16Lib.dll               # QuickBooks Foundation Classes 16 Interop DLL
│   ├── src/
│   │   ├── amount_to_words.rs                  # Philippine Peso amount-to-words converter
│   │   ├── db.rs                               # SQLite database initialization & queries
│   │   ├── lib.rs                              # Tauri command handlers
│   │   ├── main.rs                             # Rust binary entry point
│   │   ├── models.rs                           # Serde data models
│   │   └── quickbooks.rs                       # Process bridge to QBBridge.exe
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── vite.config.ts
```

---

## Prerequisites

1. **Windows 10 / 11**
2. **QuickBooks Desktop** installed and running with a company file open, plus **QuickBooks SDK (`QBFC16`)** runtime installed.
3. **Node.js** (v18+) and **Rust** (stable toolchain with MSVC build tools) for development.

---

## Getting Started

### 1. Install Frontend Dependencies
```powershell
npm install
```

### 2. Run in Development Mode
```powershell
npm run tauri dev
```

### 3. Build Production Installer
```powershell
npm run tauri build
```

### 4. Recompiling the QuickBooks Bridge (`QBBridge.exe`)
If you modify `src-tauri/bin/QBBridge.cs`, recompile it targeting `x86` (required for 32-bit QuickBooks Desktop COM interop):
```powershell
& "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe" /nologo /platform:x86 /target:exe /out:"src-tauri\bin\QBBridge.exe" /reference:"src-tauri\bin\Interop.QBFC16Lib.dll" "src-tauri\bin\QBBridge.cs"
```
