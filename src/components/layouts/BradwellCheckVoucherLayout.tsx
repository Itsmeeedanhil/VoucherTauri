import React, { useRef, useState } from "react";
import {
  BradwellFieldKey,
  ClientProfile,
  FieldOffset,
  VoucherData,
} from "../../types/voucher";

interface Props {
  data: VoucherData;
  client: ClientProfile;
  payeeOverride: string;
  showWireframeGuide: boolean;
  showCompanyHeader?: boolean;
  calibrationMode: boolean;
  selectedField: BradwellFieldKey | null;
  onSelectField: (field: BradwellFieldKey | null) => void;
  onUpdateFieldOffset: (field: BradwellFieldKey, next: FieldOffset) => void;
}

export interface BradwellFieldAnchor {
  key: BradwellFieldKey;
  label: string;
  xIn: number;
  yIn: number;
  widthIn: number;
  heightIn?: number;
  defaultFontPt: number;
  align?: "left" | "center" | "right";
  fontWeight?: "normal" | "bold";
}

export type CvFieldKey = Exclude<
  BradwellFieldKey,
  | "bir2307_from_date"
  | "bir2307_to_date"
  | "bir2307_payee_tin"
  | "bir2307_payee_name"
  | "bir2307_payee_address"
  | "bir2307_payee_zip"
  | "bir2307_foreign_address"
  | "bir2307_payor_tin"
  | "bir2307_payor_name"
  | "bir2307_payor_address"
  | "bir2307_payor_zip"
  | "bir2307_table1"
  | "bir2307_table2"
  | "bir2307_payor_signatory"
  | "bir2307_payee_signatory"
>;

/**
 * Official company header details from the client's registration / invoice forms
 */
export const COMPANY_HEADER_DETAILS: Record<
  string,
  { title: string; tinLine: string; addressLine1: string; addressLine2?: string }
> = {
  "Bradwell Sales and Marketing Corp.": {
    title: "BRADWELL SALES AND MARKETING CORP.",
    tinLine: "VAT Reg. TIN: 010-261-476-00000",
    addressLine1: "#84-B Malakas St. Pinyahan Diliman",
    addressLine2: "1100 Quezon City NCR, Second District Philippines",
  },
  "Mapleway International Distributions Corp.": {
    title: "MAPLEWAY INTERNATIONAL DISTRIBUTIONS CORP.",
    tinLine: "VAT Registered TIN: 010-284-984-00000",
    addressLine1:
      "Room 14 Philexcel Business Center 2, Philexcel Business Park, M.A. Roxas Highway,",
    addressLine2:
      "Clark Freeport Zone, 2023 Clark, Pampanga, Philippines * Phone# (632) 5000878",
  },
  "StoneBridge Materials Corp.": {
    title: "STONEBRIDGE MATERIALS CORP.",
    tinLine: "VAT Registered TIN: 686-324-627-00000",
    addressLine1:
      "Room 6, Philexcel Business Arcade 3, Philexcel Business Park, M.A. Roxas Highway,",
    addressLine2: "Clark Freeport Zone, 2023 Clark, Pampanga, Philippines",
  },
};

/**
 * Anchor coordinates (in inches on an 8.5" x 11.0" Letter page)
 * aligned to the full Bradwell Check Voucher form template.
 */
export const BRADWELL_FIELD_ANCHORS: Record<CvFieldKey, BradwellFieldAnchor> = {
  company_header: {
    key: "company_header",
    label: "Company Header (Name / TIN / Address)",
    xIn: 0.35,
    yIn: 0.45,
    widthIn: 4.9,
    defaultFontPt: 11.5,
    fontWeight: "bold",
  },
  payee_name: {
    key: "payee_name",
    label: "Payee Name (PAYEE:)",
    xIn: 0.9,
    yIn: 1.18,
    widthIn: 4.36,
    defaultFontPt: 10,
    fontWeight: "bold",
  },
  payee_address: {
    key: "payee_address",
    label: "Payee Address (ADDRESS)",
    xIn: 1.0,
    yIn: 1.38,
    widthIn: 4.26,
    defaultFontPt: 8.5,
    fontWeight: "normal",
  },
  cv_number: {
    key: "cv_number",
    label: "CV Series Number (CV NUMBER :)",
    xIn: 6.32,
    yIn: 1.16,
    widthIn: 1.62,
    defaultFontPt: 11,
    align: "center",
    fontWeight: "bold",
  },
  date: {
    key: "date",
    label: "Voucher Date (DATE:)",
    xIn: 5.92,
    yIn: 1.46,
    widthIn: 1.95,
    defaultFontPt: 10,
    fontWeight: "bold",
  },
  particulars: {
    key: "particulars",
    label: "Particulars / Memo",
    xIn: 0.45,
    yIn: 2.02,
    widthIn: 5.75,
    heightIn: 1.18,
    defaultFontPt: 9.5,
    fontWeight: "normal",
  },
  top_amount: {
    key: "top_amount",
    label: "Particulars Amount (AMOUNT)",
    xIn: 6.25,
    yIn: 2.02,
    widthIn: 1.62,
    defaultFontPt: 10.5,
    align: "right",
    fontWeight: "bold",
  },
  distribution_table: {
    key: "distribution_table",
    label: "Distribution of Accounts Table",
    xIn: 0.42,
    yIn: 3.63,
    widthIn: 7.49,
    heightIn: 5.1,
    defaultFontPt: 9.5,
    fontWeight: "normal",
  },
  prepared_by: {
    key: "prepared_by",
    label: "Prepared By Signatory",
    xIn: 0.38,
    yIn: 9.01,
    widthIn: 1.92,
    defaultFontPt: 9.5,
    align: "center",
    fontWeight: "bold",
  },
  checked_by: {
    key: "checked_by",
    label: "Checked By Signatory",
    xIn: 2.37,
    yIn: 9.01,
    widthIn: 1.62,
    defaultFontPt: 9.5,
    align: "center",
    fontWeight: "bold",
  },
  approved_by: {
    key: "approved_by",
    label: "Approved By Signatory",
    xIn: 4.05,
    yIn: 9.01,
    widthIn: 1.95,
    defaultFontPt: 9.5,
    align: "center",
    fontWeight: "bold",
  },
  audited_by: {
    key: "audited_by",
    label: "Audited By Signatory",
    xIn: 6.06,
    yIn: 9.01,
    widthIn: 1.88,
    defaultFontPt: 9.5,
    align: "center",
    fontWeight: "bold",
  },
  amount_in_words: {
    key: "amount_in_words",
    label: "Received the Amount (Words)",
    xIn: 0.42,
    yIn: 9.43,
    widthIn: 5.05,
    defaultFontPt: 8.5,
    fontWeight: "normal",
  },
  php_amount: {
    key: "php_amount",
    label: "Receipt PHP Amount (PHP)",
    xIn: 0.8,
    yIn: 9.72,
    widthIn: 1.48,
    defaultFontPt: 10,
    fontWeight: "bold",
  },
  received_by: {
    key: "received_by",
    label: "Received By Name",
    xIn: 3.11,
    yIn: 9.71,
    widthIn: 1.15,
    defaultFontPt: 9,
    align: "center",
    fontWeight: "bold",
  },
  received_date: {
    key: "received_date",
    label: "Received Date",
    xIn: 4.65,
    yIn: 9.71,
    widthIn: 0.86,
    defaultFontPt: 8.5,
    align: "center",
    fontWeight: "normal",
  },
  bank_name: {
    key: "bank_name",
    label: "Bank Name (Bank :)",
    xIn: 6.18,
    yIn: 9.29,
    widthIn: 1.75,
    defaultFontPt: 9,
    fontWeight: "bold",
  },
  check_no: {
    key: "check_no",
    label: "Check Number (Check No. :)",
    xIn: 6.45,
    yIn: 9.47,
    widthIn: 1.48,
    defaultFontPt: 9.5,
    fontWeight: "bold",
  },
  check_date: {
    key: "check_date",
    label: "Check Date (Check Date :)",
    xIn: 6.52,
    yIn: 9.65,
    widthIn: 1.41,
    defaultFontPt: 9,
    fontWeight: "bold",
  },
};

const formatCurrency = (val: number) => {
  if (!val || Math.abs(val) < 0.001) return "";
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const BradwellCheckVoucherLayout: React.FC<Props> = ({
  data,
  client,
  payeeOverride,
  showWireframeGuide,
  showCompanyHeader = true,
  calibrationMode,
  selectedField,
  onSelectField,
  onUpdateFieldOffset,
}) => {
  const cfg = client.layout_config;
  const globalXmm = cfg.preprinted_x_offset_mm ?? 0;
  const globalYmm = cfg.preprinted_y_offset_mm ?? 0;
  const fieldOffsets = cfg.field_offsets ?? {};

  const dragRef = useRef<{
    key: BradwellFieldKey;
    startClientX: number;
    startClientY: number;
    initialXmm: number;
    initialYmm: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getFieldOffset = (key: BradwellFieldKey): FieldOffset => {
    return fieldOffsets[key] ?? { x_mm: 0, y_mm: 0, font_size_pt: null };
  };

  const getFieldStyle = (key: CvFieldKey): React.CSSProperties => {
    const anchor = BRADWELL_FIELD_ANCHORS[key];
    const fOff = getFieldOffset(key);
    const totalXmm = globalXmm + (fOff.x_mm || 0);
    const totalYmm = globalYmm + (fOff.y_mm || 0);
    const fontPt = fOff.font_size_pt ?? anchor.defaultFontPt;

    return {
      position: "absolute",
      left: `calc(${anchor.xIn}in + ${totalXmm}mm)`,
      top: `calc(${anchor.yIn}in + ${totalYmm}mm)`,
      width: `${anchor.widthIn}in`,
      height: anchor.heightIn ? `${anchor.heightIn}in` : undefined,
      fontSize: `${fontPt}pt`,
      fontWeight: anchor.fontWeight ?? "normal",
      textAlign: anchor.align ?? "left",
      lineHeight: 1.2,
      color: "#000000",
      fontFamily: "Arial, Helvetica, sans-serif",
      zIndex: selectedField === key ? 30 : 20,
      userSelect: calibrationMode ? "none" : "auto",
      cursor: calibrationMode ? "move" : "default",
    };
  };

  const handleMouseDownField = (e: React.MouseEvent, key: BradwellFieldKey) => {
    if (!calibrationMode) return;
    e.stopPropagation();
    onSelectField(key);
    const current = getFieldOffset(key);
    dragRef.current = {
      key,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialXmm: current.x_mm || 0,
      initialYmm: current.y_mm || 0,
    };
    setIsDragging(true);
  };

  const handleMouseMovePage = (e: React.MouseEvent) => {
    if (!isDragging || !dragRef.current) return;
    const dxMm = ((e.clientX - dragRef.current.startClientX) * 25.4) / 96.0;
    const dyMm = ((e.clientY - dragRef.current.startClientY) * 25.4) / 96.0;
    const nextX = Math.round((dragRef.current.initialXmm + dxMm) * 2) / 2;
    const nextY = Math.round((dragRef.current.initialYmm + dyMm) * 2) / 2;
    const current = getFieldOffset(dragRef.current.key);
    onUpdateFieldOffset(dragRef.current.key, {
      ...current,
      x_mm: nextX,
      y_mm: nextY,
    });
  };

  const handleMouseUpPage = () => {
    if (isDragging) {
      setIsDragging(false);
      dragRef.current = null;
    }
  };

  const fieldCalibrationClass = (key: BradwellFieldKey) => {
    if (!calibrationMode) return "data-field-node";
    const isSel = selectedField === key;
    return `data-field-node rounded-xs transition-shadow ${
      isSel
        ? "outline-2 outline-blue-600 bg-blue-500/15 shadow-xs"
        : "outline-1 outline-dashed outline-amber-500/80 hover:bg-amber-500/10"
    }`;
  };

  const activeCompanyName = data.company_name || client.name;
  const companyDetails = COMPANY_HEADER_DETAILS[activeCompanyName] ?? {
    title: activeCompanyName.toUpperCase(),
    tinLine: client.tin ? `VAT Reg. TIN: ${client.tin}` : "",
    addressLine1: client.address || "",
  };

  const displayPayee = payeeOverride || data.payee_name;
  const displayAddress = data.payee_address;
  const displayParticulars = data.memo;
  const displayTotalAmount = formatCurrency(data.total_amount);

  const sig = data.signatories;
  const preparedBy = sig.prepared_by_name;
  const checkedBy = sig.checked_by_name || sig.reviewed_by_name;
  const approvedBy = sig.approved_by_name;
  const auditedBy = sig.recommending_name;
  const receivedBy = sig.received_by_name;

  return (
    <div
      className="voucher-page relative bg-white text-black shadow-2xl mx-auto select-text"
      style={{
        width: "8.5in",
        minWidth: "8.5in",
        maxWidth: "8.5in",
        height: "11in",
        minHeight: "11in",
        maxHeight: "11in",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#ffffff",
      }}
      onMouseMove={handleMouseMovePage}
      onMouseUp={handleMouseUpPage}
      onMouseLeave={handleMouseUpPage}
      onClick={() => {
        if (calibrationMode) onSelectField(null);
      }}
    >
      {/* Full Check Voucher Form Structure (Rendered & Printed on Plain Bond Paper) */}
      {showWireframeGuide && (
        <div
          className="pointer-events-none select-none"
          style={{
            position: "absolute",
            inset: 0,
            width: "8.5in",
            height: "11in",
            zIndex: 1,
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#000000",
          }}
        >
          {/* Vertical Divider Line Extending Above the Outer Box (left of CHECK VOUCHER) */}
          <div
            style={{
              position: "absolute",
              left: "5.335in",
              top: "0.46in",
              height: "0.64in",
              borderLeft: "1.5px solid #000000",
            }}
          />

          {/* CHECK VOUCHER Title (Top-Right above CV NUMBER box) */}
          <div
            style={{
              position: "absolute",
              left: "5.335in",
              top: "0.70in",
              width: "2.645in",
              textAlign: "center",
              fontSize: "18.5pt",
              fontWeight: 800,
              letterSpacing: "0.02em",
              color: "#000000",
              lineHeight: 1,
            }}
          >
            CHECK VOUCHER
          </div>

          {/* Outer Main Voucher Border Box */}
          <div
            style={{
              position: "absolute",
              left: "0.35in",
              top: "1.10in",
              width: "7.63in",
              height: "8.905in",
              border: "1.5px solid #000000",
            }}
          />

          {/* Row 1: PAYEE / ADDRESS & CV NUMBER / DATE Box */}
          <div
            style={{
              position: "absolute",
              left: "0.35in",
              top: "1.10in",
              width: "7.63in",
              height: "0.66in",
              borderBottom: "1.5px solid #000000",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "4.985in",
                top: 0,
                bottom: 0,
                borderLeft: "1.5px solid #000000",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "0.06in",
                top: "0.09in",
                fontSize: "8.5pt",
                fontWeight: 700,
              }}
            >
              PAYEE:
            </span>
            <span
              style={{
                position: "absolute",
                left: "0.06in",
                top: "0.29in",
                fontSize: "8.5pt",
                fontWeight: 700,
              }}
            >
              ADDRESS
            </span>
            <span
              style={{
                position: "absolute",
                left: "5.06in",
                top: "0.09in",
                fontSize: "9pt",
                fontWeight: 700,
              }}
            >
              CV NUMBER :
            </span>
            {/* Solid Underline after CV NUMBER : extending to the right border */}
            <div
              style={{
                position: "absolute",
                left: "5.95in",
                right: 0,
                top: "0.25in",
                borderBottom: "1.2px solid #000000",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "5.10in",
                top: "0.38in",
                fontSize: "9pt",
                fontWeight: 700,
              }}
            >
              DATE:
            </span>
          </div>

          {/* Row 2: PARTICULARS & AMOUNT Box */}
          <div
            style={{
              position: "absolute",
              left: "0.35in",
              top: "1.76in",
              width: "7.63in",
              height: "1.515in",
              borderBottom: "1.5px solid #000000",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "2.15in",
                top: "0.05in",
                fontSize: "9pt",
                fontWeight: 700,
              }}
            >
              PARTICULARS
            </span>
            <span
              style={{
                position: "absolute",
                right: "0.90in",
                top: "0.05in",
                fontSize: "9pt",
                fontWeight: 700,
              }}
            >
              AMOUNT
            </span>
          </div>

          {/* Row 3A: DISTRIBUTION OF ACCOUNTS Title Band */}
          <div
            style={{
              position: "absolute",
              left: "0.35in",
              top: "3.275in",
              width: "7.63in",
              height: "0.16in",
              borderBottom: "1.2px solid #000000",
              textAlign: "center",
              fontSize: "8.5pt",
              fontWeight: 700,
              lineHeight: "0.16in",
            }}
          >
            DISTRIBUTION OF ACCOUNTS
          </div>

          {/* Row 3B: Account Code | Account Title | Debit | Credit Column Header Band */}
          <div
            style={{
              position: "absolute",
              left: "0.35in",
              top: "3.435in",
              width: "7.63in",
              height: "0.15in",
              borderBottom: "1.5px solid #000000",
              fontSize: "8pt",
              fontWeight: 700,
              lineHeight: "0.15in",
            }}
          >
            <span style={{ position: "absolute", left: "0.48in" }}>
              Account Code
            </span>
            <span style={{ position: "absolute", left: "2.60in" }}>
              Account Title
            </span>
            <span style={{ position: "absolute", left: "5.55in" }}>Debit</span>
            <span style={{ position: "absolute", left: "6.95in" }}>Credit</span>
          </div>

          {/* Row 4: Signatories Box (Prepared By | Checked By | Approved By | Audited By) */}
          <div
            style={{
              position: "absolute",
              left: "0.35in",
              top: "8.835in",
              width: "7.63in",
              height: "0.385in",
              borderTop: "1.5px solid #000000",
              borderBottom: "1.5px solid #000000",
              fontSize: "8pt",
              fontWeight: 700,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "1.99in",
                top: 0,
                bottom: 0,
                borderLeft: "1.5px solid #000000",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "3.67in",
                top: 0,
                bottom: 0,
                borderLeft: "1.5px solid #000000",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "5.68in",
                top: 0,
                bottom: 0,
                borderLeft: "1.5px solid #000000",
              }}
            />
            <span
              style={{ position: "absolute", left: "0.05in", top: "0.02in" }}
            >
              Prepared By:
            </span>
            <span
              style={{ position: "absolute", left: "2.04in", top: "0.02in" }}
            >
              Checked By:
            </span>
            <span
              style={{ position: "absolute", left: "3.72in", top: "0.02in" }}
            >
              Approved By:
            </span>
            <span
              style={{ position: "absolute", left: "5.73in", top: "0.02in" }}
            >
              Audited By:
            </span>
          </div>

          {/* Row 5: Bottom Receipt & Bank Details Box */}
          <div
            style={{
              position: "absolute",
              left: "0.35in",
              top: "9.22in",
              width: "7.63in",
              height: "0.785in",
              fontSize: "8pt",
              fontWeight: 700,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "5.215in",
                top: 0,
                bottom: 0,
                borderLeft: "1.5px solid #000000",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "0.05in",
                top: "0.04in",
                fontSize: "8.5pt",
              }}
            >
              Received the Amount
            </span>
            <span
              style={{
                position: "absolute",
                left: "0.05in",
                top: "0.50in",
                fontSize: "9.5pt",
              }}
            >
              PHP
            </span>
            <span
              style={{ position: "absolute", left: "2.02in", top: "0.53in" }}
            >
              Received By:
            </span>
            {/* Solid Underline for Received By */}
            <div
              style={{
                position: "absolute",
                left: "2.76in",
                width: "1.16in",
                top: "0.66in",
                borderBottom: "1.2px solid #000000",
              }}
            />
            <span
              style={{ position: "absolute", left: "3.98in", top: "0.53in" }}
            >
              Date:
            </span>
            {/* Solid Underline for Date */}
            <div
              style={{
                position: "absolute",
                left: "4.30in",
                width: "0.86in",
                top: "0.66in",
                borderBottom: "1.2px solid #000000",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "5.36in",
                top: "0.08in",
                fontSize: "8.5pt",
              }}
            >
              Bank :
            </span>
            <span
              style={{
                position: "absolute",
                left: "5.36in",
                top: "0.26in",
                fontSize: "8.5pt",
              }}
            >
              Check No. :
            </span>
            <span
              style={{
                position: "absolute",
                left: "5.36in",
                top: "0.44in",
                fontSize: "8.5pt",
              }}
            >
              Check Date :
            </span>
          </div>
        </div>
      )}

      {/* COMPANY HEADER (Selected Company Name, TIN, Address in Top-Left) */}
      {showCompanyHeader && (
        <div
          className={fieldCalibrationClass("company_header")}
          style={getFieldStyle("company_header")}
          onMouseDown={(e) => handleMouseDownField(e, "company_header")}
          title="Drag to adjust Company Header position"
        >
          <div
            style={{
              fontWeight: 800,
              letterSpacing: "0.01em",
              lineHeight: 1.15,
            }}
          >
            {companyDetails.title}
          </div>
          {companyDetails.tinLine && (
            <div
              style={{
                fontSize: "7.5pt",
                fontWeight: 600,
                lineHeight: 1.2,
                marginTop: "1px",
              }}
            >
              {companyDetails.tinLine}
            </div>
          )}
          {companyDetails.addressLine1 && (
            <div
              style={{
                fontSize: "7.5pt",
                fontWeight: 400,
                lineHeight: 1.15,
              }}
            >
              {companyDetails.addressLine1}
            </div>
          )}
          {companyDetails.addressLine2 && (
            <div
              style={{
                fontSize: "7.5pt",
                fontWeight: 400,
                lineHeight: 1.15,
              }}
            >
              {companyDetails.addressLine2}
            </div>
          )}
        </div>
      )}

      {/* PAYEE NAME */}
      <div
        className={fieldCalibrationClass("payee_name")}
        style={getFieldStyle("payee_name")}
        onMouseDown={(e) => handleMouseDownField(e, "payee_name")}
        title="Drag to adjust Payee Name position"
      >
        <div className="truncate">{displayPayee}</div>
      </div>

      {/* PAYEE ADDRESS */}
      <div
        className={fieldCalibrationClass("payee_address")}
        style={getFieldStyle("payee_address")}
        onMouseDown={(e) => handleMouseDownField(e, "payee_address")}
        title="Drag to adjust Address position"
      >
        <div className="line-clamp-2 leading-tight">{displayAddress}</div>
      </div>

      {/* CV SERIES NUMBER */}
      <div
        className={fieldCalibrationClass("cv_number")}
        style={getFieldStyle("cv_number")}
        onMouseDown={(e) => handleMouseDownField(e, "cv_number")}
        title="Drag to adjust CV Number position"
      >
        {data.series_number}
      </div>

      {/* VOUCHER DATE */}
      <div
        className={fieldCalibrationClass("date")}
        style={getFieldStyle("date")}
        onMouseDown={(e) => handleMouseDownField(e, "date")}
        title="Drag to adjust Date position"
      >
        {data.date}
      </div>

      {/* PARTICULARS / MEMO */}
      <div
        className={fieldCalibrationClass("particulars")}
        style={getFieldStyle("particulars")}
        onMouseDown={(e) => handleMouseDownField(e, "particulars")}
        title="Drag to adjust Particulars position"
      >
        <div className="whitespace-pre-wrap break-words leading-snug">
          {displayParticulars}
        </div>
      </div>

      {/* TOP AMOUNT (Right side of Particulars Box) */}
      <div
        className={fieldCalibrationClass("top_amount")}
        style={getFieldStyle("top_amount")}
        onMouseDown={(e) => handleMouseDownField(e, "top_amount")}
        title="Drag to adjust Amount position"
      >
        <span className="font-mono">{displayTotalAmount}</span>
      </div>

      {/* DISTRIBUTION OF ACCOUNTS TABLE ROWS (Account Code | Account Title | Debit | Credit) */}
      <div
        className={fieldCalibrationClass("distribution_table")}
        style={{
          ...getFieldStyle("distribution_table"),
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
        }}
        onMouseDown={(e) => handleMouseDownField(e, "distribution_table")}
        title="Drag to adjust Distribution of Accounts rows position"
      >
        <div className="w-full space-y-1">
          {data.line_items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-baseline w-full leading-tight"
              style={{ minHeight: "0.19in" }}
            >
              {/* Column 1: Account Code */}
              <div
                style={{ width: "1.43in", paddingRight: "0.08in" }}
                className="font-mono truncate"
              >
                {item.account_number}
              </div>

              {/* Column 2: Account Title */}
              <div
                style={{
                  width: "3.45in",
                  paddingRight: "0.10in",
                  paddingLeft:
                    item.credit > 0 && item.debit === 0 ? "0.22in" : "0in",
                }}
                className="truncate"
              >
                {item.account_name}
              </div>

              {/* Column 3: Debit */}
              <div
                style={{ width: "1.30in", paddingRight: "0.08in" }}
                className="text-right font-mono"
              >
                {formatCurrency(item.debit)}
              </div>

              {/* Column 4: Credit */}
              <div
                style={{ width: "1.30in", paddingRight: "0.04in" }}
                className="text-right font-mono"
              >
                {formatCurrency(item.credit)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SIGNATORIES ROW (Prepared By | Checked By | Approved By | Audited By) */}
      <div
        className={fieldCalibrationClass("prepared_by")}
        style={getFieldStyle("prepared_by")}
        onMouseDown={(e) => handleMouseDownField(e, "prepared_by")}
        title="Drag to adjust Prepared By position"
      >
        <div className="truncate">{preparedBy}</div>
      </div>

      <div
        className={fieldCalibrationClass("checked_by")}
        style={getFieldStyle("checked_by")}
        onMouseDown={(e) => handleMouseDownField(e, "checked_by")}
        title="Drag to adjust Checked By position"
      >
        <div className="truncate">{checkedBy}</div>
      </div>

      <div
        className={fieldCalibrationClass("approved_by")}
        style={getFieldStyle("approved_by")}
        onMouseDown={(e) => handleMouseDownField(e, "approved_by")}
        title="Drag to adjust Approved By position"
      >
        <div className="truncate">{approvedBy}</div>
      </div>

      <div
        className={fieldCalibrationClass("audited_by")}
        style={getFieldStyle("audited_by")}
        onMouseDown={(e) => handleMouseDownField(e, "audited_by")}
        title="Drag to adjust Audited By position"
      >
        <div className="truncate">{auditedBy}</div>
      </div>

      {/* BOTTOM LEFT: AMOUNT IN WORDS, PHP AMOUNT & RECEIVED BY */}
      <div
        className={fieldCalibrationClass("amount_in_words")}
        style={getFieldStyle("amount_in_words")}
        onMouseDown={(e) => handleMouseDownField(e, "amount_in_words")}
        title="Drag to adjust Amount in Words position"
      >
        <div className="line-clamp-2 leading-tight">{data.amount_in_words}</div>
      </div>

      <div
        className={fieldCalibrationClass("php_amount")}
        style={getFieldStyle("php_amount")}
        onMouseDown={(e) => handleMouseDownField(e, "php_amount")}
        title="Drag to adjust PHP Amount position"
      >
        <span className="font-mono">{displayTotalAmount}</span>
      </div>

      <div
        className={fieldCalibrationClass("received_by")}
        style={getFieldStyle("received_by")}
        onMouseDown={(e) => handleMouseDownField(e, "received_by")}
        title="Drag to adjust Received By position"
      >
        <div className="truncate">{receivedBy}</div>
      </div>

      {/* BOTTOM RIGHT: BANK DETAILS (Bank : | Check No. : | Check Date :) */}
      <div
        className={fieldCalibrationClass("bank_name")}
        style={getFieldStyle("bank_name")}
        onMouseDown={(e) => handleMouseDownField(e, "bank_name")}
        title="Drag to adjust Bank Name position"
      >
        <div className="truncate">{data.bank_account}</div>
      </div>

      <div
        className={fieldCalibrationClass("check_no")}
        style={getFieldStyle("check_no")}
        onMouseDown={(e) => handleMouseDownField(e, "check_no")}
        title="Drag to adjust Check No. position"
      >
        <div className="truncate font-mono">{data.ref_number}</div>
      </div>

      <div
        className={fieldCalibrationClass("check_date")}
        style={getFieldStyle("check_date")}
        onMouseDown={(e) => handleMouseDownField(e, "check_date")}
        title="Drag to adjust Check Date position"
      >
        <div className="truncate">{data.date}</div>
      </div>
    </div>
  );
};
