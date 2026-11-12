import React, { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  BradwellFieldKey,
  ClientProfile,
  FieldOffset,
  Form2307Data,
  Form2307Row,
  FormType,
  SeriesConfig,
  SignatoriesConfig,
  VoucherData,
} from "./types/voucher";
import { Sidebar } from "./components/Sidebar";
import { VoucherCanvas } from "./components/VoucherCanvas";
import { SignatoriesModal } from "./components/SignatoriesModal";

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

const DEFAULT_CLIENT_PROFILE: ClientProfile = {
  id: "bradwell",
  code: "BRADWELL",
  name: "Bradwell Sales and Marketing Corp.",
  address: "178-B5. E. Rodriguez Jr. Ave., Bagumbayan, Quezon City",
  contact_number: "(02) 8635-0000",
  website: "",
  tin: "009-421-884-000",
  sub_companies: [
    "Bradwell Sales and Marketing Corp.",
    "Mapleway International Distributions Corp.",
    "StoneBridge Materials Corp.",
  ],
  enabled_forms: ["CV", "BIR2307"],
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
    show_company_header: false,
    show_class_column: false,
    show_customer_job_column: false,
    show_tin: false,
    signatory_columns: 4,
    check_x_offset_mm: 0,
    check_y_offset_mm: 0,
    check_date_spacing: 2,
    check_rotate_90: false,
    custom_title: "CHECK VOUCHER",
    preprinted_x_offset_mm: 0,
    preprinted_y_offset_mm: 0,
    show_amount_in_words_receipt: false,
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

  // Interactive Field Movement / Calibration & Optional Wireframe Lines
  const [calibrationMode, setCalibrationMode] = useState<boolean>(false);
  const [showWireframeGuide, setShowWireframeGuide] = useState<boolean>(false);
  const [selectedField, setSelectedField] =
    useState<BradwellFieldKey | null>(null);

  // Load Client Profiles from SQLite
  useEffect(() => {
    async function init() {
      try {
        const list = await invoke<ClientProfile[]>("get_clients");
        if (list && list.length > 0) {
          setClients(list);
          const first = list[0];
          setSelectedClient(first);
          setSelectedCompany(first.sub_companies[0] || first.name);
        }
      } catch (err) {
        console.warn("Running outside Tauri or DB init warning:", err);
      }
    }
    init();
  }, []);

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

        const formatted = ser.prefix
          ? `${ser.prefix}${String(ser.current_number).padStart(
              ser.digit_count,
              "0"
            )}`
          : String(ser.current_number).padStart(ser.digit_count, "0");

        setVoucherData((prev) =>
          prev
            ? {
                ...prev,
                company_name: selectedCompany,
                series_number: formatted,
              }
            : null
        );
      } catch (err) {
        console.warn("Meta fetch fallback:", err);
      }
    }
    loadMeta();
  }, [selectedClient, selectedCompany]);

  const handleSelectClient = (client: ClientProfile) => {
    setSelectedClient(client);
    setSelectedCompany(client.sub_companies[0] || client.name);
  };

  const fetchVoucher = useCallback(async () => {
    if (!refNumber.trim()) {
      setErrorMsg("Please enter a Reference Number.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    // Reset BIR 2307 state immediately when searching a new Reference Number
    setBir2307Data(createDefaultBir2307(selectedCompany, selectedClient));
    try {
      const data = await invoke<VoucherData>("query_quickbooks_voucher", {
        formType: "CV",
        clientCode: selectedClient.code,
        companyName: selectedCompany,
        refNumber: refNumber.trim(),
      });
      setVoucherData(data);

      // Reset all BIR 2307 fields to a clean slate before auto-filling from the newly searched QuickBooks Check
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
          data.payor_zip || (payorZipMatch ? payorZipMatch[1] : "1110");

        // Parse check date (MM/DD/YYYY) to determine which month of the quarter it falls into
        let mIndex = 0; // 0 = 1st month, 1 = 2nd month, 2 = 3rd month
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

        // Look for any Withholding Tax / EWT credit line and gross expense line in QuickBooks line_items
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
    try {
      await invoke("update_series", { config: updated });
      const formatted = updated.prefix
        ? `${updated.prefix}${String(updated.current_number).padStart(
            updated.digit_count,
            "0"
          )}`
        : String(updated.current_number).padStart(updated.digit_count, "0");

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
    if (seriesConfig) {
      const seriesKey = selectedCompany || selectedClient.code;
      try {
        const nextSer = await invoke<SeriesConfig>("increment_series", {
          clientCode: seriesKey,
          formType: "CV",
        });
        setSeriesConfig(nextSer);
        const formatted = nextSer.prefix
          ? `${nextSer.prefix}${String(nextSer.current_number).padStart(
              nextSer.digit_count,
              "0"
            )}`
          : String(nextSer.current_number).padStart(nextSer.digit_count, "0");
        if (voucherData) {
          setVoucherData({
            ...voucherData,
            series_number: formatted,
          });
        }
      } catch (err) {
        console.error("Failed to auto-increment CV series:", err);
      }
    }
  };

  return (
    <div
      className={`app-shell flex h-screen w-screen overflow-hidden bg-slate-950 ${
        activeForm === "BIR2307" ? "mode-bir2307" : "mode-cv"
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
        selectedClient={selectedClient}
        onSelectClient={handleSelectClient}
        selectedCompany={selectedCompany}
        onSelectCompany={setSelectedCompany}
        refNumber={refNumber}
        onRefNumberChange={setRefNumber}
        onSearchVoucher={fetchVoucher}
        isLoading={isLoading}
        seriesConfig={seriesConfig}
        onUpdateSeries={handleUpdateSeries}
        payeeOverride={payeeOverride}
        onPayeeOverrideChange={setPayeeOverride}
        onOpenSignatoriesModal={() => setIsSignatoriesOpen(true)}
        onPrint={handlePrint}
      />

      <VoucherCanvas
        activeForm={activeForm}
        voucherData={voucherData}
        bir2307Data={bir2307Data}
        onChangeBir2307={handleChangeBir2307}
        onSaveBir2307={handleSaveBir2307}
        onResetBir2307={() => {
          const fresh = createDefaultBir2307(selectedCompany, selectedClient);
          handleChangeBir2307(fresh);
        }}
        client={selectedClient}
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
    </div>
  );
}

export default App;
