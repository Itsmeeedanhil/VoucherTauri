import React, { useState, useRef } from "react";
import { Move, RotateCcw } from "lucide-react";
import {
  BradwellFieldKey,
  ClientProfile,
  FieldOffset,
  LayoutConfig,
  VoucherData,
} from "../../types/voucher";

export type CheckFieldKey =
  | "check_leaf_date"
  | "check_leaf_payee"
  | "check_leaf_amount"
  | "check_leaf_words";

export interface CheckFieldAnchor {
  key: CheckFieldKey;
  label: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  defaultFontPt: number;
  align?: "left" | "center" | "right";
  fontWeight?: "normal" | "bold";
}

export const CHECK_FIELD_ANCHORS: Record<CheckFieldKey, CheckFieldAnchor> = {
  check_leaf_date: {
    key: "check_leaf_date",
    label: "Cheque Date (MM DD YYYY)",
    xMm: 132,
    yMm: 13,
    widthMm: 62,
    defaultFontPt: 11,
    align: "left",
    fontWeight: "bold",
  },
  check_leaf_payee: {
    key: "check_leaf_payee",
    label: "Pay to the Order Of (Payee)",
    xMm: 24,
    yMm: 23,
    widthMm: 115,
    defaultFontPt: 11,
    align: "left",
    fontWeight: "bold",
  },
  check_leaf_amount: {
    key: "check_leaf_amount",
    label: "Amount in Figures (PHP)",
    xMm: 145,
    yMm: 23,
    widthMm: 46,
    defaultFontPt: 11,
    align: "left",
    fontWeight: "bold",
  },
  check_leaf_words: {
    key: "check_leaf_words",
    label: "Amount in Words (Pesos)",
    xMm: 16,
    yMm: 32,
    widthMm: 172,
    defaultFontPt: 9.5,
    align: "left",
    fontWeight: "bold",
  },
};

interface Props {
  voucher: VoucherData;
  client: ClientProfile;
  payeeOverride?: string;
  calibrationMode: boolean;
  selectedField: BradwellFieldKey | null;
  onSelectField: (field: BradwellFieldKey | null) => void;
  onUpdateFieldOffset: (field: BradwellFieldKey, next: FieldOffset) => void;
  onChangeLayout?: (newLayout: LayoutConfig) => void;
}

export const CheckPrintLayout: React.FC<Props> = ({
  voucher,
  client,
  payeeOverride,
  calibrationMode,
  selectedField,
  onSelectField,
  onUpdateFieldOffset,
  onChangeLayout,
}) => {
  const layout = client.layout_config;
  const fieldOffsets = layout.field_offsets ?? {};

  const payee = payeeOverride?.trim() || voucher.payee_name;
  const amount = voucher.total_amount || 0;
  const amountInWords = voucher.amount_in_words || "";

  // Parse MM/DD/YYYY or YYYY-MM-DD into PCHC spaced digits: "MM     DD     YYYY"
  let month = "01";
  let day = "01";
  let year = "2026";
  const rawDate = (voucher.date || "").trim();
  if (rawDate.includes("/")) {
    const parts = rawDate.split("/");
    if (parts.length === 3) {
      month = parts[0].padStart(2, "0");
      day = parts[1].padStart(2, "0");
      year = parts[2];
    }
  } else if (rawDate.includes("-")) {
    const parts = rawDate.split("-");
    if (parts.length === 3) {
      year = parts[0];
      month = parts[1].padStart(2, "0");
      day = parts[2].padStart(2, "0");
    }
  } else {
    const d = new Date(rawDate || Date.now());
    if (!isNaN(d.getTime())) {
      month = String(d.getMonth() + 1).padStart(2, "0");
      day = String(d.getDate()).padStart(2, "0");
      year = String(d.getFullYear());
    }
  }

  const gap = " ".repeat(layout.check_date_spacing || 2);
  const formattedMonth = month.split("").join(gap);
  const formattedDay = day.split("").join(gap);
  const formattedYear = year.split("").join(gap);
  const formattedDate = `${formattedMonth}    ${formattedDay}    ${formattedYear}`;

  const xOffset = layout.check_x_offset_mm || 0;
  const yOffset = layout.check_y_offset_mm || 0;

  // Whole-cheque drag state (when not in individual field calibration mode)
  const [isDraggingLeaf, setIsDraggingLeaf] = useState(false);
  const leafDragStart = useRef<{
    x: number;
    y: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  // Individual field drag state (when calibrationMode is ON)
  const [isDraggingField, setIsDraggingField] = useState(false);
  const fieldDragRef = useRef<{
    key: CheckFieldKey;
    startClientX: number;
    startClientY: number;
    initialXmm: number;
    initialYmm: number;
  } | null>(null);

  const getFieldOffset = (key: CheckFieldKey): FieldOffset => {
    return fieldOffsets[key] ?? { x_mm: 0, y_mm: 0, font_size_pt: null };
  };

  const getFieldStyle = (key: CheckFieldKey): React.CSSProperties => {
    const anchor = CHECK_FIELD_ANCHORS[key];
    const fOff = getFieldOffset(key);
    const leftMm = anchor.xMm + (fOff.x_mm || 0);
    const topMm = anchor.yMm + (fOff.y_mm || 0);
    const fontPt = fOff.font_size_pt ?? anchor.defaultFontPt;

    return {
      position: "absolute",
      left: `${leftMm}mm`,
      top: `${topMm}mm`,
      width: `${anchor.widthMm}mm`,
      fontSize: `${fontPt}pt`,
      fontWeight: anchor.fontWeight ?? "bold",
      textAlign: anchor.align ?? "left",
      color: "#000000",
      lineHeight: 1.2,
      zIndex: selectedField === key ? 30 : 20,
      userSelect: "none",
      cursor: calibrationMode ? "move" : "grab",
    };
  };

  const handleMouseDownField = (e: React.MouseEvent, key: CheckFieldKey) => {
    if (!calibrationMode) return;
    e.stopPropagation();
    onSelectField(key);
    const current = getFieldOffset(key);
    fieldDragRef.current = {
      key,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialXmm: current.x_mm || 0,
      initialYmm: current.y_mm || 0,
    };
    setIsDraggingField(true);
  };

  const handleMouseDownLeaf = (e: React.MouseEvent) => {
    if (calibrationMode || !onChangeLayout) return;
    setIsDraggingLeaf(true);
    leafDragStart.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: xOffset,
      initialY: yOffset,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (calibrationMode && isDraggingField && fieldDragRef.current) {
      const dxMm =
        ((e.clientX - fieldDragRef.current.startClientX) * 25.4) / 96.0;
      const dyMm =
        ((e.clientY - fieldDragRef.current.startClientY) * 25.4) / 96.0;
      const nextX =
        Math.round((fieldDragRef.current.initialXmm + dxMm) * 2) / 2;
      const nextY =
        Math.round((fieldDragRef.current.initialYmm + dyMm) * 2) / 2;
      const current = getFieldOffset(fieldDragRef.current.key);
      onUpdateFieldOffset(fieldDragRef.current.key, {
        ...current,
        x_mm: nextX,
        y_mm: nextY,
      });
      return;
    }

    if (isDraggingLeaf && leafDragStart.current && onChangeLayout) {
      const deltaX = (e.clientX - leafDragStart.current.x) * 0.264583;
      const deltaY = (e.clientY - leafDragStart.current.y) * 0.264583;

      const newX =
        Math.round((leafDragStart.current.initialX + deltaX) * 10) / 10;
      const newY =
        Math.round((leafDragStart.current.initialY + deltaY) * 10) / 10;

      onChangeLayout({
        ...layout,
        check_x_offset_mm: newX,
        check_y_offset_mm: newY,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingLeaf(false);
    leafDragStart.current = null;
    setIsDraggingField(false);
    fieldDragRef.current = null;
  };

  const fieldCalibrationClass = (key: CheckFieldKey) => {
    if (!calibrationMode) return "data-field-node";
    const isSel = selectedField === key;
    return `data-field-node rounded-xs transition-shadow ${
      isSel
        ? "outline-2 outline-blue-600 bg-blue-500/15 shadow-xs"
        : "outline-1 outline-dashed outline-amber-500/80 hover:bg-amber-500/10"
    }`;
  };

  return (
    <div
      className="flex flex-col items-center w-full"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Visual Guideline Banner with Quick Controls */}
      <div className="no-print bg-slate-900 border border-slate-800 text-slate-200 px-5 py-2.5 rounded-xl mb-6 text-xs w-full max-w-3xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
            <Move className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white block">
              {calibrationMode
                ? "Individual Cheque Field Alignment Active"
                : "Drag-to-Align Bank Cheque Printout"}
            </span>
            <span className="text-[11px] text-slate-400">
              {calibrationMode
                ? "Click & drag Date, Payee, Amount, or Amount in Words individually."
                : "Click & drag anywhere on the cheque leaf to shift the whole cheque, or click 'Move / Adjust Layout Fields' above."}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="bg-slate-950 px-2.5 py-1 rounded border border-slate-700 text-cyan-300 font-bold">
            X: {xOffset}mm
          </span>
          <span className="bg-slate-950 px-2.5 py-1 rounded border border-slate-700 text-cyan-300 font-bold">
            Y: {yOffset}mm
          </span>
          {onChangeLayout && (
            <button
              type="button"
              onClick={() =>
                onChangeLayout({
                  ...layout,
                  check_x_offset_mm: 0,
                  check_y_offset_mm: 0,
                })
              }
              title="Reset whole cheque offset to 0"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 border border-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Standard 8.0" x 3.0" (203.2mm x 76.2mm) Philippine Bank Cheque Surface */}
      <div
        onMouseDown={handleMouseDownLeaf}
        onClick={() => {
          if (calibrationMode) onSelectField(null);
        }}
        className={`check-leaf-page bg-white text-black relative border-2 ${
          isDraggingLeaf
            ? "border-blue-500 shadow-2xl cursor-grabbing"
            : calibrationMode
            ? "border-amber-400 shadow-xl"
            : "border-dashed border-slate-400 cursor-grab hover:border-blue-400 shadow-xl"
        } print:border-none print:shadow-none print:m-0 print:p-0 transition-all ${
          layout.check_rotate_90
            ? "rotate-90 print:rotate-90 origin-top-left"
            : ""
        }`}
        style={{
          width: "203.2mm",
          minWidth: "203.2mm",
          maxWidth: "203.2mm",
          height: "76.2mm",
          minHeight: "76.2mm",
          maxHeight: "76.2mm",
          boxSizing: "border-box",
          overflow: "hidden",
          backgroundColor: "#ffffff",
        }}
      >
        {/* Non-printing Philippine PCHC Cheque Guide Overlay on Screen */}
        <div className="no-print absolute inset-0 pointer-events-none select-none text-slate-400/70">
          <div className="absolute top-[6mm] left-[10mm] text-[8pt] font-semibold uppercase tracking-wider text-slate-400/60">
            {voucher.bank_account || "BANK CHEQUE PREVIEW"} — Check #
            {voucher.ref_number}
          </div>
          <div className="absolute top-[14mm] left-[118mm] text-[7.5pt] font-bold">
            DATE:
          </div>
          <div className="absolute top-[24mm] left-[8mm] text-[7pt] font-bold leading-tight w-[15mm]">
            PAY TO THE
            <br />
            ORDER OF
          </div>
          <div className="absolute top-[28.5mm] left-[23mm] w-[116mm] border-b border-dashed border-slate-300" />
          <div className="absolute top-[23.5mm] left-[140mm] text-[9pt] font-bold">
            ₱
          </div>
          <div className="absolute top-[22mm] left-[144mm] w-[48mm] h-[6.5mm] border border-dashed border-slate-300" />
          <div className="absolute top-[33mm] left-[8mm] text-[7pt] font-bold">
            PESOS
          </div>
          <div className="absolute top-[37.5mm] left-[16mm] w-[176mm] border-b border-dashed border-slate-300" />
        </div>

        {/* Printable Cheque Elements with Whole-Leaf + Per-Field Offsets */}
        <div
          className="absolute inset-0 select-none"
          style={{
            transform: `translate(${xOffset}mm, ${yOffset}mm)`,
          }}
        >
          {/* Date */}
          <div
            className={`${fieldCalibrationClass(
              "check_leaf_date"
            )} font-mono tracking-widest`}
            style={getFieldStyle("check_leaf_date")}
            onMouseDown={(e) => handleMouseDownField(e, "check_leaf_date")}
            title="Drag to adjust Cheque Date position"
          >
            {formattedDate}
          </div>

          {/* Payee Name */}
          <div
            className={`${fieldCalibrationClass(
              "check_leaf_payee"
            )} tracking-wide truncate`}
            style={getFieldStyle("check_leaf_payee")}
            onMouseDown={(e) => handleMouseDownField(e, "check_leaf_payee")}
            title="Drag to adjust Payee position"
          >
            **{payee}**
          </div>

          {/* Amount (Numerical) */}
          <div
            className={`${fieldCalibrationClass(
              "check_leaf_amount"
            )} font-mono tracking-wider`}
            style={getFieldStyle("check_leaf_amount")}
            onMouseDown={(e) => handleMouseDownField(e, "check_leaf_amount")}
            title="Drag to adjust Numerical Amount position"
          >
            **
            {amount.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            **
          </div>

          {/* Amount in Words */}
          <div
            className={`${fieldCalibrationClass(
              "check_leaf_words"
            )} tracking-normal leading-tight`}
            style={getFieldStyle("check_leaf_words")}
            onMouseDown={(e) => handleMouseDownField(e, "check_leaf_words")}
            title="Drag to adjust Amount in Words position"
          >
            *** {amountInWords} ***
          </div>
        </div>
      </div>
    </div>
  );
};
