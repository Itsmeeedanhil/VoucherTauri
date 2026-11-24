import React, { useState, useMemo } from "react";
import {
  X,
  History,
  Search,
  Printer,
  Eye,
  Trash2,
  Building2,
  FileSpreadsheet,
} from "lucide-react";
import { VoucherHistoryEntry } from "../types/voucher";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entries: VoucherHistoryEntry[];
  companies: string[];
  selectedCompany: string;
  onLoadEntry: (entry: VoucherHistoryEntry) => void;
  onReprintEntry: (entry: VoucherHistoryEntry) => void;
  onDeleteEntry: (id: number) => void;
}

export const VoucherHistoryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  entries,
  companies,
  selectedCompany,
  onLoadEntry,
  onReprintEntry,
  onDeleteEntry,
}) => {
  const [companyFilter, setCompanyFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((item) => {
      if (companyFilter !== "ALL" && item.company_name !== companyFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.cv_number.toLowerCase().includes(q) ||
        item.ref_number.toLowerCase().includes(q) ||
        item.payee_name.toLowerCase().includes(q) ||
        item.company_name.toLowerCase().includes(q) ||
        item.voucher_date.toLowerCase().includes(q)
      );
    });
  }, [entries, companyFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Check Voucher Print History
              </h2>
              <p className="text-xs text-slate-400">
                View, load, or reprint previously printed Check Vouchers with
                their assigned CV Series Numbers.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Companies ({entries.length})</option>
              {companies.map((c) => {
                const count = entries.filter(
                  (e) => e.company_name === c
                ).length;
                return (
                  <option key={c} value={c}>
                    {c} ({count})
                  </option>
                );
              })}
            </select>
            {companyFilter !== selectedCompany && (
              <button
                type="button"
                onClick={() => setCompanyFilter(selectedCompany)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 transition cursor-pointer"
              >
                Filter Active Company
              </button>
            )}
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search CV No., Trans # / Check #, Payee..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto scroller">
          {filteredEntries.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <FileSpreadsheet className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                No Printed Vouchers Found
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Whenever you print a Check Voucher, a snapshot with its CV
                Number, Check Reference #, Payee, and Account Distribution is
                automatically saved here for reprinting.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Printed At</th>
                  <th className="py-3 px-4 font-semibold">Company</th>
                  <th className="py-3 px-3 font-semibold">CV Number</th>
                  <th className="py-3 px-3 font-semibold">Check Ref #</th>
                  <th className="py-3 px-3 font-semibold">Voucher Date</th>
                  <th className="py-3 px-4 font-semibold">Payee</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredEntries.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {item.printed_at}
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-medium max-w-[180px] truncate">
                      {item.company_name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300 font-mono font-bold text-xs">
                        {item.cv_number}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-200 font-semibold">
                      {item.ref_number}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                      {item.voucher_date}
                    </td>
                    <td className="py-3 px-4 text-white font-semibold max-w-[200px] truncate">
                      {item.payee_name}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-300 whitespace-nowrap">
                      {item.total_amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onLoadEntry(item)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                          title="Load this voucher onto the screen preview"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => onReprintEntry(item)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-xs transition cursor-pointer"
                          title="Load and immediately print this Check Voucher with its original CV Number"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Reprint
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteEntry(item.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete history entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing{" "}
            <strong className="text-white">{filteredEntries.length}</strong>{" "}
            printed voucher(s)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
