import React, { useEffect, useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  BradwellFieldKey,
  ClientProfile,
  FieldOffset,
  Form2307Data,
  Form2307Row,
  FormType,
  LayoutConfig,
  SeriesConfig,
  SignatoriesConfig,
  VoucherData,
  VoucherHistoryEntry,
} from "./types/voucher";
import { Sidebar } from "./components/Sidebar";
import { VoucherCanvas } from "./components/VoucherCanvas";
import { SignatoriesModal } from "./components/SignatoriesModal";
import { VoucherHistoryModal } from "./components/VoucherHistoryModal";
import { ProgrammerModal } from "./components/ProgrammerModal";

export const ALL_COMPANIES: string[] = [
  "Bradwell Sales and Marketing Corp.",
  "Mapleway International Distributions Corp.",
  "StoneBridge Materials Corp.",
  "Eurohub Warehousing and Logistics Inc.",
  "RAC Experts Information Technology Inc.",
];

const createEmpty2307Rows = (): Form2307Row[] =>
  Array.from({ length: 10 }, () => ({
    description: "",
    atc: "",
    month1: 0,
    month2: 0,
    month3: 0,
    total: 0,
    tax_withheld: 0,
  }));

const createDefaultBir2307 = (
  companyName: string,
  _client?: ClientProfile
): Form2307Data => {
  return {
    company_name: companyName,
    from_date: "",
    to_date: "",
    payee_tin: "",
    payee_name: "",
    payee_address: "",
    payee_zip: "",
    payee_foreign_address: "",
    payor_tin: "",
    payor_name: "",
    payor_address: "",
    payor_zip: "",
    payor_signatory: "",
    payor_title_tin: "",
    payor_title: "",
    payor_rep_tin: "",
    payor_signature_url: "",
    payee_signatory: "",
    payee_title_tin: "",
    table1: createEmpty2307Rows(),
    table2: createEmpty2307Rows(),
  };
};

const formatSeriesString = (ser: SeriesConfig): string => {
  const digits = String(ser.current_number).padStart(ser.digit_count || 5, "0");
  return ser.prefix ? `${ser.prefix}${digits}` : digits;
};

const DEFAULT_CLIENT_PROFILE: ClientProfile = {
  id: "bradwell",
  code: "BRADWELL",
  name: "Bradwell Sales and Marketing Corp.",
  address:
    "#84-B Malakas St. Pinyahan Diliman, 1100 Quezon City NCR, Second District Philippines",
  contact_number: "(02) 8635-0000",
  website: "",
  tin: "010-261-476-00000",
  sub_companies: ALL_COMPANIES,
  enabled_forms: ["CV", "Check", "BIR2307"],
  logo_url: null,
  layout_config: {
    page_size: "Letter",
    margin_top_mm: 0,
    margin_bottom_mm: 0,
    margin_left_mm: 0,
    margin_right_mm: 0,
    header_font_size: 11,
    body_font_size: 10,
    table_font_size: 9,
    show_company_header: true,
    show_class_column: false,
    show_customer_job_column: false,
    show_tin: true,
    signatory_columns: 4,
    check_x_offset_mm: 0,
    check_y_offset_mm: 0,
    check_date_spacing: 2,
    check_rotate_90: false,
    custom_title: "CHECK VOUCHER",
    preprinted_x_offset_mm: 0,
    preprinted_y_offset_mm: 0,
    show_amount_in_words_receipt: true,
    show_distribution_totals: false,
    field_offsets: {},
  },
};

export function App() {
  const [activeForm, setActiveForm] = useState<FormType>("CV");
  const [clients, setClients] = useState<ClientProfile[]>([
    DEFAULT_CLIENT_PROFILE,
  ]);
  const [selectedClient, setSelectedClient] = useState<ClientProfile>(
    DEFAULT_CLIENT_PROFILE
  );
  const [selectedCompany, setSelectedCompany] = useState<string>(
    DEFAULT_CLIENT_PROFILE.sub_companies[0]
  );
  const [refNumber, setRefNumber] = useState<string>("");
  const [seriesConfig, setSeriesConfig] = useState<SeriesConfig | null>(null);
  const [signatories, setSignatories] = useState<SignatoriesConfig | null>(
    null
  );
  const [voucherData, setVoucherData] = useState<VoucherData | null>(null);
  const [bir2307Data, setBir2307Data] = useState<Form2307Data>(() =>
    createDefaultBir2307(
      DEFAULT_CLIENT_PROFILE.sub_companies[0],
      DEFAULT_CLIENT_PROFILE
    )
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [payeeOverride, setPayeeOverride] = useState<string>("");
  const [isSignatoriesOpen, setIsSignatoriesOpen] = useState<boolean>(false);

  // Programmer Access State (Company Visibility & Password)
  const [isProgrammerOpen, setIsProgrammerOpen] = useState<boolean>(false);
  const [hiddenCompanies, setHiddenCompanies] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("voucherpro_hidden_companies");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [programmerPassword, setProgrammerPassword] = useState<string>(() => {
    return localStorage.getItem("voucherpro_programmer_password") || "admin123";
  });

  // Print History State
  const [voucherHistory, setVoucherHistory] = useState<VoucherHistoryEntry[]>(
    []
  );
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const isLoadedFromHistoryRef = useRef<boolean>(false);

  // Interactive Field Movement / Calibration & Full Form Template
  const [calibrationMode, setCalibrationMode] = useState<boolean>(false);
  const [showWireframeGuide, setShowWireframeGuide] = useState<boolean>(true);
  const [selectedField, setSelectedField] =
    useState<BradwellFieldKey | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const hist = await invoke<VoucherHistoryEntry[]>("get_voucher_history", {
        companyName: null,
      });
      setVoucherHistory(hist || []);
    } catch (err) {
      console.warn("History fetch warning:", err);
    }
  }, []);

  // Load Client Profiles & History from SQLite
  useEffect(() => {
    async function init() {
      try {
        const list = await invoke<ClientProfile[]>("get_clients");
        if (list && list.length > 0) {
          const mergedList = list.map((c) => ({
            ...c,
            sub_companies: Array.from(
              new Set([...(c.sub_companies || []), ...ALL_COMPANIES])
            ),
          }));
          setClients(mergedList);
          const first = mergedList[0];
          setSelectedClient(first);
        }
      } catch (err) {
        console.warn("Running outside Tauri or DB init warning:", err);
      }
      try {
        const [savedHiddenJson, savedPwd] = await Promise.all([
          invoke<string>("get_app_setting", {
            key: "hidden_companies",
            defaultVal: "[]",
          }),
          invoke<string>("get_app_setting", {
            key: "programmer_password",
            defaultVal: "admin123",
          }),
        ]);
        const parsedHidden: string[] = JSON.parse(savedHiddenJson || "[]");
        if (Array.isArray(parsedHidden)) {
          setHiddenCompanies(parsedHidden);
          localStorage.setItem(
            "voucherpro_hidden_companies",
            JSON.stringify(parsedHidden)
          );
        }
        if (savedPwd) {
          setProgrammerPassword(savedPwd);
          localStorage.setItem("voucherpro_programmer_password", savedPwd);
        }
      } catch {
        // Fallback to localStorage values initialized in state
      }
      loadHistory();
    }
    init();
  }, [loadHistory]);

  // Global keyboard shortcut (Ctrl+Shift+P) for Programmer Access
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setIsProgrammerOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const allClientCompanies = Array.from(
    new Set([...(selectedClient.sub_companies || []), ...ALL_COMPANIES])
  );
  const visibleCompanies = (() => {
    const filtered = allClientCompanies.filter(
      (c) => !hiddenCompanies.includes(c)
    );
    return filtered.length > 0 ? filtered : [allClientCompanies[0]];
  })();

  useEffect(() => {
    if (!visibleCompanies.includes(selectedCompany)) {
      const nextComp = visibleCompanies[0];
      if (nextComp) {
        setSelectedCompany(nextComp);
      }
    }
  }, [visibleCompanies, selectedCompany]);

  const handleSaveHiddenCompanies = async (nextHidden: string[]) => {
    setHiddenCompanies(nextHidden);
    const json = JSON.stringify(nextHidden);
    localStorage.setItem("voucherpro_hidden_companies", json);
    try {
      await invoke("set_app_setting", {
        key: "hidden_companies",
        val: json,
      });
    } catch (err) {
      console.warn("Failed to persist hidden_companies to DB:", err);
    }
  };

  const handleSaveProgrammerPassword = async (newPwd: string) => {
    setProgrammerPassword(newPwd);
    localStorage.setItem("voucherpro_programmer_password", newPwd);
    try {
      await invoke("set_app_setting", {
        key: "programmer_password",
        val: newPwd,
      });
    } catch (err) {
      console.warn("Failed to persist programmer_password to DB:", err);
    }
  };

  // Load per-company Series & Signatories when company or client changes
  useEffect(() => {
    async function loadMeta() {
      const seriesKey = selectedCompany || selectedClient.code;
      try {
        const [ser, sig] = await Promise.all([
          invoke<SeriesConfig>("get_series", {
            clientCode: seriesKey,
            formType: "CV",
          }),
          invoke<SignatoriesConfig>("get_signatories", {
            clientCode: selectedClient.code,
          }),
        ]);
        setSeriesConfig(ser);
        setSignatories(sig);

        const formatted = formatSeriesString(ser);

        setVoucherData((prev) => {
          if (!prev) return null;
          // If user loaded a historical voucher for this exact company, preserve its historical CV number
          if (isLoadedFromHistoryRef.current && prev.company_name === selectedCompany) {
            return prev;
          }
          isLoadedFromHistoryRef.current = false;
          return {
            ...prev,
            company_name: selectedCompany,
            series_number: formatted,
          };
        });
      } catch (err) {
        console.warn("Meta fetch fallback:", err);
      }
    }
    loadMeta();
  }, [selectedClient, selectedCompany]);

  const handleSelectClient = (client: ClientProfile) => {
    const nextComp = client.sub_companies[0] || client.name;
    isLoadedFromHistoryRef.current = false;
    setSelectedClient(client);
    setSelectedCompany(nextComp);
    setVoucherData(null);
    setRefNumber("");
    setPayeeOverride("");
    setErrorMsg(null);
    setBir2307Data(createDefaultBir2307(nextComp, client));
  };

  const handleSelectCompany = (company: string) => {
    isLoadedFromHistoryRef.current = false;
    setSelectedCompany(company);
    setVoucherData(null);
    setRefNumber("");
    setPayeeOverride("");
    setErrorMsg(null);
    setBir2307Data(createDefaultBir2307(company, selectedClient));
  };

  const fetchVoucher = useCallback(async () => {
    const isRacExperts = selectedCompany.toLowerCase().includes("rac experts");
    if (!refNumber.trim()) {
      setErrorMsg(
        isRacExperts
          ? "Please enter a Reference Number."
          : "Please enter a Journal Transaction Number (Trans #)."
      );
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    isLoadedFromHistoryRef.current = false;
    setBir2307Data(createDefaultBir2307(selectedCompany, selectedClient));
    try {
      const data = await invoke<VoucherData>("query_quickbooks_voucher", {
        formType: activeForm === "Check" ? "Check" : "CV",
        clientCode: selectedClient.code,
        companyName: selectedCompany,
        refNumber: refNumber.trim(),
      });
      setVoucherData(data);

      setBir2307Data(() => {
        const fresh = createDefaultBir2307(selectedCompany, selectedClient);
        const zipMatch = (data.payee_address || "").match(/\b(\d{4})\b/);
        const extractedPayeeZip =
          data.payee_zip || (zipMatch ? zipMatch[1] : "");

        const payorZipMatch = (
          data.payor_address ||
          selectedClient.address ||
          ""
        ).match(/\b(\d{4})\b/);
        const extractedPayorZip =
          data.payor_zip || (payorZipMatch ? payorZipMatch[1] : "1100");

        let mIndex = 0;
        let fromDate = "";
        let toDate = "";
        const parts = (data.date || "").split("/");
        if (parts.length === 3) {
          const monthNum = parseInt(parts[0], 10) - 1;
          const yearNum = parseInt(parts[2], 10);
          if (!isNaN(monthNum) && !isNaN(yearNum)) {
            mIndex = monthNum % 3;
            const qStart = Math.floor(monthNum / 3) * 3;
            const dFrom = new Date(yearNum, qStart, 1);
            const dTo = new Date(yearNum, qStart + 3, 0);
            fromDate = dFrom.toISOString().slice(0, 10);
            toDate = dTo.toISOString().slice(0, 10);
          }
        }

        const ewtLine = data.line_items.find(
          (li) =>
            li.credit > 0 &&
            /withholding|ewt|wtax|tax withheld|expanded/i.test(
              `${li.account_name} ${li.memo}`
            )
        );
        const expenseDebitSum = data.line_items
          .filter((li) => li.debit > 0)
          .reduce((s, li) => s + li.debit, 0);
        const baseIncome =
          expenseDebitSum > 0 ? expenseDebitSum : data.total_amount;
        const taxAmt = ewtLine
          ? ewtLine.credit
          : Math.round(baseIncome * 0.1 * 100) / 100;

        const nextTable1 = createEmpty2307Rows();
        nextTable1[0] = {
          description: data.memo || `Check Ref #${data.ref_number}`,
          atc: "",
          month1: mIndex === 0 ? baseIncome : 0,
          month2: mIndex === 1 ? baseIncome : 0,
          month3: mIndex === 2 ? baseIncome : 0,
          total: baseIncome,
          tax_withheld: taxAmt,
        };

        return {
          ...fresh,
          from_date: fromDate,
          to_date: toDate,
          payee_name: data.payee_name || "",
          payee_address: data.payee_address || "",
          payee_tin: data.tin || "",
          payee_zip: extractedPayeeZip,
          payee_foreign_address: "",
          payor_name: data.payor_name || selectedCompany || "",
          payor_address: data.payor_address || selectedClient.address || "",
          payor_tin: data.payor_tin || selectedClient.tin || "",
          payor_zip: extractedPayorZip,
          payor_signatory:
            data.signatories?.approved_by_name ||
            signatories?.approved_by_name ||
            "",
          payor_title_tin: "",
          payor_title:
            data.signatories?.approved_by_pos ||
            signatories?.approved_by_pos ||
            "",
          payor_rep_tin: data.payor_tin || selectedClient.tin || "",
          payor_signature_url: "",
          payee_signatory: "",
          payee_title_tin: "",
          table1: nextTable1,
          table2: createEmpty2307Rows(),
        };
      });
    } catch (err: any) {
      setErrorMsg(typeof err === "string" ? err : err?.message || String(err));
    } finally {
      setIsLoading(false);
    }
  }, [selectedClient, selectedCompany, refNumber, signatories]);

  const handleUpdateSeries = async (newNum: number, newPrefix: string) => {
    if (!seriesConfig) return;
    const seriesKey = selectedCompany || selectedClient.code;
    const updated: SeriesConfig = {
      ...seriesConfig,
      client_code: seriesKey,
      current_number: newNum,
      prefix: newPrefix,
    };
    setSeriesConfig(updated);
    isLoadedFromHistoryRef.current = false;
    try {
      await invoke("update_series", { config: updated });
      const formatted = formatSeriesString(updated);

      if (voucherData) {
        setVoucherData({
          ...voucherData,
          series_number: formatted,
        });
      }
    } catch (err: any) {
      setErrorMsg(String(err));
    }
  };

  const handleSaveBir2307 = useCallback(
    async (data: Form2307Data) => {
      const withCompany = { ...data, company_name: selectedCompany };
      setBir2307Data(withCompany);
      try {
        await invoke("save_bir2307", { data: withCompany });
      } catch (err: any) {
        setErrorMsg(String(err));
      }
    },
    [selectedCompany]
  );

  const handleChangeBir2307 = useCallback(
    (next: Form2307Data) => {
      const withCompany = { ...next, company_name: selectedCompany };
      setBir2307Data(withCompany);
      invoke("save_bir2307", { data: withCompany }).catch(() => {});
    },
    [selectedCompany]
  );

  const handleSaveClientProfile = async (updated: ClientProfile) => {
    setSelectedClient(updated);
    setClients((prev) =>
      prev.map((c) => (c.code === updated.code ? updated : c))
    );
    try {
      await invoke("save_client_profile", { profile: updated });
    } catch (err: any) {
      setErrorMsg(String(err));
    }
  };

  const handleUpdateLayoutConfig = (next: LayoutConfig) => {
    handleSaveClientProfile({
      ...selectedClient,
      layout_config: next,
    });
  };

  const handleUpdateFieldOffset = (
    field: BradwellFieldKey,
    next: FieldOffset
  ) => {
    const cfg = selectedClient.layout_config;
    const updated: ClientProfile = {
      ...selectedClient,
      layout_config: {
        ...cfg,
        field_offsets: {
          ...(cfg.field_offsets ?? {}),
          [field]: next,
        },
      },
    };
    handleSaveClientProfile(updated);
  };

  const handleResetAllOffsets = () => {
    const cfg = selectedClient.layout_config;
    const updated: ClientProfile = {
      ...selectedClient,
      layout_config: {
        ...cfg,
        preprinted_x_offset_mm: 0,
        preprinted_y_offset_mm: 0,
        check_x_offset_mm: 0,
        check_y_offset_mm: 0,
        field_offsets: {},
      },
    };
    handleSaveClientProfile(updated);
  };

  const handleSaveSignatories = async (sig: SignatoriesConfig) => {
    setSignatories(sig);
    await invoke("save_signatories", { config: sig });
    if (voucherData) {
      setVoucherData({
        ...voucherData,
        signatories: sig,
      });
    }
  };

  const handleLoadHistoryEntry = (entry: VoucherHistoryEntry) => {
    isLoadedFromHistoryRef.current = true;
    setSelectedCompany(entry.company_name);
    setRefNumber(entry.ref_number);
    setPayeeOverride("");
    setVoucherData({
      ...entry.voucher_data,
      company_name: entry.company_name,
      series_number: entry.cv_number,
      payee_name: entry.payee_name,
    });
    setActiveForm("CV");
    setIsHistoryOpen(false);
  };

  const handleReprintHistoryEntry = (entry: VoucherHistoryEntry) => {
    handleLoadHistoryEntry(entry);
    setTimeout(() => {
      const prevTitle = document.title;
      document.title = "";
      const scroller = document.querySelector(".print-area");
      if (scroller) {
        scroller.scrollTop = 0;
        scroller.scrollLeft = 0;
      }
      window.scrollTo(0, 0);
      window.print();
      document.title = prevTitle;
    }, 150);
  };

  const handleDeleteHistoryEntry = async (id: number) => {
    try {
      await invoke("delete_voucher_history", { id });
      setVoucherHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setErrorMsg(String(err));
    }
  };

  const handlePrint = async () => {
    const prevTitle = document.title;
    document.title = "";
    const scroller = document.querySelector(".print-area");
    if (scroller) {
      scroller.scrollTop = 0;
      scroller.scrollLeft = 0;
    }
    window.scrollTo(0, 0);

    if (activeForm === "BIR2307") {
      await handleSaveBir2307(bir2307Data);
      window.print();
      document.title = prevTitle;
      return;
    }

    window.print();
    document.title = prevTitle;

    if (activeForm === "CV" && voucherData) {
      const effectivePayee = payeeOverride.trim() || voucherData.payee_name;
      const snapshotToSave: VoucherData = {
        ...voucherData,
        company_name: selectedCompany,
        payee_name: effectivePayee,
      };

      try {
        await invoke("save_voucher_history", {
          companyName: selectedCompany,
          cvNumber: voucherData.series_number,
          refNumber: voucherData.ref_number,
          payeeName: effectivePayee,
          voucherDate: voucherData.date,
          totalAmount: voucherData.total_amount,
          voucherData: snapshotToSave,
        });
        loadHistory();
      } catch (err) {
        console.error("Failed to save voucher print history:", err);
      }

      // Auto-increment the company's series number if printing the current active series number (not a historical reprint)
      if (seriesConfig && !isLoadedFromHistoryRef.current) {
        const seriesKey = selectedCompany || selectedClient.code;
        try {
          const nextSer = await invoke<SeriesConfig>("increment_series", {
            clientCode: seriesKey,
            formType: "CV",
          });
          setSeriesConfig(nextSer);
          const formatted = formatSeriesString(nextSer);
          setVoucherData({
            ...voucherData,
            series_number: formatted,
          });
        } catch (err) {
          console.error("Failed to auto-increment CV series:", err);
        }
      }
    }
  };

  return (
    <div
      className={`app-shell flex h-screen w-screen overflow-hidden bg-slate-950 ${
        activeForm === "BIR2307"
          ? "mode-bir2307"
          : activeForm === "Check"
          ? "mode-check"
          : "mode-cv"
      }`}
    >
      <Sidebar
        activeForm={activeForm}
        onSelectForm={(f) => {
          if (f === "BIR2307") return; // Locked until client approval
          setActiveForm(f);
          setSelectedField(null);
        }}
        clients={clients}
        selectedClient={{
          ...selectedClient,
          sub_companies: visibleCompanies,
        }}
        onSelectClient={handleSelectClient}
        selectedCompany={selectedCompany}
        onSelectCompany={handleSelectCompany}
        refNumber={refNumber}
        onRefNumberChange={setRefNumber}
        onSearchVoucher={fetchVoucher}
        isLoading={isLoading}
        seriesConfig={seriesConfig}
        onUpdateSeries={handleUpdateSeries}
        payeeOverride={payeeOverride}
        onPayeeOverrideChange={setPayeeOverride}
        onOpenSignatoriesModal={() => setIsSignatoriesOpen(true)}
        historyCount={voucherHistory.length}
        onOpenHistoryModal={() => setIsHistoryOpen(true)}
        onOpenProgrammerModal={() => setIsProgrammerOpen(true)}
        onPrint={handlePrint}
      />

      <VoucherCanvas
        activeForm={activeForm}
        selectedCompany={selectedCompany}
        voucherData={voucherData}
        bir2307Data={bir2307Data}
        onChangeBir2307={handleChangeBir2307}
        onSaveBir2307={handleSaveBir2307}
        onResetBir2307={() => {
          const fresh = createDefaultBir2307(selectedCompany, selectedClient);
          handleChangeBir2307(fresh);
        }}
        client={selectedClient}
        onUpdateLayoutConfig={handleUpdateLayoutConfig}
        payeeOverride={payeeOverride}
        errorMsg={errorMsg}
        showWireframeGuide={showWireframeGuide}
        onToggleWireframeGuide={setShowWireframeGuide}
        calibrationMode={calibrationMode}
        onToggleCalibrationMode={setCalibrationMode}
        selectedField={selectedField}
        onSelectField={setSelectedField}
        onUpdateFieldOffset={handleUpdateFieldOffset}
        onResetAllOffsets={handleResetAllOffsets}
      />

      {signatories && (
        <SignatoriesModal
          isOpen={isSignatoriesOpen}
          onClose={() => setIsSignatoriesOpen(false)}
          client={selectedClient}
          signatories={signatories}
          onSaveSignatories={handleSaveSignatories}
        />
      )}

      <VoucherHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        entries={voucherHistory}
        companies={visibleCompanies}
        selectedCompany={selectedCompany}
        onLoadEntry={handleLoadHistoryEntry}
        onReprintEntry={handleReprintHistoryEntry}
        onDeleteEntry={handleDeleteHistoryEntry}
      />

      <ProgrammerModal
        isOpen={isProgrammerOpen}
        onClose={() => setIsProgrammerOpen(false)}
        allCompanies={allClientCompanies}
        hiddenCompanies={hiddenCompanies}
        programmerPassword={programmerPassword}
        onSaveVisibility={handleSaveHiddenCompanies}
        onSavePassword={handleSaveProgrammerPassword}
      />
    </div>
  );
}

export default App;
