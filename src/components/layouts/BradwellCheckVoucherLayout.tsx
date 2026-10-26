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

/**
 * Exact data-only anchor coordinates (in inches on an 8.5" x 11.0" Letter page)
 * aligned to the pre-printed Bradwell Check Voucher Template.
 */
export const BRADWELL_FIELD_ANCHORS: Record<BradwellFieldKey, BradwellFieldAnchor> = {
  payee_name: {
    key: "payee_name",
    label: "Payee Name (PAYEE:)",
    xIn: 0.88,
    yIn: 1.18,
    widthIn: 4.38,
    defaultFontPt: 10,
    fontWeight: "bold",
  },
  payee_address: {
    key: "payee_address",
    label: "Payee Address (ADDRESS)",
    xIn: 0.96,
    yIn: 1.38,
    widthIn: 4.30,
    defaultFontPt: 8.5,
    fontWeight: "normal",
  },
  cv_number: {
    key: "cv_number",
    label: "CV Series Number (CV NUMBER :)",
    xIn: 6.42,
    yIn: 1.17,
    widthIn: 1.50,
    defaultFontPt: 11,
    align: "center",
    fontWeight: "bold",
  },
  date: {
    key: "date",
    label: "Voucher Date (DATE:)",
    xIn: 5.96,
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
    xIn: 6.30,
    yIn: 2.02,
    widthIn: 1.58,
    defaultFontPt: 10.5,
    align: "right",
    fontWeight: "bold",
  },
  distribution_table: {
    key: "distribution_table",
    label: "Distribution of Accounts Table",
    xIn: 0.42,
    yIn: 3.62,
    widthIn: 7.48,
    heightIn: 5.10,
    defaultFontPt: 9.5,
    fontWeight: "normal",
  },
  prepared_by: {
    key: "prepared_by",
    label: "Prepared By Signatory",
    xIn: 0.36,
    yIn: 9.01,
    widthIn: 1.97,
    defaultFontPt: 9.5,
    align: "center",
    fontWeight: "bold",
  },
  checked_by: {
    key: "checked_by",
    label: "Checked By Signatory",
    xIn: 2.35,
    yIn: 9.01,
    widthIn: 1.66,
    defaultFontPt: 9.5,
    align: "center",
    fontWeight: "bold",
  },
  approved_by: {
    key: "approved_by",
    label: "Approved By Signatory",
    xIn: 4.02,
    yIn: 9.01,
    widthIn: 2.00,
    defaultFontPt: 9.5,
    align: "center",
    fontWeight: "bold",
  },
  audited_by: {
    key: "audited_by",
    label: "Audited By Signatory",
    xIn: 6.04,
    yIn: 9.01,
    widthIn: 1.93,
    defaultFontPt: 9.5,
    align: "center",
    fontWeight: "bold",
  },
  amount_in_words: {
    key: "amount_in_words",
    label: "Received the Amount (Words)",
    xIn: 0.43,
    yIn: 9.42,
    widthIn: 5.05,
    defaultFontPt: 8.5,
    fontWeight: "normal",
  },
  php_amount: {
    key: "php_amount",
    label: "Receipt PHP Amount (PHP)",
    xIn: 0.80,
    yIn: 9.73,
    widthIn: 1.50,
    defaultFontPt: 10,
    fontWeight: "bold",
  },
  received_by: {
    key: "received_by",
    label: "Received By Name",
    xIn: 3.00,
    yIn: 9.73,
    widthIn: 1.25,
    defaultFontPt: 9,
    align: "center",
    fontWeight: "bold",
  },
  received_date: {
    key: "received_date",
    label: "Received Date",
    xIn: 4.60,
    yIn: 9.73,
    widthIn: 0.90,
    defaultFontPt: 8.5,
    align: "center",
    fontWeight: "normal",
  },
  bank_name: {
    key: "bank_name",
    label: "Bank Name (Bank :)",
    xIn: 6.15,
    yIn: 9.29,
    widthIn: 1.78,
    defaultFontPt: 9,
    fontWeight: "bold",
  },
  check_no: {
    key: "check_no",
    label: "Check Number (Check No. :)",
    xIn: 6.40,
    yIn: 9.46,
    widthIn: 1.53,
    defaultFontPt: 9.5,
    fontWeight: "bold",
  },
  check_date: {
    key: "check_date",
    label: "Check Date (Check Date :)",
    xIn: 6.54,
    yIn: 9.64,
    widthIn: 1.39,
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

  const getFieldStyle = (key: BradwellFieldKey): React.CSSProperties => {
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
      {/* Optional Non-Printing Wireframe Guide while moving/calibrating fields */}
      {showWireframeGuide && (
        <div
          className="no-print pointer-events-none select-none"
          style={{
            position: "absolute",
            inset: 0,
            width: "8.5in",
            height: "11in",
            opacity: 0.45,
            zIndex: 1,
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#64748b",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "5.33in",
              top: "0.60in",
              width: "2.65in",
              textAlign: "right",
              fontSize: "20pt",
              fontWeight: 900,
              letterSpacing: "0.04em",
              color: "#64748b",
            }}
          >
            CHECK VOUCHER
          </div>

          <div
            style={{
              position: "absolute",
              left: "0.35in",
              top: "1.10in",
              width: "7.63in",
              height: "8.905in",
              border: "1.5px solid #94a3b8",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: "0.35in",
              top: "1.10in",
              width: "7.63in",
              height: "0.66in",
              borderBottom: "1.5px solid #94a3b8",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "4.985in",
                top: 0,
                bottom: 0,
                borderLeft: "1.5px solid #94a3b8",
              }}
            />
            <span style={{ position: "absolute", left: "0.06in", top: "0.10in", fontSize: "8.5pt", fontWeight: 700 }}>
              PAYEE:
            </span>
            <span style={{ position: "absolute", left: "0.06in", top: "0.30in", fontSize: "8.5pt", fontWeight: 700 }}>
              ADDRESS
            </span>
            <span style={{ position: "absolute", left: "5.09in", top: "0.10in", fontSize: "8.5pt", fontWeight: 700 }}>
              CV NUMBER : ________________
            </span>
            <span style={{ position: "absolute", left: "5.14in", top: "0.38in", fontSize: "8.5pt", fontWeight: 700 }}>
              DATE:
            </span>
          </div>

          <div
            style={{
              position: "absolute",
              left: "0.35in",
              top: "1.76in",
              width: "7.63in",
              height: "1.515in",
              borderBottom: "1.5px solid #94a3b8",
            }}
          >
            <span style={{ position: "absolute", left: "2.35in", top: "0.05in", fontSize: "9pt", fontWeight: 700 }}>
              PARTICULARS
            </span>
            <span style={{ position: "absolute", right: "0.45in", top: "0.05in", fontSize: "9pt", fontWeight: 700 }}>
              AMOUNT
            </span>
          </div>

          <div
            style={{
              position: "absolute",
              left: "0.35in",
              top: "3.275in",
              width: "7.63in",
              height: "0.155in",
              borderBottom: "1px solid #94a3b8",
              textAlign: "center",
              fontSize: "8.5pt",
              fontWeight: 700,
              lineHeight: "0.155in",
            }}
          >
            DISTRIBUTION OF ACCOUNTS
          </div>
          <div
            style={{
              position: "absolute",
              left: "0.35in",
              top: "3.43in",
              width: "7.63in",
              height: "0.13in",
              borderBottom: "1.5px solid #94a3b8",
              fontSize: "8pt",
              fontWeight: 700,
              lineHeight: "0.13in",
            }}
          >
            <span style={{ position: "absolute", left: "0.45in" }}>Account Code</span>
            <span style={{ position: "absolute", left: "2.55in" }}>Account Title</span>
            <span style={{ position: "absolute", left: "5.80in" }}>Debit</span>
            <span style={{ position: "absolute", left: "7.00in" }}>Credit</span>
          </div>

          <div
            style={{
              position: "absolute",
              left: "0.35in",
              top: "8.835in",
              width: "7.63in",
              height: "0.385in",
              borderTop: "1.5px solid #94a3b8",
              borderBottom: "1.5px solid #94a3b8",
              fontSize: "8pt",
              fontWeight: 700,
            }}
          >
            <div style={{ position: "absolute", left: "1.99in", top: 0, bottom: 0, borderLeft: "1.5px solid #94a3b8" }} />
            <div style={{ position: "absolute", left: "3.67in", top: 0, bottom: 0, borderLeft: "1.5px solid #94a3b8" }} />
            <div style={{ position: "absolute", left: "5.68in", top: 0, bottom: 0, borderLeft: "1.5px solid #94a3b8" }} />
            <span style={{ position: "absolute", left: "0.06in", top: "0.02in" }}>Prepared By:</span>
            <span style={{ position: "absolute", left: "2.05in", top: "0.02in" }}>Checked By:</span>
            <span style={{ position: "absolute", left: "3.73in", top: "0.02in" }}>Approved By:</span>
            <span style={{ position: "absolute", left: "5.74in", top: "0.02in" }}>Audited By:</span>
          </div>

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
            <div style={{ position: "absolute", left: "5.215in", top: 0, bottom: 0, borderLeft: "1.5px solid #94a3b8" }} />
            <span style={{ position: "absolute", left: "0.06in", top: "0.04in" }}>Received the Amount</span>
            <span style={{ position: "absolute", left: "0.06in", top: "0.52in", fontSize: "9pt" }}>PHP</span>
            <span style={{ position: "absolute", left: "2.02in", top: "0.54in" }}>Received By: ______________</span>
            <span style={{ position: "absolute", left: "3.98in", top: "0.54in" }}>Date: ___________</span>
            <span style={{ position: "absolute", left: "5.38in", top: "0.08in" }}>Bank :</span>
            <span style={{ position: "absolute", left: "5.38in", top: "0.26in" }}>Check No. :</span>
            <span style={{ position: "absolute", left: "5.38in", top: "0.44in" }}>Check Date :</span>
          </div>
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

      {/* BOTTOM LEFT: PHP AMOUNT & RECEIVED BY */}
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
