import React, { useState } from "react";
import { UserCheck, X, Check } from "lucide-react";
import { ClientProfile, SignatoriesConfig } from "../types/voucher";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  client: ClientProfile;
  signatories: SignatoriesConfig;
  onSaveSignatories: (sig: SignatoriesConfig) => Promise<void>;
}

export const SignatoriesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  signatories,
  onSaveSignatories,
}) => {
  const [formData, setFormData] = useState<SignatoriesConfig>(signatories);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSignatories(formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Manage Signatories
              </h2>
              <p className="text-xs text-slate-400">
                Configure authorized voucher signatories
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {/* Column 1: Prepared By */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3.5">
            <label className="block text-xs font-semibold text-blue-400 mb-1">
              1. Prepared By:
            </label>
            <input
              type="text"
              value={formData.prepared_by_name}
              onChange={(e) =>
                setFormData({ ...formData, prepared_by_name: e.target.value })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g. MAKVY"
            />
          </div>

          {/* Column 2: Checked By */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3.5">
            <label className="block text-xs font-semibold text-blue-400 mb-1">
              2. Checked By:
            </label>
            <input
              type="text"
              value={formData.checked_by_name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  checked_by_name: e.target.value,
                  reviewed_by_name: e.target.value,
                })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              placeholder="Checked By Name"
            />
          </div>

          {/* Column 3: Approved By */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3.5">
            <label className="block text-xs font-semibold text-blue-400 mb-1">
              3. Approved By:
            </label>
            <input
              type="text"
              value={formData.approved_by_name}
              onChange={(e) =>
                setFormData({ ...formData, approved_by_name: e.target.value })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              placeholder="Approved By Name"
            />
          </div>

          {/* Column 4: Audited By */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3.5">
            <label className="block text-xs font-semibold text-blue-400 mb-1">
              4. Audited By:
            </label>
            <input
              type="text"
              value={formData.recommending_name}
              onChange={(e) =>
                setFormData({ ...formData, recommending_name: e.target.value })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              placeholder="Audited By Name"
            />
          </div>

          {/* Bottom Receipt: Received By */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3.5">
            <label className="block text-xs font-semibold text-emerald-400 mb-1">
              5. Received By:
            </label>
            <input
              type="text"
              value={formData.received_by_name}
              onChange={(e) =>
                setFormData({ ...formData, received_by_name: e.target.value })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              placeholder="Optional Printed Name for Received By"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Signatories"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
