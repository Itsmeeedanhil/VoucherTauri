import React, { useState, useEffect } from "react";
import {
  X,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  Check,
  KeyRound,
  Building2,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  allCompanies: string[];
  hiddenCompanies: string[];
  programmerPassword: string;
  onSaveVisibility: (nextHidden: string[]) => Promise<void>;
  onSavePassword: (newPassword: string) => Promise<void>;
}

export const ProgrammerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  allCompanies,
  hiddenCompanies,
  programmerPassword,
  onSaveVisibility,
  onSavePassword,
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [draftHidden, setDraftHidden] = useState<string[]>(hiddenCompanies);
  const [newPassword, setNewPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsUnlocked(false);
      setPasswordInput("");
      setAuthError(null);
      setDraftHidden(hiddenCompanies);
      setNewPassword("");
      setStatusMsg(null);
    }
  }, [isOpen, hiddenCompanies]);

  if (!isOpen) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === programmerPassword) {
      setIsUnlocked(true);
      setAuthError(null);
    } else {
      setAuthError("Invalid programmer password.");
    }
  };

  const visibleCount = allCompanies.filter(
    (c) => !draftHidden.includes(c)
  ).length;

  const toggleCompany = (company: string) => {
    setStatusMsg(null);
    const isCurrentlyHidden = draftHidden.includes(company);
    if (isCurrentlyHidden) {
      setDraftHidden(draftHidden.filter((c) => c !== company));
    } else {
      if (visibleCount <= 1) {
        setStatusMsg("At least one company must remain visible.");
        return;
      }
      setDraftHidden([...draftHidden, company]);
    }
  };

  const handleShowOnly = (targetCompany: string) => {
    setStatusMsg(null);
    setDraftHidden(allCompanies.filter((c) => c !== targetCompany));
  };

  const handleShowAll = () => {
    setStatusMsg(null);
    setDraftHidden([]);
  };

  const handleApplyChanges = async () => {
    await onSaveVisibility(draftHidden);
    if (newPassword.trim()) {
      await onSavePassword(newPassword.trim());
      setNewPassword("");
    }
    setStatusMsg("Settings saved successfully.");
    setTimeout(() => {
      onClose();
    }, 450);
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Programmer Access Console
              </h2>
              <p className="text-xs text-slate-400">
                Manage visible companies &amp; restricted deployment settings
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

        {!isUnlocked ? (
          <form onSubmit={handleUnlock} className="p-6 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="programmer-password-input"
                className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Enter Programmer Password
              </label>
              <input
                id="programmer-password-input"
                type="password"
                autoFocus
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setAuthError(null);
                }}
                placeholder="Enter password to unlock..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              {authError && (
                <p className="text-xs text-rose-400 font-medium">{authError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Unlock
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto scroller">
            {/* Company Visibility Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  Company Visibility ({visibleCount} of {allCompanies.length}{" "}
                  shown)
                </span>
                <button
                  type="button"
                  onClick={handleShowAll}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                >
                  Show All Companies
                </button>
              </div>

              <div className="space-y-2">
                {allCompanies.map((company) => {
                  const isHidden = draftHidden.includes(company);
                  return (
                    <div
                      key={company}
                      className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition ${
                        isHidden
                          ? "bg-slate-950/60 border-slate-800 text-slate-500"
                          : "bg-slate-800/60 border-slate-700 text-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCompany(company)}
                        className="flex items-center gap-2.5 flex-1 text-left cursor-pointer min-w-0"
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                            isHidden
                              ? "border-slate-700 bg-slate-900 text-transparent"
                              : "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold truncate">
                          {company}
                        </span>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleShowOnly(company)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-blue-600/30 text-slate-300 hover:text-blue-200 border border-slate-700 hover:border-blue-500/40 text-[10px] font-semibold transition cursor-pointer"
                          title="Hide all other companies and show only this company"
                        >
                          Only This
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleCompany(company)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 border transition cursor-pointer ${
                            isHidden
                              ? "bg-rose-950/50 text-rose-300 border-rose-500/30 hover:bg-rose-900/50"
                              : "bg-emerald-950/50 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/50"
                          }`}
                        >
                          {isHidden ? (
                            <>
                              <EyeOff className="w-3 h-3" />
                              Hidden
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              Visible
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional Change Programmer Password */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <label
                htmlFor="programmer-new-password"
                className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Change Programmer Password (Optional)
              </label>
              <input
                id="programmer-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {statusMsg && (
              <div className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
                {statusMsg}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                Shortcut: <code className="text-slate-400">Ctrl+Shift+P</code>{" "}
                or click <code className="text-slate-400">VoucherPRO</code> 5x
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyChanges}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                >
                  Save &amp; Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
