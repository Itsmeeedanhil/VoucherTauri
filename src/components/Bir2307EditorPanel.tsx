import React, { useRef, useState } from "react";
import { RotateCcw, Trash2, Upload, X } from "lucide-react";
import { Form2307Data, Form2307Row } from "../types/voucher";

interface Props {
  data: Form2307Data;
  onChange: (next: Form2307Data) => void;
  onSave: (data: Form2307Data) => Promise<void>;
  onReset: () => void;
}

const DEFAULT_TAX_RATE = 0.01; // 1% or user-editable tax withheld

export const Bir2307EditorPanel: React.FC<Props> = ({
  data,
  onChange,
  onSave,
  onReset,
}) => {
  const [activeTab, setActiveTab] = useState<"info" | "table1" | "table2">(
    "info"
  );
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [taxRateInput, setTaxRateInput] = useState<string>("10");
  const signatureFileRef = useRef<HTMLInputElement | null>(null);

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange({
          ...data,
          payor_signature_url: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const getTaxRateMultiplier = (rateStr: string = taxRateInput) => {
    const parsed = parseFloat(rateStr);
    return isNaN(parsed) ? 0 : parsed / 100;
  };

  const handleTaxRateChange = (rawRate: string) => {
    setTaxRateInput(rawRate);
    const rateMult = getTaxRateMultiplier(rawRate);

    const recomputeRows = (rows: Form2307Row[]) =>
      rows.map((r) => {
        const m1 = Number(r.month1) || 0;
        const m2 = Number(r.month2) || 0;
        const m3 = Number(r.month3) || 0;
        const rowTotal = Math.round((m1 + m2 + m3) * 100) / 100;
        if (rowTotal === 0 && !r.tax_withheld) {
          return r;
        }
        return {
          ...r,
          total: rowTotal,
          tax_withheld: Math.round(rowTotal * rateMult * 100) / 100,
        };
      });

    onChange({
      ...data,
      table1: recomputeRows(data.table1),
      table2: recomputeRows(data.table2),
    });
  };

  const handleField = (field: keyof Form2307Data, val: string) => {
    onChange({
      ...data,
      [field]: val,
    });
  };

  const handleRowChange = (
    tableKey: "table1" | "table2",
    rowIndex: number,
    col: keyof Form2307Row,
    rawVal: string
  ) => {
    const rows = [...data[tableKey]];
    const current = { ...rows[rowIndex] };

    if (col === "description" || col === "atc") {
      current[col] = rawVal;
    } else {
      const num = parseFloat(rawVal) || 0;
      current[col] = num;
      if (col === "month1" || col === "month2" || col === "month3") {
        const m1 = col === "month1" ? num : Number(current.month1) || 0;
        const m2 = col === "month2" ? num : Number(current.month2) || 0;
        const m3 = col === "month3" ? num : Number(current.month3) || 0;
        const rowTotal = Math.round((m1 + m2 + m3) * 100) / 100;
        current.total = rowTotal;
        current.tax_withheld =
          Math.round(rowTotal * getTaxRateMultiplier() * 100) / 100;
      }
    }

    rows[rowIndex] = current;
    onChange({
      ...data,
      [tableKey]: rows,
    });
  };

  const clearTable = (tableKey: "table1" | "table2") => {
    const emptyRows: Form2307Row[] = Array.from({ length: 10 }, () => ({
      description: "",
      atc: "",
      month1: 0,
      month2: 0,
      month3: 0,
      total: 0,
      tax_withheld: 0,
    }));
    onChange({
      ...data,
      [tableKey]: emptyRows,
    });
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(data);
    setStatusMsg(`Saved at ${new Date().toLocaleTimeString()}`);
  };

  const renderGrid = (tableKey: "table1" | "table2", title: string) => {
    const rows = data[tableKey];
    const totals = rows.reduce(
      (acc, r) => ({
        m1: acc.m1 + (Number(r.month1) || 0),
        m2: acc.m2 + (Number(r.month2) || 0),
        m3: acc.m3 + (Number(r.month3) || 0),
        tot: acc.tot + (Number(r.total) || 0),
        tax: acc.tax + (Number(r.tax_withheld) || 0),
      }),
      { m1: 0, m2: 0, m3: 0, tot: 0, tax: 0 }
    );

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {title}
            </h3>
            <p className="text-[11px] text-slate-400">
              Enter monthly income payments (Total and Tax Withheld auto-compute,
              and Tax Withheld can also be edited directly).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="bir2307-tax-rate"
              className="text-[11px] text-slate-300 font-medium"
            >
              Auto Tax %:
            </label>
            <input
              id="bir2307-tax-rate"
              name="tax_rate"
              type="text"
              inputMode="decimal"
              value={taxRateInput}
              onChange={(e) => handleTaxRateChange(e.target.value)}
              className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono text-right focus:outline-none focus:border-blue-500"
            />
            {[1, 2, 5, 10].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleTaxRateChange(String(preset))}
                className={`px-2 py-1 rounded text-[11px] font-mono border transition cursor-pointer ${
                  parseFloat(taxRateInput) === preset
                    ? "bg-blue-600 text-white border-blue-500"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                }`}
              >
                {preset}%
              </button>
            ))}
            <button
              type="button"
              onClick={() => clearTable(tableKey)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 border border-slate-700 text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Clear Rows
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/70">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-200 border-b border-slate-700 text-[11px]">
                <th className="py-2 px-2 text-left w-7">#</th>
                <th className="py-2 px-2 text-left">Payment Description</th>
                <th className="py-2 px-2 text-center w-20">ATC</th>
                <th className="py-2 px-2 text-right w-24">1st Month</th>
                <th className="py-2 px-2 text-right w-24">2nd Month</th>
                <th className="py-2 px-2 text-right w-24">3rd Month</th>
                <th className="py-2 px-2 text-right w-24">Total</th>
                <th className="py-2 px-2 text-right w-28">Tax Withheld</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-800/70 hover:bg-slate-900/60"
                >
                  <td className="py-1 px-2 text-slate-500 font-mono">
                    {idx + 1}
                  </td>
                  <td className="p-1">
                    <input
                      type="text"
                      name={`${tableKey}_desc_${idx}`}
                      value={row.description}
                      onChange={(e) =>
                        handleRowChange(
                          tableKey,
                          idx,
                          "description",
                          e.target.value
                        )
                      }
                      placeholder="Income/Payment Description"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="text"
                      name={`${tableKey}_atc_${idx}`}
                      value={row.atc}
                      autoCorrect="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      onChange={(e) =>
                        handleRowChange(
                          tableKey,
                          idx,
                          "atc",
                          e.target.value.toUpperCase()
                        )
                      }
                      placeholder="WC158"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs text-center text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      step="0.01"
                      name={`${tableKey}_m1_${idx}`}
                      value={row.month1 || ""}
                      onChange={(e) =>
                        handleRowChange(tableKey, idx, "month1", e.target.value)
                      }
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs text-right text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      step="0.01"
                      name={`${tableKey}_m2_${idx}`}
                      value={row.month2 || ""}
                      onChange={(e) =>
                        handleRowChange(tableKey, idx, "month2", e.target.value)
                      }
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs text-right text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      step="0.01"
                      name={`${tableKey}_m3_${idx}`}
                      value={row.month3 || ""}
                      onChange={(e) =>
                        handleRowChange(tableKey, idx, "month3", e.target.value)
                      }
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs text-right text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      step="0.01"
                      name={`${tableKey}_tot_${idx}`}
                      value={row.total || ""}
                      readOnly
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-right text-slate-300 font-mono"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      step="0.01"
                      name={`${tableKey}_tax_${idx}`}
                      value={row.tax_withheld || ""}
                      onChange={(e) =>
                        handleRowChange(
                          tableKey,
                          idx,
                          "tax_withheld",
                          e.target.value
                        )
                      }
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs text-right text-emerald-300 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-800/90 font-bold text-white text-xs">
                <td colSpan={3} className="py-2 px-3 text-left">
                  TOTAL
                </td>
                <td className="py-2 px-2 text-right font-mono">
                  {totals.m1.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="py-2 px-2 text-right font-mono">
                  {totals.m2.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="py-2 px-2 text-right font-mono">
                  {totals.m3.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="py-2 px-2 text-right font-mono">
                  {totals.tot.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="py-2 px-2 text-right font-mono text-emerald-300">
                  {totals.tax.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <form
      onSubmit={handleSaveSubmit}
      aria-labelledby="bir2307-editor-heading"
      className="no-print w-full max-w-[215.9mm] mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 shadow-xl space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2
            id="bir2307-editor-heading"
            className="text-sm font-bold text-white"
          >
            BIR Form No. 2307 — Page 1 Data Editor
          </h2>
          <p className="text-xs text-slate-400">
            Certificate of Creditable Tax Withheld at Source (January 2018 ENCS)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              activeTab === "info"
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            Part I & II (Period, Payee & Payor)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("table1")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              activeTab === "table1"
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            Part III — Expanded Withholding Tax
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("table2")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              activeTab === "table2"
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            Part III — Business Tax
          </button>
        </div>
      </div>

      {activeTab === "info" && (
        <div className="space-y-4">
          {/* Item 1: Period */}
          <fieldset className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/40">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-blue-400">
              Item 1 — For the Period
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="bir2307-from-date"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  From Date (MM/DD/YYYY)
                </label>
                <input
                  id="bir2307-from-date"
                  name="from_date"
                  type="date"
                  value={data.from_date}
                  onChange={(e) => handleField("from_date", e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="bir2307-to-date"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  To Date (MM/DD/YYYY)
                </label>
                <input
                  id="bir2307-to-date"
                  name="to_date"
                  type="date"
                  value={data.to_date}
                  onChange={(e) => handleField("to_date", e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </fieldset>

          {/* Part I & Part II side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Part I: Payee Information */}
            <fieldset className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/40 space-y-2.5">
              <legend className="px-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                Part I — Payee Information
              </legend>

              <div>
                <label
                  htmlFor="bir2307-payee-tin"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  2. Payee TIN (000-000-000-00000)
                </label>
                <input
                  id="bir2307-payee-tin"
                  name="payee_tin"
                  type="text"
                  inputMode="numeric"
                  autoCorrect="off"
                  spellCheck={false}
                  value={data.payee_tin}
                  onChange={(e) => handleField("payee_tin", e.target.value)}
                  placeholder="000-000-000-00000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="bir2307-payee-name"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  3. Payee Name (Registered Name / Individual)
                </label>
                <input
                  id="bir2307-payee-name"
                  name="payee_name"
                  type="text"
                  autoComplete="name"
                  value={data.payee_name}
                  onChange={(e) => handleField("payee_name", e.target.value)}
                  placeholder="Payee Name"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label
                    htmlFor="bir2307-payee-address"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    4. Registered Address
                  </label>
                  <input
                    id="bir2307-payee-address"
                    name="payee_address"
                    type="text"
                    autoComplete="street-address"
                    value={data.payee_address}
                    onChange={(e) =>
                      handleField("payee_address", e.target.value)
                    }
                    placeholder="Payee Registered Address"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="bir2307-payee-zip"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    4A. ZIP Code
                  </label>
                  <input
                    id="bir2307-payee-zip"
                    name="payee_zip"
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={4}
                    value={data.payee_zip}
                    onChange={(e) => handleField("payee_zip", e.target.value)}
                    placeholder="1000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="bir2307-foreign-address"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  5. Foreign Address (if applicable)
                </label>
                <input
                  id="bir2307-foreign-address"
                  name="payee_foreign_address"
                  type="text"
                  value={data.payee_foreign_address}
                  onChange={(e) =>
                    handleField("payee_foreign_address", e.target.value)
                  }
                  placeholder="Optional Foreign Address"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </fieldset>

            {/* Part II: Payor Information */}
            <fieldset className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/40 space-y-2.5">
              <legend className="px-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                Part II — Payor Information
              </legend>

              <div>
                <label
                  htmlFor="bir2307-payor-tin"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  6. Payor TIN (000-000-000-00000)
                </label>
                <input
                  id="bir2307-payor-tin"
                  name="payor_tin"
                  type="text"
                  inputMode="numeric"
                  autoCorrect="off"
                  spellCheck={false}
                  value={data.payor_tin}
                  onChange={(e) => handleField("payor_tin", e.target.value)}
                  placeholder="000-000-000-00000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="bir2307-payor-name"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  7. Payor Name
                </label>
                <input
                  id="bir2307-payor-name"
                  name="payor_name"
                  type="text"
                  value={data.payor_name}
                  onChange={(e) => handleField("payor_name", e.target.value)}
                  placeholder="Payor Registered Name"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label
                    htmlFor="bir2307-payor-address"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    8. Registered Address
                  </label>
                  <input
                    id="bir2307-payor-address"
                    name="payor_address"
                    type="text"
                    value={data.payor_address}
                    onChange={(e) =>
                      handleField("payor_address", e.target.value)
                    }
                    placeholder="Payor Registered Address"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="bir2307-payor-zip"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    8A. ZIP Code
                  </label>
                  <input
                    id="bir2307-payor-zip"
                    name="payor_zip"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={data.payor_zip}
                    onChange={(e) => handleField("payor_zip", e.target.value)}
                    placeholder="1110"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div className="flex flex-col justify-end">
                  <label
                    htmlFor="bir2307-payor-sig"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Representative Name
                  </label>
                  <input
                    id="bir2307-payor-sig"
                    name="payor_signatory"
                    type="text"
                    value={data.payor_signatory}
                    onChange={(e) =>
                      handleField("payor_signatory", e.target.value)
                    }
                    placeholder="Printed Name"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label
                    htmlFor="bir2307-payor-title"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Title / Designation
                  </label>
                  <input
                    id="bir2307-payor-title"
                    name="payor_title"
                    type="text"
                    value={data.payor_title ?? ""}
                    onChange={(e) =>
                      handleField("payor_title", e.target.value)
                    }
                    placeholder="Title / Position"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label
                    htmlFor="bir2307-payor-rep-tin"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Representative TIN
                  </label>
                  <input
                    id="bir2307-payor-rep-tin"
                    name="payor_rep_tin"
                    type="text"
                    inputMode="numeric"
                    autoCorrect="off"
                    spellCheck={false}
                    value={data.payor_rep_tin ?? ""}
                    onChange={(e) =>
                      handleField("payor_rep_tin", e.target.value)
                    }
                    placeholder="000-000-000-0000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Signature Upload Control */}
              <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-800/80 mt-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={signatureFileRef}
                    id="bir2307-sig-upload"
                    name="payor_signature_file"
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => signatureFileRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {data.payor_signature_url
                      ? "Change E-Signature"
                      : "Upload E-Signature"}
                  </button>
                  {data.payor_signature_url && (
                    <button
                      type="button"
                      onClick={() => handleField("payor_signature_url", "")}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-rose-950/60 text-rose-300 border border-slate-700 flex items-center gap-1 cursor-pointer"
                      title="Remove uploaded signature"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
                {data.payor_signature_url && (
                  <div className="bg-white rounded px-2 py-0.5 border border-slate-700">
                    <img
                      src={data.payor_signature_url}
                      alt="Uploaded signature preview"
                      className="h-6 w-24 object-contain"
                    />
                  </div>
                )}
              </div>
            </fieldset>
          </div>
        </div>
      )}

      {activeTab === "table1" &&
        renderGrid(
          "table1",
          "Part III — Income Payments Subject to Expanded Withholding Tax"
        )}

      {activeTab === "table2" &&
        renderGrid(
          "table2",
          "Part III — Money Payments Subject to Withholding of Business Tax"
        )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
        <div role="status" aria-live="polite" className="text-xs text-emerald-400">
          {statusMsg || "Real-time sync active — all changes update the form immediately"}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear All Fields
          </button>
        </div>
      </div>
    </form>
  );
};
