import React, { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  BradwellFieldKey,
  ClientProfile,
  FieldOffset,
  SeriesConfig,
  SignatoriesConfig,
  VoucherData,
} from "./types/voucher";
import { Sidebar } from "./components/Sidebar";
import { VoucherCanvas } from "./components/VoucherCanvas";
import { SignatoriesModal } from "./components/SignatoriesModal";

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
  enabled_forms: ["CV"],
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

  // Load per-company Series & per-client Signatories when company or client changes
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
  }, [selectedClient.code, selectedCompany]);

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
    try {
      const data = await invoke<VoucherData>("query_quickbooks_voucher", {
        formType: "CV",
        clientCode: selectedClient.code,
        companyName: selectedCompany,
        refNumber: refNumber.trim(),
      });
      setVoucherData(data);
    } catch (err: any) {
      setErrorMsg(typeof err === "string" ? err : err?.message || String(err));
    } finally {
      setIsLoading(false);
    }
  }, [selectedClient.code, selectedCompany, refNumber]);

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
    window.print();
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
    <div className="app-shell flex h-screen w-screen overflow-hidden bg-slate-950">
      <Sidebar
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
        voucherData={voucherData}
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
