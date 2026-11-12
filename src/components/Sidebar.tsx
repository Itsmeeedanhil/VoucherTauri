import React from "react";
import {
  Search,
  Printer,
  Users,
  UserPen,
  Building2,
  Layers,
  FileSpreadsheet,
  CreditCard,
  Lock,
} from "lucide-react";
import { ClientProfile, FormType } from "../types/voucher";

interface SidebarProps {
  activeForm: FormType;
  onSelectForm: (form: FormType) => void;
  clients: ClientProfile[];
  selectedClient: ClientProfile;
  onSelectClient: (client: ClientProfile) => void;
  selectedCompany: string;
  onSelectCompany: (company: string) => void;
  refNumber: string;
  onRefNumberChange: (val: string) => void;
  onSearchVoucher: () => void;
  isLoading: boolean;
  payeeOverride: string;
  onPayeeOverrideChange: (val: string) => void;
  onOpenSignatoriesModal: () => void;
  onPrint: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeForm,
  onSelectForm,
  clients,
  selectedClient,
  onSelectClient,
  selectedCompany,
  onSelectCompany,
  refNumber,
  onRefNumberChange,
  onSearchVoucher,
  isLoading,
  payeeOverride,
  onPayeeOverrideChange,
  onOpenSignatoriesModal,
  onPrint,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      onSearchVoucher();
    }
  };

  return (
    <aside className="no-print w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-screen text-slate-100 select-none shrink-0">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60">
        <h1 className="font-bold text-base tracking-wide text-white">
          VoucherPRO
        </h1>
        <p className="text-xs text-slate-400">
          Check Voucher &amp; Cheque Printing
        </p>
      </div>

      {/* Essential Controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroller">
        {/* 0. FORM MODULE SWITCHER */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-2 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onSelectForm("CV")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeForm === "CV"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Check Voucher</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectForm("Check")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeForm === "Check"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Cheque Print</span>
            </button>
          </div>

          <button
            type="button"
            disabled
            aria-disabled="true"
            title="BIR Form 2307 module is currently locked pending client approval"
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold bg-slate-900/60 text-slate-500 border border-slate-800/80 opacity-60 cursor-not-allowed"
          >
            <Lock className="w-3 h-3 text-amber-500/80 shrink-0" />
            <span className="truncate">BIR Form 2307 (Locked)</span>
          </button>
        </div>

        {/* Optional Client Layout Selector (Automatically shown when additional clients/layouts are added) */}
        {clients.length > 1 && (
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <label
              htmlFor="sidebar-client-select"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Select Client Layout
            </label>
            <select
              id="sidebar-client-select"
              name="client_layout"
              value={selectedClient.code}
              onChange={(e) => {
                const found = clients.find((c) => c.code === e.target.value);
                if (found) onSelectClient(found);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              {clients.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 1. SELECT COMPANY (3 Companies under active client profile) */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <label
            htmlFor="sidebar-company-select"
            className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            Select Company
          </label>
          <select
            id="sidebar-company-select"
            name="company"
            value={selectedCompany}
            onChange={(e) => onSelectCompany(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            {selectedClient.sub_companies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>

        {/* 2. PAYEE OVERRIDE (CV & Cheque Printing) */}
        {(activeForm === "CV" || activeForm === "Check") && (
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <label
              htmlFor="sidebar-payee-override"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
            >
              <UserPen className="w-3.5 h-3.5 text-blue-400" />
              Payee :
            </label>
            <input
              id="sidebar-payee-override"
              name="payee_override"
              type="text"
              value={payeeOverride}
              onChange={(e) => onPayeeOverrideChange(e.target.value)}
              placeholder="Optional Payee Override"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* 3. ENTER REFERENCE NUMBER */}
        <search>
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <label
              htmlFor="sidebar-ref-number"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5 text-blue-400" />
              {activeForm === "BIR2307"
                ? "Pull Payee from Check Ref #"
                : "Enter Reference Number"}
            </label>
            <input
              id="sidebar-ref-number"
              name="ref_number"
              type="search"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={refNumber}
              onChange={(e) => onRefNumberChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter Check Ref No."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
            <button
              type="button"
              onClick={onSearchVoucher}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            >
              {isLoading
                ? "Searching QuickBooks..."
                : activeForm === "BIR2307"
                ? "Search & Auto-Fill 2307"
                : "Search"}
            </button>
          </div>
        </search>

        {/* 4. SIGNATORY (CV Only) */}
        {activeForm === "CV" && (
          <button
            type="button"
            onClick={onOpenSignatoriesModal}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
          >
            <Users className="w-4 h-4 text-blue-400" />
            Signatory
          </button>
        )}

        {/* 5. PRINT */}
        <button
          type="button"
          onClick={onPrint}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          {activeForm === "CV"
            ? "Print Check Voucher"
            : activeForm === "Check"
            ? "Print Cheque"
            : "Print BIR 2307 (Page 1)"}
        </button>
      </div>
    </aside>
  );
};
