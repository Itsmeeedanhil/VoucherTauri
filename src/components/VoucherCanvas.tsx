import React from "react";
import { FileSpreadsheet, Layers, Move, RotateCcw } from "lucide-react";
import {
  BradwellFieldKey,
  ClientProfile,
  FieldOffset,
  VoucherData,
} from "../types/voucher";
import {
  BRADWELL_FIELD_ANCHORS,
  BradwellCheckVoucherLayout,
} from "./layouts/BradwellCheckVoucherLayout";

interface Props {
  voucherData: VoucherData | null;
  client: ClientProfile;
  payeeOverride: string;
  errorMsg: string | null;
  showWireframeGuide: boolean;
  onToggleWireframeGuide: (val: boolean) => void;
  calibrationMode: boolean;
  onToggleCalibrationMode: (val: boolean) => void;
  selectedField: BradwellFieldKey | null;
  onSelectField: (field: BradwellFieldKey | null) => void;
  onUpdateFieldOffset: (field: BradwellFieldKey, next: FieldOffset) => void;
  onResetAllOffsets: () => void;
}

export const VoucherCanvas: React.FC<Props> = ({
  voucherData,
  client,
  payeeOverride,
  errorMsg,
  showWireframeGuide,
  onToggleWireframeGuide,
  calibrationMode,
  onToggleCalibrationMode,
  selectedField,
  onSelectField,
  onUpdateFieldOffset,
  onResetAllOffsets,
}) => {
  const cfg = client.layout_config;
  const currentFieldOffset: FieldOffset = selectedField
    ? cfg.field_offsets?.[selectedField] ?? {
        x_mm: 0,
        y_mm: 0,
        font_size_pt: null,
      }
    : { x_mm: 0, y_mm: 0, font_size_pt: null };

  return (
    <main className="flex-1 h-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Layout Movement / Calibration Toolbar (Never Printed) */}
      <div className="no-print h-12 px-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggleCalibrationMode(!calibrationMode)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              calibrationMode
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            {calibrationMode
              ? "Done Moving Fields"
              : "Move / Adjust Layout Fields"}
          </button>

          <button
            onClick={() => onToggleWireframeGuide(!showWireframeGuide)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer ${
              showWireframeGuide
                ? "bg-blue-600/20 text-blue-300 border-blue-500/50"
                : "bg-slate-800/70 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
            title="Show or hide non-printing form box lines while adjusting field positions"
          >
            <Layers className="w-3.5 h-3.5" />
            {showWireframeGuide ? "Hide Form Lines Guide" : "Show Form Lines Guide"}
          </button>

          {calibrationMode && (
            <button
              onClick={onResetAllOffsets}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-rose-950/60 text-rose-300 border border-slate-700 hover:border-rose-500/40 transition flex items-center gap-1 cursor-pointer"
              title="Reset all moved fields back to default positions"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Positions
            </button>
          )}
        </div>

        {/* Selected Field X/Y & Font Size Fine-Tuner */}
        {calibrationMode && (
          <div className="flex items-center gap-2.5 text-xs">
            <select
              value={selectedField ?? ""}
              onChange={(e) =>
                onSelectField(
                  e.target.value ? (e.target.value as BradwellFieldKey) : null
                )
              }
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
            >
              <option value="">— Click any field on page to move —</option>
              {(Object.keys(BRADWELL_FIELD_ANCHORS) as BradwellFieldKey[]).map(
                (k) => (
                  <option key={k} value={k}>
                    {BRADWELL_FIELD_ANCHORS[k].label}
                  </option>
                )
              )}
            </select>

            {selectedField && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-slate-300">
                  <span className="text-[11px] text-slate-400">X(mm):</span>
                  <input
                    type="number"
                    step="0.5"
                    value={currentFieldOffset.x_mm}
                    onChange={(e) =>
                      onUpdateFieldOffset(selectedField, {
                        ...currentFieldOffset,
                        x_mm: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-white font-mono"
                  />
                </label>

                <label className="flex items-center gap-1 text-slate-300">
                  <span className="text-[11px] text-slate-400">Y(mm):</span>
                  <input
                    type="number"
                    step="0.5"
                    value={currentFieldOffset.y_mm}
                    onChange={(e) =>
                      onUpdateFieldOffset(selectedField, {
                        ...currentFieldOffset,
                        y_mm: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-white font-mono"
                  />
                </label>

                <label className="flex items-center gap-1 text-slate-300">
                  <span className="text-[11px] text-slate-400">Font(pt):</span>
                  <input
                    type="number"
                    step="0.5"
                    value={
                      currentFieldOffset.font_size_pt ??
                      BRADWELL_FIELD_ANCHORS[selectedField].defaultFontPt
                    }
                    onChange={(e) =>
                      onUpdateFieldOffset(selectedField, {
                        ...currentFieldOffset,
                        font_size_pt: parseFloat(e.target.value) || 9,
                      })
                    }
                    className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-white font-mono"
                  />
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scrollable Page Canvas */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center scroller print-area">
        {errorMsg && (
          <div className="no-print mb-6 w-full max-w-2xl bg-red-950/80 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-xs shadow-lg">
            <span className="font-bold text-red-400 mr-2">
              QuickBooks Notice:
            </span>
            {errorMsg}
          </div>
        )}

        {!voucherData ? (
          <div className="no-print my-auto text-center max-w-md p-8 rounded-2xl border border-slate-800 bg-slate-900/50 text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-blue-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold text-white">
              Enter Reference Number to Search
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Make sure QuickBooks Desktop is open, enter a Check Reference
              Number in the left panel, and click{" "}
              <span className="text-blue-400 font-semibold">SEARCH</span>.
            </p>
          </div>
        ) : (
          <BradwellCheckVoucherLayout
            data={voucherData}
            client={client}
            payeeOverride={payeeOverride}
            showWireframeGuide={showWireframeGuide}
            calibrationMode={calibrationMode}
            selectedField={selectedField}
            onSelectField={onSelectField}
            onUpdateFieldOffset={onUpdateFieldOffset}
          />
        )}
      </div>
    </main>
  );
};
