use crate::models::{ClientProfile, LayoutConfig, SeriesConfig, SignatoriesConfig};
use anyhow::Result;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DbState {
    pub conn: Mutex<Connection>,
}

impl DbState {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = Connection::open(db_path)?;
        let state = Self {
            conn: Mutex::new(conn),
        };
        state.init_tables()?;
        state.seed_defaults()?;
        Ok(state)
    }

    fn init_tables(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "CREATE TABLE IF NOT EXISTS clients (
                code TEXT PRIMARY KEY,
                json_data TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS series_config (
                client_code TEXT NOT NULL,
                form_type TEXT NOT NULL,
                current_number INTEGER NOT NULL DEFAULT 1,
                prefix TEXT NOT NULL DEFAULT '',
                digit_count INTEGER NOT NULL DEFAULT 5,
                PRIMARY KEY (client_code, form_type)
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS signatories (
                client_code TEXT PRIMARY KEY,
                prepared_by_name TEXT NOT NULL DEFAULT '',
                prepared_by_pos TEXT NOT NULL DEFAULT '',
                reviewed_by_name TEXT NOT NULL DEFAULT '',
                reviewed_by_pos TEXT NOT NULL DEFAULT '',
                approved_by_name TEXT NOT NULL DEFAULT '',
                approved_by_pos TEXT NOT NULL DEFAULT '',
                received_by_name TEXT NOT NULL DEFAULT '',
                received_by_pos TEXT NOT NULL DEFAULT '',
                checked_by_name TEXT NOT NULL DEFAULT '',
                checked_by_pos TEXT NOT NULL DEFAULT '',
                recommending_name TEXT NOT NULL DEFAULT '',
                recommending_pos TEXT NOT NULL DEFAULT ''
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        Ok(())
    }

    fn seed_defaults(&self) -> Result<()> {
        let default_clients = vec![
            ClientProfile {
                id: "bradwell".to_string(),
                code: "BRADWELL".to_string(),
                name: "Bradwell Sales and Marketing Corp.".to_string(),
                address: "178-B5. E. Rodriguez Jr. Ave., Bagumbayan, Quezon City".to_string(),
                contact_number: "(02) 8635-0000".to_string(),
                website: "".to_string(),
                tin: "009-421-884-000".to_string(),
                sub_companies: vec![
                    "Bradwell Sales and Marketing Corp.".to_string(),
                    "Mapleway International Distributions Corp.".to_string(),
                    "StoneBridge Materials Corp.".to_string(),
                ],
                enabled_forms: vec!["CV".to_string()],
                logo_url: None,
                layout_config: LayoutConfig {
                    custom_title: Some("CHECK VOUCHER".to_string()),
                    signatory_columns: 4,
                    ..Default::default()
                },
            },
        ];

        let conn = self.conn.lock().unwrap();
        for client in default_clients {
            let exists: i64 = conn.query_row(
                "SELECT COUNT(*) FROM clients WHERE code = ?1",
                params![client.code],
                |row| row.get(0),
            )?;

            if exists == 0 {
                let json = serde_json::to_string(&client)?;
                conn.execute(
                    "INSERT INTO clients (code, json_data) VALUES (?1, ?2)",
                    params![client.code, json],
                )?;

                for form in &client.enabled_forms {
                    conn.execute(
                        "INSERT OR IGNORE INTO series_config (client_code, form_type, current_number, prefix, digit_count)
                         VALUES (?1, ?2, 1, '', 5)",
                        params![client.code, form],
                    )?;
                }

                conn.execute(
                    "INSERT OR IGNORE INTO signatories (
                        client_code,
                        prepared_by_name, prepared_by_pos,
                        checked_by_name, checked_by_pos,
                        reviewed_by_name, reviewed_by_pos,
                        approved_by_name, approved_by_pos,
                        recommending_name, recommending_pos,
                        received_by_name, received_by_pos
                    ) VALUES (?1, 'MAKVY', 'Accounting Staff', '', 'Accounting Supervisor', '', '', '', 'President / GM', '', 'Internal Auditor', '', '')",
                    params![client.code],
                )?;
            } else {
                // Ensure the 3 default companies are present in existing DB record
                if let Ok(existing_json) = conn.query_row::<String, _, _>(
                    "SELECT json_data FROM clients WHERE code = ?1",
                    params![client.code],
                    |row| row.get(0),
                ) {
                    if let Ok(mut existing_profile) = serde_json::from_str::<ClientProfile>(&existing_json) {
                        if existing_profile.sub_companies.len() < 3 {
                            existing_profile.sub_companies = client.sub_companies.clone();
                            if let Ok(updated_json) = serde_json::to_string(&existing_profile) {
                                let _ = conn.execute(
                                    "UPDATE clients SET json_data = ?1 WHERE code = ?2",
                                    params![updated_json, client.code],
                                );
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }

    pub fn get_all_clients(&self) -> Result<Vec<ClientProfile>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT json_data FROM clients ORDER BY code ASC")?;
        let rows = stmt.query_map([], |row| {
            let s: String = row.get(0)?;
            Ok(s)
        })?;

        let mut list = Vec::new();
        for r in rows {
            let s = r?;
            if let Ok(profile) = serde_json::from_str::<ClientProfile>(&s) {
                list.push(profile);
            }
        }
        Ok(list)
    }

    pub fn save_client(&self, profile: &ClientProfile) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let json = serde_json::to_string(profile)?;
        conn.execute(
            "INSERT OR REPLACE INTO clients (code, json_data) VALUES (?1, ?2)",
            params![profile.code, json],
        )?;
        Ok(())
    }

    pub fn get_series(&self, client_code: &str, form_type: &str) -> Result<SeriesConfig> {
        let conn = self.conn.lock().unwrap();
        let res = conn.query_row(
            "SELECT client_code, form_type, current_number, prefix, digit_count
             FROM series_config WHERE client_code = ?1 AND form_type = ?2",
            params![client_code, form_type],
            |row| {
                Ok(SeriesConfig {
                    client_code: row.get(0)?,
                    form_type: row.get(1)?,
                    current_number: row.get(2)?,
                    prefix: row.get(3)?,
                    digit_count: row.get(4)?,
                })
            },
        );

        match res {
            Ok(cfg) => Ok(cfg),
            Err(_) => {
                let cfg = SeriesConfig {
                    client_code: client_code.to_string(),
                    form_type: form_type.to_string(),
                    current_number: 1,
                    prefix: "".to_string(),
                    digit_count: 5,
                };
                conn.execute(
                    "INSERT OR IGNORE INTO series_config (client_code, form_type, current_number, prefix, digit_count)
                     VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![
                        cfg.client_code,
                        cfg.form_type,
                        cfg.current_number,
                        cfg.prefix,
                        cfg.digit_count
                    ],
                )?;
                Ok(cfg)
            }
        }
    }

    pub fn update_series(&self, cfg: &SeriesConfig) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO series_config (client_code, form_type, current_number, prefix, digit_count)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                cfg.client_code,
                cfg.form_type,
                cfg.current_number,
                cfg.prefix,
                cfg.digit_count
            ],
        )?;
        Ok(())
    }

    pub fn get_signatories(&self, client_code: &str) -> Result<SignatoriesConfig> {
        let conn = self.conn.lock().unwrap();
        let res = conn.query_row(
            "SELECT client_code, prepared_by_name, prepared_by_pos, reviewed_by_name, reviewed_by_pos,
                    approved_by_name, approved_by_pos, received_by_name, received_by_pos,
                    checked_by_name, checked_by_pos, recommending_name, recommending_pos
             FROM signatories WHERE client_code = ?1",
            params![client_code],
            |row| {
                Ok(SignatoriesConfig {
                    client_code: row.get(0)?,
                    prepared_by_name: row.get(1)?,
                    prepared_by_pos: row.get(2)?,
                    reviewed_by_name: row.get(3)?,
                    reviewed_by_pos: row.get(4)?,
                    approved_by_name: row.get(5)?,
                    approved_by_pos: row.get(6)?,
                    received_by_name: row.get(7)?,
                    received_by_pos: row.get(8)?,
                    checked_by_name: row.get(9)?,
                    checked_by_pos: row.get(10)?,
                    recommending_name: row.get(11)?,
                    recommending_pos: row.get(12)?,
                })
            },
        );

        match res {
            Ok(sig) => Ok(sig),
            Err(_) => Ok(SignatoriesConfig {
                client_code: client_code.to_string(),
                prepared_by_name: "MAKVY".to_string(),
                ..Default::default()
            }),
        }
    }

    pub fn save_signatories(&self, sig: &SignatoriesConfig) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO signatories (
                client_code, prepared_by_name, prepared_by_pos, reviewed_by_name, reviewed_by_pos,
                approved_by_name, approved_by_pos, received_by_name, received_by_pos,
                checked_by_name, checked_by_pos, recommending_name, recommending_pos
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                sig.client_code,
                sig.prepared_by_name,
                sig.prepared_by_pos,
                sig.reviewed_by_name,
                sig.reviewed_by_pos,
                sig.approved_by_name,
                sig.approved_by_pos,
                sig.received_by_name,
                sig.received_by_pos,
                sig.checked_by_name,
                sig.checked_by_pos,
                sig.recommending_name,
                sig.recommending_pos
            ],
        )?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str, default_val: &str) -> Result<String> {
        let conn = self.conn.lock().unwrap();
        let res = conn.query_row(
            "SELECT value FROM app_settings WHERE key = ?1",
            params![key],
            |row| row.get(0),
        );
        match res {
            Ok(val) => Ok(val),
            Err(_) => Ok(default_val.to_string()),
        }
    }

    pub fn set_setting(&self, key: &str, val: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?1, ?2)",
            params![key, val],
        )?;
        Ok(())
    }
}

