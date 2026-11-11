import React, { useRef, useState } from "react";
import {
  BradwellFieldKey,
  ClientProfile,
  FieldOffset,
  Form2307Data,
  Form2307Row,
} from "../../types/voucher";

interface Props {
  data: Form2307Data;
  client: ClientProfile;
  showFormBackground: boolean;
  printWithBackground: boolean;
  calibrationMode: boolean;
  selectedField: BradwellFieldKey | null;
  onSelectField: (field: BradwellFieldKey | null) => void;
  onUpdateFieldOffset: (field: BradwellFieldKey, next: FieldOffset) => void;
}

export const BIR2307_FIELD_ANCHORS: Record<
  Extract<
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
  >,
  {
    label: string;
    xMm: number;
    yMm: number;
    widthMm: number;
    defaultFontPt: number;
  }
> = {
  bir2307_from_date: {
    label: "1. Period From (MM/DD/YYYY)",
    xMm: 53.34,
    yMm: 38.2,
    widthMm: 37.21,
    defaultFontPt: 10,
  },
  bir2307_to_date: {
    label: "1. Period To (MM/DD/YYYY)",
    xMm: 140.72,
    yMm: 38.2,
    widthMm: 37.21,
    defaultFontPt: 10,
  },
  bir2307_payee_tin: {
    label: "2. Payee TIN",
    xMm: 73.03,
    yMm: 49.0,
    widthMm: 80.51,
    defaultFontPt: 10,
  },
  bir2307_payee_name: {
    label: "3. Payee Name",
    xMm: 14.0,
    yMm: 59.3,
    widthMm: 194.0,
    defaultFontPt: 9.5,
  },
  bir2307_payee_address: {
    label: "4. Payee Registered Address",
    xMm: 14.0,
    yMm: 69.3,
    widthMm: 173.0,
    defaultFontPt: 9,
  },
  bir2307_payee_zip: {
    label: "4A. Payee ZIP Code",
    xMm: 191.01,
    yMm: 69.3,
    widthMm: 17.65,
    defaultFontPt: 10,
  },
  bir2307_foreign_address: {
    label: "5. Payee Foreign Address",
    xMm: 14.0,
    yMm: 79.3,
    widthMm: 194.0,
    defaultFontPt: 9,
  },
  bir2307_payor_tin: {
    label: "6. Payor TIN",
    xMm: 73.03,
    yMm: 90.0,
    widthMm: 80.51,
    defaultFontPt: 10,
  },
  bir2307_payor_name: {
    label: "7. Payor Name",
    xMm: 14.0,
    yMm: 99.8,
    widthMm: 194.0,
    defaultFontPt: 9.5,
  },
  bir2307_payor_address: {
    label: "8. Payor Registered Address",
    xMm: 14.0,
    yMm: 109.8,
    widthMm: 173.0,
    defaultFontPt: 9,
  },
  bir2307_payor_zip: {
    label: "8A. Payor ZIP Code",
    xMm: 191.01,
    yMm: 109.8,
    widthMm: 17.65,
    defaultFontPt: 10,
  },
  bir2307_table1: {
    label: "Part III — Income Payments Table",
    xMm: 6.22,
    yMm: 128.8,
    widthMm: 204.09,
    defaultFontPt: 8,
  },
  bir2307_table2: {
    label: "Part III — Business Tax Money Payments Table",
    xMm: 6.22,
    yMm: 188.6,
    widthMm: 204.09,
    defaultFontPt: 8,
  },
  bir2307_payor_signatory: {
    label: "Payor Authorized Representative / Signatory",
    xMm: 6.22,
    yMm: 254.6,
    widthMm: 204.09,
    defaultFontPt: 9.5,
  },
  bir2307_payee_signatory: {
    label: "Conforme: Payee Authorized Representative",
    xMm: 20.0,
    yMm: 285.5,
    widthMm: 175.0,
    defaultFontPt: 9.5,
  },
};

function parseDateDigits(dateStr: string): string[] {
  // Accepts YYYY-MM-DD or MM/DD/YYYY and returns 8 digits [M, M, D, D, Y, Y, Y, Y]
  const clean = (dateStr || "").trim();
  if (!clean) return Array(8).fill("");
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [yyyy, mm, dd] = clean.split("-");
    return `${mm}${dd}${yyyy}`.split("");
  }
  const digits = clean.replace(/\D/g, "");
  return digits.padEnd(8, " ").slice(0, 8).split("");
}

function parseTinDigits(tinStr: string): string[] {
  // Returns up to 14 characters for [3, 3, 3, 5] boxes
  const digits = (tinStr || "").replace(/\D/g, "");
  return digits.padEnd(14, " ").slice(0, 14).split("");
}

function parseZipDigits(zipStr: string): string[] {
  const digits = (zipStr || "").replace(/\D/g, "");
  return digits.padEnd(4, " ").slice(0, 4).split("");
}

const fmtAmount = (n: number) =>
  n && Math.abs(n) > 0.0001
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "";

const FROM_DATE_BOXES_MM = [
  53.34, 57.91, 62.61, 67.44, 71.88, 76.45, 81.28, 86.11, 90.55,
];
const TO_DATE_BOXES_MM = [
  140.72, 145.29, 149.99, 154.81, 159.26, 163.83, 168.66, 173.48, 177.93,
];

// 14 character box left/right edges on BIR 2307 Page 1
const TIN_BOX_RANGES_MM: [number, number][] = [
  [73.03, 77.34],
  [77.34, 82.04],
  [82.04, 87.0],
  [91.19, 95.5],
  [95.5, 100.2],
  [100.2, 105.03],
  [109.35, 113.79],
  [113.79, 118.49],
  [118.49, 123.19],
  [127.51, 132.46],
  [132.46, 137.79],
  [137.79, 143.51],
  [143.51, 148.72],
  [148.72, 153.54],
];

const ZIP_BOX_EDGES_MM = [191.01, 195.33, 200.09, 204.72, 208.66];

export const Bir2307Layout: React.FC<Props> = ({
  data,
  client,
  showFormBackground,
  printWithBackground,
  calibrationMode,
  selectedField,
  onSelectField,
  onUpdateFieldOffset,
}) => {
  const cfg = client.layout_config;
  const globalX = cfg.preprinted_x_offset_mm ?? 0;
  const globalY = cfg.preprinted_y_offset_mm ?? 0;

  const pageRef = useRef<HTMLDivElement | null>(null);
  const [draggingKey, setDraggingKey] = useState<BradwellFieldKey | null>(null);
  const dragStartRef = useRef<{
    key: BradwellFieldKey;
    startClientX: number;
    startClientY: number;
    initialOffsetX: number;
    initialOffsetY: number;
  } | null>(null);

  const getOffset = (key: BradwellFieldKey): FieldOffset => {
    const saved = cfg.field_offsets?.[key];
    return {
      x_mm: saved?.x_mm ?? 0,
      y_mm: saved?.y_mm ?? 0,
      font_size_pt: saved?.font_size_pt ?? null,
    };
  };

  const handleMouseDownField = (e: React.MouseEvent, key: BradwellFieldKey) => {
    if (!calibrationMode) return;
    e.stopPropagation();
    e.preventDefault();
    onSelectField(key);
    const current = getOffset(key);
    setDraggingKey(key);
    dragStartRef.current = {
      key,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialOffsetX: current.x_mm,
      initialOffsetY: current.y_mm,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current || !pageRef.current) return;
      const rect = pageRef.current.getBoundingClientRect();
      const mmPerPxX = 215.9 / rect.width;
      const mmPerPxY = 330.2 / rect.height;

      const deltaX =
        (moveEvent.clientX - dragStartRef.current.startClientX) * mmPerPxX;
      const deltaY =
        (moveEvent.clientY - dragStartRef.current.startClientY) * mmPerPxY;

      const nextX =
        Math.round((dragStartRef.current.initialOffsetX + deltaX) * 2) / 2;
      const nextY =
        Math.round((dragStartRef.current.initialOffsetY + deltaY) * 2) / 2;

      onUpdateFieldOffset(dragStartRef.current.key, {
        ...getOffset(dragStartRef.current.key),
        x_mm: nextX,
        y_mm: nextY,
      });
    };

    const handleMouseUp = () => {
      setDraggingKey(null);
      dragStartRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const fieldStyle = (
    key: keyof typeof BIR2307_FIELD_ANCHORS,
    extra?: React.CSSProperties
  ): React.CSSProperties => {
    const anchor = BIR2307_FIELD_ANCHORS[key];
    const off = getOffset(key);
    const isSelected = calibrationMode && selectedField === key;
    const isDragging = draggingKey === key;

    return {
      position: "absolute",
      left: `${anchor.xMm + globalX + off.x_mm}mm`,
      top: `${anchor.yMm + globalY + off.y_mm}mm`,
      width: `${anchor.widthMm}mm`,
      fontSize: `${off.font_size_pt ?? anchor.defaultFontPt}pt`,
      fontFamily: "Arial, Helvetica, sans-serif",
      color: "#000000",
      lineHeight: 1.15,
      cursor: calibrationMode ? (isDragging ? "grabbing" : "grab") : "default",
      outline: calibrationMode
        ? isSelected
          ? "2px solid #2563eb"
          : "1px dashed rgba(37, 99, 235, 0.55)"
        : "none",
      backgroundColor: calibrationMode
        ? isSelected
          ? "rgba(37, 99, 235, 0.12)"
          : "rgba(255, 255, 255, 0.35)"
        : "transparent",
      borderRadius: calibrationMode ? "2px" : undefined,
      zIndex: isSelected ? 30 : 10,
      userSelect: "none",
      ...extra,
    };
  };

  const renderBadge = (key: keyof typeof BIR2307_FIELD_ANCHORS) => {
    if (!calibrationMode) return null;
    const off = getOffset(key);
    const isSelected = selectedField === key;
    if (!isSelected && off.x_mm === 0 && off.y_mm === 0) return null;
    return (
      <span
        className="no-print"
        style={{
          position: "absolute",
          top: "-15px",
          left: 0,
          fontSize: "9px",
          fontFamily: "monospace",
          background: isSelected ? "#2563eb" : "#0f172a",
          color: "#ffffff",
          padding: "1px 4px",
          borderRadius: "3px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 40,
        }}
      >
        {BIR2307_FIELD_ANCHORS[key].label} ({off.x_mm >= 0 ? `+${off.x_mm}` : off.x_mm}
        , {off.y_mm >= 0 ? `+${off.y_mm}` : off.y_mm}mm)
      </span>
    );
  };

  const fromDigits = parseDateDigits(data.from_date);
  const toDigits = parseDateDigits(data.to_date);
  const payeeTinDigits = parseTinDigits(data.payee_tin);
  const payorTinDigits = parseTinDigits(data.payor_tin);
  const payeeZipDigits = parseZipDigits(data.payee_zip);
  const payorZipDigits = parseZipDigits(data.payor_zip);

  const sumRows = (rows: Form2307Row[]) => {
    return rows.reduce(
      (acc, r) => {
        const m1 = Number(r.month1) || 0;
        const m2 = Number(r.month2) || 0;
        const m3 = Number(r.month3) || 0;
        const tot = Number(r.total) || m1 + m2 + m3;
        const tax = Number(r.tax_withheld) || 0;
        return {
          m1: acc.m1 + m1,
          m2: acc.m2 + m2,
          m3: acc.m3 + m3,
          tot: acc.tot + tot,
          tax: acc.tax + tax,
        };
      },
      { m1: 0, m2: 0, m3: 0, tot: 0, tax: 0 }
    );
  };

  const t1Totals = sumRows(data.table1);
  const t2Totals = sumRows(data.table2);

  const renderScheduleTable = (
    rows: Form2307Row[],
    totals: { m1: number; m2: number; m3: number; tot: number; tax: number }
  ) => {
    const paddedRows = [...rows.slice(0, 10)];
    while (paddedRows.length < 10) {
      paddedRows.push({
        description: "",
        atc: "",
        month1: 0,
        month2: 0,
        month3: 0,
        total: 0,
        tax_withheld: 0,
      });
    }

    return (
      <div style={{ width: "204.09mm" }}>
        {paddedRows.map((r, idx) => {
          const rowTot =
            Number(r.total) ||
            (Number(r.month1) || 0) +
              (Number(r.month2) || 0) +
              (Number(r.month3) || 0);
          return (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "56.01mm 15.24mm 25.40mm 26.29mm 25.40mm 25.40mm 30.35mm",
                height: "4.825mm",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  paddingLeft: "1.5mm",
                  paddingRight: "1mm",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {r.description}
              </div>
              <div
                style={{
                  textAlign: "center",
                  fontWeight: 600,
                }}
              >
                {r.atc}
              </div>
              <div
                style={{
                  textAlign: "right",
                  paddingRight: "1.5mm",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtAmount(r.month1)}
              </div>
              <div
                style={{
                  textAlign: "right",
                  paddingRight: "1.5mm",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtAmount(r.month2)}
              </div>
              <div
                style={{
                  textAlign: "right",
                  paddingRight: "1.5mm",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtAmount(r.month3)}
              </div>
              <div
                style={{
                  textAlign: "right",
                  paddingRight: "1.5mm",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtAmount(rowTot)}
              </div>
              <div
                style={{
                  textAlign: "right",
                  paddingRight: "1.5mm",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtAmount(r.tax_withheld)}
              </div>
            </div>
          );
        })}

        {/* Total Row (11th Row) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "56.01mm 15.24mm 25.40mm 26.29mm 25.40mm 25.40mm 30.35mm",
            height: "4.825mm",
            alignItems: "center",
            fontWeight: 700,
          }}
        >
          <div />
          <div />
          <div
            style={{
              textAlign: "right",
              paddingRight: "1.5mm",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtAmount(totals.m1)}
          </div>
          <div
            style={{
              textAlign: "right",
              paddingRight: "1.5mm",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtAmount(totals.m2)}
          </div>
          <div
            style={{
              textAlign: "right",
              paddingRight: "1.5mm",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtAmount(totals.m3)}
          </div>
          <div
            style={{
              textAlign: "right",
              paddingRight: "1.5mm",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtAmount(totals.tot)}
          </div>
          <div
            style={{
              textAlign: "right",
              paddingRight: "1.5mm",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtAmount(totals.tax)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={pageRef}
      onClick={() => calibrationMode && onSelectField(null)}
      className="voucher-page bir2307-page bg-white text-black shadow-2xl relative select-none"
      style={{
        width: "215.9mm",
        minHeight: "330.2mm",
        height: "330.2mm",
        padding: 0,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Official BIR Form 2307 Page 1 Background Image */}
      {showFormBackground && (
        <img
          src="/bir-2307-page1.png"
          alt="BIR Form No. 2307 Page 1"
          className={printWithBackground ? "" : "no-print"}
          style={{
            position: "absolute",
            inset: 0,
            width: "215.9mm",
            height: "330.2mm",
            objectFit: "fill",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}

      {/* 1. Period From (MM/DD/YYYY) */}
      <div
        className="data-field-node"
        onMouseDown={(e) => handleMouseDownField(e, "bir2307_from_date")}
        onClick={(e) => e.stopPropagation()}
        style={fieldStyle("bir2307_from_date", {
          height: "5.2mm",
          fontWeight: 700,
        })}
      >
        {renderBadge("bir2307_from_date")}
        {fromDigits.map((ch, i) => {
          const leftMm = FROM_DATE_BOXES_MM[i] - FROM_DATE_BOXES_MM[0];
          const wMm = FROM_DATE_BOXES_MM[i + 1] - FROM_DATE_BOXES_MM[i];
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${leftMm}mm`,
                width: `${wMm}mm`,
                textAlign: "center",
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>

      {/* 1. Period To (MM/DD/YYYY) */}
      <div
        className="data-field-node"
        onMouseDown={(e) => handleMouseDownField(e, "bir2307_to_date")}
        onClick={(e) => e.stopPropagation()}
        style={fieldStyle("bir2307_to_date", {
          height: "5.2mm",
          fontWeight: 700,
        })}
      >
        {renderBadge("bir2307_to_date")}
        {toDigits.map((ch, i) => {
          const leftMm = TO_DATE_BOXES_MM[i] - TO_DATE_BOXES_MM[0];
          const wMm = TO_DATE_BOXES_MM[i + 1] - TO_DATE_BOXES_MM[i];
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${leftMm}mm`,
                width: `${wMm}mm`,
                textAlign: "center",
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>

      {/* 2. Payee TIN */}
      <div
        className="data-field-node"
        onMouseDown={(e) => handleMouseDownField(e, "bir2307_payee_tin")}
        onClick={(e) => e.stopPropagation()}
        style={fieldStyle("bir2307_payee_tin", {
          height: "5.2mm",
          fontWeight: 700,
        })}
      >
        {renderBadge("bir2307_payee_tin")}
        {TIN_BOX_RANGES_MM.map(([l, r], i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${l - 73.03}mm`,
              width: `${r - l}mm`,
              textAlign: "center",
            }}
          >
            {payeeTinDigits[i] || ""}
          </span>
        ))}
      </div>

      {/* 3. Payee Name */}
      <div
        className="data-field-node"
        onMouseDown={(e) => handleMouseDownField(e, "bir2307_payee_name")}
        onClick={(e) => e.stopPropagation()}
        style={fieldStyle("bir2307_payee_name", {
          fontWeight: 700,
          whiteSpace: "nowrap",
          overflow: "hidden",
        })}
      >
        {renderBadge("bir2307_payee_name")}
        {data.payee_name}
      </div>

      {/* 4. Payee Registered Address */}
      <div
        className="data-field-node"
        onMouseDown={(e) => handleMouseDownField(e, "bir2307_payee_address")}
        onClick={(e) => e.stopPropagation()}
        style={fieldStyle("bir2307_payee_address", {
          whiteSpace: "nowrap",
          overflow: "hidden",
        })}
      >
        {renderBadge("bir2307_payee_address")}
        {data.payee_address}
      </div>

      {/* 4A. Payee ZIP Code */}
      <div
        className="data-field-node"
        onMouseDown={(e) => handleMouseDownField(e, "bir2307_payee_zip")}
        onClick={(e) => e.stopPropagation()}
        style={fieldStyle("bir2307_payee_zip", {
          height: "5.0mm",
          fontWeight: 700,
        })}
      >
        {renderBadge("bir2307_payee_zip")}
        {payeeZipDigits.map((ch, i) => {
          const leftMm = ZIP_BOX_EDGES_MM[i] - ZIP_BOX_EDGES_MM[0];
          const wMm = ZIP_BOX_EDGES_MM[i + 1] - ZIP_BOX_EDGES_MM[i];
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${leftMm}mm`,
                width: `${wMm}mm`,
                textAlign: "center",
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>

      {/* 5. Payee Foreign Address */}
      <div
        className="data-field-node"
        onMouseDown={(e) => handleMouseDownField(e, "bir2307_foreign_address")}
        onClick={(e) => e.stopPropagation()}
        style={fieldStyle("bir2307_foreign_address", {
          whiteSpace: "nowrap",
          overflow: "hidden",
        })}
      >
        {renderBadge("bir2307_foreign_address")}
        {data.payee_foreign_address}
      </div>

      {/* 6. Payor TIN */}
      <div
        className="data-field-node"
        onMouseDown={(e) => handleMouseDownField(e, "bir2307_payor_tin")}
        onClick={(e) => e.stopPropagation()}
        style={fieldStyle("bir2307_payor_tin", {
          height: "5.2mm",
          fontWeight: 700,
        })}
      >
        {renderBadge("bir2307_payor_tin")}
        {TIN_BOX_RANGES_MM.map(([l, r], i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${l - 73.03}mm`,
              width: `${r - l}mm`,
              textAlign: "center",
            }}
          >
            {payorTinDigits[i] || ""}
          </span>
        ))}
      </div>

      {/* 7. Payor Name */}
      <div
        className="data-field-node"
        onMouseDown={(e) => handleMouseDownField(e, "bir2307_payor_name")}
        onClick={(e) => e.stopPropagation()}
        style={fieldStyle("bir2307_payor_name", {
          fontWeight: 700,
          whiteSpace: "nowrap",
          overflow: "hidden",
        })}
      >
        {renderBadge("bir2307_payor_name")}
        {data.payor_name}
      </div>

      {/* 8. Payor Registered Address */}
      <div
        className="data-field-node"
        onMouseDown={(e) => handleMouseDownField(e, "bir2307_payor_address")}
        onClick={(e) => e.stopPropagation()}
        style={fieldStyle("bir2307_payor_address", {
          whiteSpace: "nowrap",
          overflow: "hidden",
        })}
      >
        {renderBadge("bir2307_payor_address")}
        {data.payor_address}
      </div>

      {/* 8A. Payor ZIP Code */}
      <div
        className="data-field-node"
        onMouseDown={(e) => handleMouseDownField(e, "bir2307_payor_zip")}
        onClick={(e) => e.stopPropagation()}
        style={fieldStyle("bir2307_payor_zip", {
          height: "5.0mm",
          fontWeight: 700,
        })}
      >
        {renderBadge("bir2307_payor_zip")}
        {payorZipDigits.map((ch, i) => {
          const leftMm = ZIP_BOX_EDGES_MM[i] - ZIP_BOX_EDGES_MM[0];
          const wMm = ZIP_BOX_EDGES_MM[i + 1] - ZIP_BOX_EDGES_MM[i];
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${leftMm}mm`,
                width: `${wMm}mm`,
                textAlign: "center",
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>

      {/* Part III — Table 1: Income Payments Subject to Expanded Withholding Tax */}
      <div
        className="data-field-node"
        onMouseDown={(e) => handleMouseDownField(e, "bir2307_table1")}
        onClick={(e) => e.stopPropagation()}
        style={fieldStyle("bir2307_table1")}
      >
        {renderBadge("bir2307_table1")}
        {renderScheduleTable(data.table1, t1Totals)}
      </div>

      {/* Part III — Table 2: Money Payments Subject to Withholding of Business Tax */}
      <div
        className="data-field-node"
        onMouseDown={(e) => handleMouseDownField(e, "bir2307_table2")}
        onClick={(e) => e.stopPropagation()}
        style={fieldStyle("bir2307_table2")}
      >
        {renderBadge("bir2307_table2")}
        {renderScheduleTable(data.table2, t2Totals)}
      </div>

      {/* Payor Authorized Representative / Signatory (Name, Title/Designation, TIN + Uploaded Signature) */}
      <div
        className="data-field-node"
        onMouseDown={(e) => handleMouseDownField(e, "bir2307_payor_signatory")}
        onClick={(e) => e.stopPropagation()}
        style={fieldStyle("bir2307_payor_signatory", {
          height: "9.8mm",
          fontWeight: 700,
        })}
      >
        {renderBadge("bir2307_payor_signatory")}
        {(() => {
          const fallbackParts = (data.payor_title_tin || "").split("|");
          const titlePart = (
            data.payor_title ??
            fallbackParts[0] ??
            ""
          ).trim();
          const rawRepTin = (
            data.payor_rep_tin ??
            fallbackParts[1] ??
            ""
          ).trim();
          const formattedRepTin = rawRepTin
            ? /^tin/i.test(rawRepTin)
              ? rawRepTin.replace(/^tin\s*/i, "TIN    ")
              : `TIN    ${rawRepTin}`
            : "";

          return (
            <>
              {/* Uploaded Signature image overlapping above the printed name */}
              {data.payor_signature_url && (
                <img
                  src={data.payor_signature_url}
                  alt="Authorized Signature"
                  style={{
                    position: "absolute",
                    left: "2mm",
                    top: "-3.6mm",
                    width: "60mm",
                    height: "9.2mm",
                    objectFit: "contain",
                    pointerEvents: "none",
                  }}
                />
              )}
              {/* Left: Printed Name */}
              <span
                style={{
                  position: "absolute",
                  left: "6mm",
                  top: "4.6mm",
                  whiteSpace: "nowrap",
                }}
              >
                {data.payor_signatory}
              </span>
              {/* Center: Title / Designation */}
              <span
                style={{
                  position: "absolute",
                  left: "91mm",
                  top: "4.6mm",
                  whiteSpace: "nowrap",
                }}
              >
                {titlePart}
              </span>
              {/* Right: TIN */}
              <span
                style={{
                  position: "absolute",
                  left: "152mm",
                  top: "4.6mm",
                  whiteSpace: "nowrap",
                }}
              >
                {formattedRepTin}
              </span>
            </>
          );
        })()}
      </div>

      {/* Conforme: Payee Authorized Representative */}
      <div
        className="data-field-node"
        onMouseDown={(e) => handleMouseDownField(e, "bir2307_payee_signatory")}
        onClick={(e) => e.stopPropagation()}
        style={fieldStyle("bir2307_payee_signatory", {
          textAlign: "center",
          fontWeight: 700,
        })}
      >
        {renderBadge("bir2307_payee_signatory")}
        <div>{data.payee_signatory}</div>
        {data.payee_title_tin && (
          <div style={{ fontSize: "8pt", fontWeight: 500 }}>
            {data.payee_title_tin}
          </div>
        )}
      </div>
    </div>
  );
};
