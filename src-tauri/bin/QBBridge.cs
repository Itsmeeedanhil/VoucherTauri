using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Xml;

[assembly: AssemblyTitle("VoucherPRO QuickBooks Bridge")]
[assembly: AssemblyDescription("QuickBooks Desktop Connector for VoucherPRO")]
[assembly: AssemblyCompany("VoucherPRO")]
[assembly: AssemblyProduct("VoucherPRO")]
[assembly: AssemblyCopyright("Copyright (c) 2026 VoucherPRO")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]
[assembly: ComVisible(false)]

namespace QBBridge
{
    public class LineItemDto
    {
        public string account_number = "";
        public string account_name = "";
        public string class_name = "";
        public string customer_job = "";
        public string memo = "";
        public double debit = 0.0;
        public double credit = 0.0;
        public double quantity = 0.0;
        public double unit_cost = 0.0;
        public string item_name = "";
    }

    public class BillCreditDto
    {
        public string credit_ref_number = "";
        public double applied_amount = 0.0;
        public string account_name = "";
        public string class_name = "";
        public string memo = "";
    }

    public class BridgeResponse
    {
        public bool success = false;
        public string error = "";
        public string ref_number = "";
        public string date = "";
        public string due_date = "";
        public string payee_name = "";
        public string payee_address = "";
        public string bank_account = "";
        public string ap_account = "";
        public string tin = "";
        public string payee_zip = "";
        public string payor_name = "";
        public string payor_address = "";
        public string payor_tin = "";
        public string payor_zip = "";
        public string po_number = "";
        public string memo = "";
        public double total_amount = 0.0;
        public List<LineItemDto> line_items = new List<LineItemDto>();
        public List<BillCreditDto> bill_credits = new List<BillCreditDto>();
    }

    public class ItemAccountInfo
    {
        public string AccountFullName = "";
        public string AccountLeafName = "";
        public string AccountNumber = "";
    }

    /// <summary>
    /// Connects directly to QuickBooks Desktop's built-in QBXMLRP2.RequestProcessor COM server
    /// via late-binding so no separate QBFC16 installer is required on client machines.
    /// </summary>
    public class QbXmlSession : IDisposable
    {
        private object _rp = null;
        private Type _rpType = null;
        private string _ticket = null;
        private bool _connOpen = false;

        public void Open(string appName)
        {
            string[] progIds = new string[]
            {
                "QBXMLRP2.RequestProcessor.2",
                "QBXMLRP2.RequestProcessor.1",
                "QBXMLRP2.RequestProcessor"
            };

            foreach (string progId in progIds)
            {
                _rpType = Type.GetTypeFromProgID(progId, false);
                if (_rpType != null)
                {
                    try
                    {
                        _rp = Activator.CreateInstance(_rpType);
                        if (_rp != null) break;
                    }
                    catch { _rp = null; }
                }
            }

            if (_rp == null)
            {
                throw new Exception("QuickBooks Desktop RequestProcessor (QBXMLRP2) is not registered on this PC. Make sure QuickBooks Desktop is installed.");
            }

            // localQBD = 1
            _rpType.InvokeMember(
                "OpenConnection2",
                BindingFlags.InvokeMethod,
                null,
                _rp,
                new object[] { "", appName, 1 }
            );
            _connOpen = true;

            // qbFileOpenDoNotCare = 2
            object ticketObj = _rpType.InvokeMember(
                "BeginSession",
                BindingFlags.InvokeMethod,
                null,
                _rp,
                new object[] { "", 2 }
            );
            _ticket = ticketObj != null ? ticketObj.ToString() : "";
        }

        public XmlDocument ProcessRequest(string innerRequestsXml)
        {
            string fullXml =
                "<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
                "<?qbxml version=\"13.0\"?>" +
                "<QBXML><QBXMLMsgsRq onError=\"continueOnError\">" +
                innerRequestsXml +
                "</QBXMLMsgsRq></QBXML>";

            object respObj = _rpType.InvokeMember(
                "ProcessRequest",
                BindingFlags.InvokeMethod,
                null,
                _rp,
                new object[] { _ticket, fullXml }
            );

            string respXml = respObj != null ? respObj.ToString() : "";
            XmlDocument doc = new XmlDocument();
            if (!string.IsNullOrEmpty(respXml))
            {
                doc.LoadXml(respXml);
            }
            return doc;
        }

        public void Dispose()
        {
            try
            {
                if (_rp != null && _rpType != null)
                {
                    if (!string.IsNullOrEmpty(_ticket))
                    {
                        _rpType.InvokeMember("EndSession", BindingFlags.InvokeMethod, null, _rp, new object[] { _ticket });
                        _ticket = null;
                    }
                    if (_connOpen)
                    {
                        _rpType.InvokeMember("CloseConnection", BindingFlags.InvokeMethod, null, _rp, new object[] { });
                        _connOpen = false;
                    }
                }
            }
            catch { }
        }
    }

    class Program
    {
        [STAThread]
        static int Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            if (args.Length < 2)
            {
                PrintJson(new BridgeResponse { success = false, error = "Usage: QBBridge.exe <FormType> <SearchNumber> [REF|TXN]" });
                return 1;
            }

            string txnNumber = args[1].Trim();
            string searchMode = args.Length >= 3 ? args[2].Trim().ToUpperInvariant() : "TXN";

            try
            {
                using (QbXmlSession session = new QbXmlSession())
                {
                    session.Open("VoucherPro Check Data");

                    Dictionary<string, string> acctNumById = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    Dictionary<string, string> acctNumByName = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

                    BridgeResponse resp = searchMode == "REF"
                        ? QueryByRefNumber(session, txnNumber, acctNumById, acctNumByName)
                        : QueryCheckOrBillPayment(session, txnNumber, acctNumById, acctNumByName);

                    if (resp != null && resp.success)
                    {
                        PopulateCompanyInfo(session, resp);
                    }

                    PrintJson(resp);
                    return resp.success ? 0 : 2;
                }
            }
            catch (TargetInvocationException tex)
            {
                string msg = tex.InnerException != null ? tex.InnerException.Message : tex.Message;
                PrintJson(new BridgeResponse
                {
                    success = false,
                    error = "QuickBooks SDK Error: " + msg
                });
                return 1;
            }
            catch (Exception ex)
            {
                PrintJson(new BridgeResponse
                {
                    success = false,
                    error = "QuickBooks SDK Error: " + ex.Message
                });
                return 1;
            }
        }

        static string GetNodeText(XmlNode parent, string xpath)
        {
            if (parent == null) return "";
            XmlNode n = parent.SelectSingleNode(xpath);
            return n != null && n.InnerText != null ? n.InnerText.Trim() : "";
        }

        static double GetNodeDouble(XmlNode parent, string xpath)
        {
            string s = GetNodeText(parent, xpath);
            if (string.IsNullOrEmpty(s)) return 0.0;
            double v;
            if (double.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out v))
                return v;
            return 0.0;
        }

        static string FormatQbDate(string rawDate)
        {
            if (string.IsNullOrEmpty(rawDate)) return "";
            DateTime dt;
            if (DateTime.TryParse(rawDate, CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
            {
                return dt.ToString("MM/dd/yyyy");
            }
            return rawDate;
        }

        static string EscapeXml(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace("&", "&amp;")
                    .Replace("<", "&lt;")
                    .Replace(">", "&gt;")
                    .Replace("\"", "&quot;")
                    .Replace("'", "&apos;");
        }

        static string GetLeafAccountName(string fullName)
        {
            if (string.IsNullOrEmpty(fullName)) return "";
            int idx = fullName.LastIndexOf(':');
            return idx >= 0 ? fullName.Substring(idx + 1).Trim() : fullName.Trim();
        }

        static string LookupAccountNumber(
            string listId,
            string fullName,
            Dictionary<string, string> acctNumById,
            Dictionary<string, string> acctNumByName)
        {
            if (!string.IsNullOrEmpty(listId) && acctNumById.ContainsKey(listId))
                return acctNumById[listId];
            if (!string.IsNullOrEmpty(fullName))
            {
                if (acctNumByName.ContainsKey(fullName))
                    return acctNumByName[fullName];
                string leaf = GetLeafAccountName(fullName);
                if (acctNumByName.ContainsKey(leaf))
                    return acctNumByName[leaf];
            }
            return "";
        }

        static void LoadChartOfAccounts(
            QbXmlSession session,
            Dictionary<string, string> byId,
            Dictionary<string, string> byName)
        {
            if (byId.Count > 0 || byName.Count > 0) return;
            try
            {
                XmlDocument doc = session.ProcessRequest(
                    "<AccountQueryRq>" +
                    "<ActiveStatus>All</ActiveStatus>" +
                    "<IncludeRetElement>ListID</IncludeRetElement>" +
                    "<IncludeRetElement>FullName</IncludeRetElement>" +
                    "<IncludeRetElement>AccountNumber</IncludeRetElement>" +
                    "</AccountQueryRq>"
                );
                XmlNodeList list = doc.SelectNodes("//AccountRet");
                if (list == null) return;

                foreach (XmlNode a in list)
                {
                    string num = GetNodeText(a, "AccountNumber");
                    string id = GetNodeText(a, "ListID");
                    string name = GetNodeText(a, "FullName");
                    string leaf = GetLeafAccountName(name);

                    if (!string.IsNullOrEmpty(id) && !string.IsNullOrEmpty(num))
                        byId[id] = num;
                    if (!string.IsNullOrEmpty(name) && !string.IsNullOrEmpty(num))
                        byName[name] = num;
                    if (!string.IsNullOrEmpty(leaf) && !string.IsNullOrEmpty(num) && !byName.ContainsKey(leaf))
                        byName[leaf] = num;
                }
            }
            catch { }
        }

        static void LoadSpecificItemsAccountMap(
            QbXmlSession session,
            XmlNodeList itemLines,
            Dictionary<string, string> acctNumById,
            Dictionary<string, string> acctNumByName,
            Dictionary<string, ItemAccountInfo> itemAcctMap)
        {
            if (itemLines == null || itemLines.Count == 0) return;
            try
            {
                HashSet<string> ids = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                StringBuilder sb = new StringBuilder("<ItemQueryRq>");
                foreach (XmlNode il in itemLines)
                {
                    string itemId = GetNodeText(il, "ItemRef/ListID");
                    if (!string.IsNullOrEmpty(itemId) && !ids.Contains(itemId))
                    {
                        ids.Add(itemId);
                        sb.Append("<ListID>").Append(EscapeXml(itemId)).Append("</ListID>");
                    }
                }
                sb.Append("</ItemQueryRq>");
                if (ids.Count == 0) return;

                XmlDocument doc = session.ProcessRequest(sb.ToString());
                XmlNode respNode = doc.SelectSingleNode("//ItemQueryRs");
                if (respNode == null) return;

                foreach (XmlNode it in respNode.ChildNodes)
                {
                    if (!it.Name.EndsWith("Ret")) continue;

                    string itemId = GetNodeText(it, "ListID");
                    string itemFullName = GetNodeText(it, "FullName");
                    string acctId = "";
                    string acctFullName = "";

                    XmlNode assetRef = it.SelectSingleNode("AssetAccountRef");
                    XmlNode cogsRef = it.SelectSingleNode("COGSAccountRef");
                    XmlNode spAcctRef = it.SelectSingleNode("SalesOrPurchase/AccountRef");
                    XmlNode sapExpRef = it.SelectSingleNode("SalesAndPurchase/ExpenseAccountRef");

                    XmlNode chosen = assetRef ?? spAcctRef ?? sapExpRef ?? cogsRef;
                    if (chosen != null)
                    {
                        acctId = GetNodeText(chosen, "ListID");
                        acctFullName = GetNodeText(chosen, "FullName");
                    }

                    if (!string.IsNullOrEmpty(acctFullName))
                    {
                        var info = new ItemAccountInfo
                        {
                            AccountFullName = acctFullName,
                            AccountLeafName = GetLeafAccountName(acctFullName),
                            AccountNumber = LookupAccountNumber(acctId, acctFullName, acctNumById, acctNumByName)
                        };
                        if (!string.IsNullOrEmpty(itemId)) itemAcctMap[itemId] = info;
                        if (!string.IsNullOrEmpty(itemFullName)) itemAcctMap[itemFullName] = info;
                        string itemLeaf = GetLeafAccountName(itemFullName);
                        if (!string.IsNullOrEmpty(itemLeaf) && !itemAcctMap.ContainsKey(itemLeaf))
                            itemAcctMap[itemLeaf] = info;
                    }
                }
            }
            catch { }
        }

        static List<LineItemDto> ConsolidateLines(List<LineItemDto> rawLines)
        {
            Dictionary<string, LineItemDto> grouped = new Dictionary<string, LineItemDto>(StringComparer.OrdinalIgnoreCase);
            List<string> order = new List<string>();

            foreach (var line in rawLines)
            {
                string side = line.credit > 0 && line.debit == 0 ? "CR" : "DR";
                string key = side + "|" + (line.account_number ?? "") + "|" + (line.account_name ?? "");
                if (!grouped.ContainsKey(key))
                {
                    grouped[key] = new LineItemDto
                    {
                        account_number = line.account_number ?? "",
                        account_name = line.account_name ?? "",
                        class_name = line.class_name ?? "",
                        customer_job = line.customer_job ?? "",
                        memo = line.memo ?? "",
                        debit = line.debit,
                        credit = line.credit,
                        quantity = line.quantity,
                        unit_cost = line.unit_cost,
                        item_name = line.item_name ?? ""
                    };
                    order.Add(key);
                }
                else
                {
                    grouped[key].debit += line.debit;
                    grouped[key].credit += line.credit;
                }
            }

            List<LineItemDto> debits = new List<LineItemDto>();
            List<LineItemDto> credits = new List<LineItemDto>();
            foreach (var k in order)
            {
                var item = grouped[k];
                if (item.debit > 0) debits.Add(item);
                else credits.Add(item);
            }
            debits.AddRange(credits);
            return debits;
        }

        static string GetTxnCachePath()
        {
            return Path.Combine(Path.GetTempPath(), "voucherpro_qb_txn_cache.txt");
        }

        static Dictionary<string, Tuple<string, string>> LoadTxnCache()
        {
            var map = new Dictionary<string, Tuple<string, string>>(StringComparer.OrdinalIgnoreCase);
            try
            {
                string path = GetTxnCachePath();
                if (!File.Exists(path)) return map;
                foreach (string line in File.ReadAllLines(path))
                {
                    string[] parts = line.Split('|');
                    if (parts.Length == 3 && !string.IsNullOrEmpty(parts[0]) && !string.IsNullOrEmpty(parts[2]))
                    {
                        map[parts[0]] = Tuple.Create(parts[1], parts[2]);
                    }
                }
            }
            catch { }
            return map;
        }

        static void SaveTxnCache(Dictionary<string, Tuple<string, string>> map)
        {
            try
            {
                string path = GetTxnCachePath();
                var lines = new List<string>(map.Count);
                foreach (var kv in map)
                {
                    lines.Add(kv.Key + "|" + kv.Value.Item1 + "|" + kv.Value.Item2);
                }
                File.WriteAllLines(path, lines.ToArray());
            }
            catch { }
        }

        static string BuildHeaderWindowQuery(string fromDateIso, string toDateIso)
        {
            StringBuilder dateFilter = new StringBuilder();
            if (!string.IsNullOrEmpty(fromDateIso) || !string.IsNullOrEmpty(toDateIso))
            {
                dateFilter.Append("<ModifiedDateRangeFilter>");
                if (!string.IsNullOrEmpty(fromDateIso))
                    dateFilter.Append("<FromModifiedDate>").Append(fromDateIso).Append("</FromModifiedDate>");
                if (!string.IsNullOrEmpty(toDateIso))
                    dateFilter.Append("<ToModifiedDate>").Append(toDateIso).Append("</ToModifiedDate>");
                dateFilter.Append("</ModifiedDateRangeFilter>");
            }
            string f = dateFilter.ToString();
            string cols = "<IncludeRetElement>TxnID</IncludeRetElement><IncludeRetElement>TxnNumber</IncludeRetElement>";

            return
                "<CheckQueryRq>" + f + cols + "</CheckQueryRq>" +
                "<BillPaymentCheckQueryRq>" + f + cols + "</BillPaymentCheckQueryRq>" +
                "<JournalEntryQueryRq>" + f + cols + "</JournalEntryQueryRq>";
        }

        static void IndexResponseAndMatch(
            XmlDocument indexDoc,
            string txnNumber,
            Dictionary<string, Tuple<string, string>> cache,
            ref string matchedCheckTxnId,
            ref string matchedBpTxnId,
            ref string matchedJeTxnId)
        {
            if (indexDoc == null) return;

            XmlNodeList chkList = indexDoc.SelectNodes("//CheckRet");
            if (chkList != null)
            {
                foreach (XmlNode c in chkList)
                {
                    string tNum = GetNodeText(c, "TxnNumber");
                    string tId = GetNodeText(c, "TxnID");
                    if (!string.IsNullOrEmpty(tNum) && !string.IsNullOrEmpty(tId))
                    {
                        cache[tNum] = Tuple.Create("CHK", tId);
                        if (string.Equals(tNum, txnNumber, StringComparison.OrdinalIgnoreCase))
                            matchedCheckTxnId = tId;
                    }
                }
            }

            XmlNodeList bpList = indexDoc.SelectNodes("//BillPaymentCheckRet");
            if (bpList != null)
            {
                foreach (XmlNode c in bpList)
                {
                    string tNum = GetNodeText(c, "TxnNumber");
                    string tId = GetNodeText(c, "TxnID");
                    if (!string.IsNullOrEmpty(tNum) && !string.IsNullOrEmpty(tId))
                    {
                        cache[tNum] = Tuple.Create("BP", tId);
                        if (string.IsNullOrEmpty(matchedCheckTxnId) &&
                            string.Equals(tNum, txnNumber, StringComparison.OrdinalIgnoreCase))
                            matchedBpTxnId = tId;
                    }
                }
            }

            XmlNodeList jeList = indexDoc.SelectNodes("//JournalEntryRet");
            if (jeList != null)
            {
                foreach (XmlNode c in jeList)
                {
                    string tNum = GetNodeText(c, "TxnNumber");
                    string tId = GetNodeText(c, "TxnID");
                    if (!string.IsNullOrEmpty(tNum) && !string.IsNullOrEmpty(tId))
                    {
                        cache[tNum] = Tuple.Create("JE", tId);
                        if (string.IsNullOrEmpty(matchedCheckTxnId) &&
                            string.IsNullOrEmpty(matchedBpTxnId) &&
                            string.Equals(tNum, txnNumber, StringComparison.OrdinalIgnoreCase))
                            matchedJeTxnId = tId;
                    }
                }
            }
        }

        static void ScanHeadersForTxnNumber(
            QbXmlSession session,
            string txnNumber,
            Dictionary<string, Tuple<string, string>> cache,
            ref string matchedCheckTxnId,
            ref string matchedBpTxnId,
            ref string matchedJeTxnId)
        {
            // Window A: Fast path for recent transactions (last 180 days)
            string d180 = DateTime.Now.AddDays(-180).ToString("yyyy-MM-dd");
            XmlDocument docRecent = session.ProcessRequest(BuildHeaderWindowQuery(d180, ""));
            IndexResponseAndMatch(docRecent, txnNumber, cache, ref matchedCheckTxnId, ref matchedBpTxnId, ref matchedJeTxnId);

            // Window B: Guaranteed full fallback if not found in recent window
            if (string.IsNullOrEmpty(matchedCheckTxnId) &&
                string.IsNullOrEmpty(matchedBpTxnId) &&
                string.IsNullOrEmpty(matchedJeTxnId))
            {
                XmlDocument docAll = session.ProcessRequest(BuildHeaderWindowQuery("", ""));
                IndexResponseAndMatch(docAll, txnNumber, cache, ref matchedCheckTxnId, ref matchedBpTxnId, ref matchedJeTxnId);
            }

            SaveTxnCache(cache);
        }

        static BridgeResponse QueryByRefNumber(
            QbXmlSession session,
            string refNumber,
            Dictionary<string, string> acctNumById,
            Dictionary<string, string> acctNumByName)
        {
            string escapedRef = EscapeXml(refNumber);
            string rqXml =
                "<CheckQueryRq>" +
                "<RefNumberFilter><MatchCriterion>StartsWith</MatchCriterion><RefNumber>" + escapedRef + "</RefNumber></RefNumberFilter>" +
                "<IncludeLineItems>true</IncludeLineItems>" +
                "</CheckQueryRq>" +
                "<BillPaymentCheckQueryRq>" +
                "<RefNumberFilter><MatchCriterion>StartsWith</MatchCriterion><RefNumber>" + escapedRef + "</RefNumber></RefNumberFilter>" +
                "<IncludeLineItems>true</IncludeLineItems>" +
                "</BillPaymentCheckQueryRq>" +
                "<JournalEntryQueryRq>" +
                "<RefNumberFilter><MatchCriterion>StartsWith</MatchCriterion><RefNumber>" + escapedRef + "</RefNumber></RefNumberFilter>" +
                "<IncludeLineItems>true</IncludeLineItems>" +
                "</JournalEntryQueryRq>";

            XmlDocument doc = session.ProcessRequest(rqXml);

            // 1. Check Response: Regular Check (Write Checks)
            XmlNodeList chkList = doc.SelectNodes("//CheckRet");
            if (chkList != null && chkList.Count > 0)
            {
                XmlNode chk = null;
                foreach (XmlNode candidate in chkList)
                {
                    if (string.Equals(GetNodeText(candidate, "RefNumber"), refNumber, StringComparison.OrdinalIgnoreCase))
                    {
                        chk = candidate;
                        break;
                    }
                }
                if (chk == null) chk = chkList[0];

                LoadChartOfAccounts(session, acctNumById, acctNumByName);

                BridgeResponse br = new BridgeResponse { success = true };
                string foundRef = GetNodeText(chk, "RefNumber");
                br.ref_number = !string.IsNullOrEmpty(foundRef) ? foundRef : refNumber;
                br.date = FormatQbDate(GetNodeText(chk, "TxnDate"));
                br.payee_name = GetNodeText(chk, "PayeeEntityRef/FullName");
                XmlNode addrNode = chk.SelectSingleNode("Address");
                br.payee_address = ExtractAddress(addrNode);
                br.payee_zip = GetNodeText(addrNode, "PostalCode");
                string payeeListId = GetNodeText(chk, "PayeeEntityRef/ListID");
                QueryVendorDetails(session, payeeListId, br.payee_name, br);

                string bankFullName = GetNodeText(chk, "AccountRef/FullName");
                string bankListId = GetNodeText(chk, "AccountRef/ListID");
                string bankLeafName = GetLeafAccountName(bankFullName);
                string bankAcctNum = LookupAccountNumber(bankListId, bankFullName, acctNumById, acctNumByName);

                br.bank_account = bankLeafName;
                br.memo = GetNodeText(chk, "Memo");
                br.total_amount = GetNodeDouble(chk, "Amount");

                List<LineItemDto> rawLines = new List<LineItemDto>();

                XmlNodeList expLines = chk.SelectNodes("ExpenseLineRet");
                if (expLines != null)
                {
                    foreach (XmlNode exp in expLines)
                    {
                        string accName = GetNodeText(exp, "AccountRef/FullName");
                        string accId = GetNodeText(exp, "AccountRef/ListID");
                        string accNum = LookupAccountNumber(accId, accName, acctNumById, acctNumByName);
                        double amt = GetNodeDouble(exp, "Amount");

                        rawLines.Add(new LineItemDto
                        {
                            account_number = accNum,
                            account_name = GetLeafAccountName(accName),
                            class_name = GetNodeText(exp, "ClassRef/FullName"),
                            customer_job = GetNodeText(exp, "CustomerRef/FullName"),
                            memo = GetNodeText(exp, "Memo"),
                            debit = amt >= 0 ? amt : 0.0,
                            credit = amt < 0 ? Math.Abs(amt) : 0.0
                        });
                    }
                }

                XmlNodeList itemLines = chk.SelectNodes("ItemLineRet");
                if (itemLines != null && itemLines.Count > 0)
                {
                    Dictionary<string, ItemAccountInfo> itemAcctMap = new Dictionary<string, ItemAccountInfo>(StringComparer.OrdinalIgnoreCase);
                    LoadSpecificItemsAccountMap(session, itemLines, acctNumById, acctNumByName, itemAcctMap);

                    foreach (XmlNode il in itemLines)
                    {
                        string itemId = GetNodeText(il, "ItemRef/ListID");
                        string itemName = GetNodeText(il, "ItemRef/FullName");
                        double amt = GetNodeDouble(il, "Amount");

                        string resolvedAcctName = GetLeafAccountName(itemName);
                        string resolvedAcctNum = "";
                        if (!string.IsNullOrEmpty(itemId) && itemAcctMap.ContainsKey(itemId))
                        {
                            resolvedAcctName = itemAcctMap[itemId].AccountLeafName;
                            resolvedAcctNum = itemAcctMap[itemId].AccountNumber;
                        }
                        else if (!string.IsNullOrEmpty(itemName) && itemAcctMap.ContainsKey(itemName))
                        {
                            resolvedAcctName = itemAcctMap[itemName].AccountLeafName;
                            resolvedAcctNum = itemAcctMap[itemName].AccountNumber;
                        }

                        rawLines.Add(new LineItemDto
                        {
                            account_number = resolvedAcctNum,
                            account_name = resolvedAcctName,
                            class_name = GetNodeText(il, "ClassRef/FullName"),
                            customer_job = GetNodeText(il, "CustomerRef/FullName"),
                            memo = GetNodeText(il, "Desc"),
                            debit = amt >= 0 ? amt : 0.0,
                            credit = amt < 0 ? Math.Abs(amt) : 0.0,
                            quantity = GetNodeDouble(il, "Quantity"),
                            unit_cost = GetNodeDouble(il, "Cost"),
                            item_name = itemName
                        });
                    }
                }

                rawLines.Add(new LineItemDto
                {
                    account_number = bankAcctNum,
                    account_name = !string.IsNullOrEmpty(bankLeafName) ? bankLeafName : "Cash in Bank",
                    memo = br.memo,
                    debit = 0.0,
                    credit = br.total_amount
                });

                br.line_items = ConsolidateLines(rawLines);
                return br;
            }

            // 2. Bill Payment Check (Pay Bills)
            XmlNodeList bpList = doc.SelectNodes("//BillPaymentCheckRet");
            if (bpList != null && bpList.Count > 0)
            {
                XmlNode bp = null;
                foreach (XmlNode candidate in bpList)
                {
                    if (string.Equals(GetNodeText(candidate, "RefNumber"), refNumber, StringComparison.OrdinalIgnoreCase))
                    {
                        bp = candidate;
                        break;
                    }
                }
                if (bp == null) bp = bpList[0];

                LoadChartOfAccounts(session, acctNumById, acctNumByName);

                BridgeResponse br = new BridgeResponse { success = true };
                string foundRef = GetNodeText(bp, "RefNumber");
                br.ref_number = !string.IsNullOrEmpty(foundRef) ? foundRef : refNumber;
                br.date = FormatQbDate(GetNodeText(bp, "TxnDate"));
                br.payee_name = GetNodeText(bp, "PayeeEntityRef/FullName");
                XmlNode addrNode = bp.SelectSingleNode("Address");
                br.payee_address = ExtractAddress(addrNode);
                br.payee_zip = GetNodeText(addrNode, "PostalCode");
                string payeeListId = GetNodeText(bp, "PayeeEntityRef/ListID");
                QueryVendorDetails(session, payeeListId, br.payee_name, br);

                string bankFullName = GetNodeText(bp, "BankAccountRef/FullName");
                string bankListId = GetNodeText(bp, "BankAccountRef/ListID");
                string bankLeafName = GetLeafAccountName(bankFullName);
                string bankAcctNum = LookupAccountNumber(bankListId, bankFullName, acctNumById, acctNumByName);

                string headerApFullName = GetNodeText(bp, "APAccountRef/FullName");
                if (string.IsNullOrEmpty(headerApFullName)) headerApFullName = "Accounts Payable";
                string headerApListId = GetNodeText(bp, "APAccountRef/ListID");
                string headerApLeafName = GetLeafAccountName(headerApFullName);
                string headerApAcctNum = LookupAccountNumber(headerApListId, headerApFullName, acctNumById, acctNumByName);

                br.bank_account = bankLeafName;
                br.ap_account = headerApLeafName;
                br.memo = GetNodeText(bp, "Memo");
                br.total_amount = GetNodeDouble(bp, "Amount");

                List<LineItemDto> rawLines = new List<LineItemDto>();
                List<string> billMemos = new List<string>();

                XmlNodeList appliedList = bp.SelectNodes("AppliedToTxnRet");
                if (appliedList != null && appliedList.Count > 0)
                {
                    Dictionary<string, Tuple<string, string, string>> billInfoByTxnId = QueryAppliedBills(session, appliedList, acctNumById, acctNumByName);

                    foreach (XmlNode app in appliedList)
                    {
                        string txnId = GetNodeText(app, "TxnID");
                        string billRef = GetNodeText(app, "RefNumber");

                        if (!string.IsNullOrEmpty(txnId) && billInfoByTxnId.ContainsKey(txnId))
                        {
                            var info = billInfoByTxnId[txnId];
                            if (!string.IsNullOrEmpty(info.Item1)) headerApLeafName = info.Item1;
                            if (!string.IsNullOrEmpty(info.Item2)) headerApAcctNum = info.Item2;
                            if (!string.IsNullOrEmpty(info.Item3)) billMemos.Add(info.Item3);
                        }
                        else if (!string.IsNullOrEmpty(billRef) && string.IsNullOrEmpty(br.memo))
                        {
                            billMemos.Add("Bill #" + billRef);
                        }
                    }
                }

                if (string.IsNullOrEmpty(br.memo) && billMemos.Count > 0)
                {
                    br.memo = string.Join("; ", billMemos.ToArray());
                }

                rawLines.Add(new LineItemDto
                {
                    account_number = headerApAcctNum,
                    account_name = !string.IsNullOrEmpty(headerApLeafName) ? headerApLeafName : "Accounts Payable",
                    memo = br.memo,
                    debit = br.total_amount,
                    credit = 0.0
                });

                rawLines.Add(new LineItemDto
                {
                    account_number = bankAcctNum,
                    account_name = !string.IsNullOrEmpty(bankLeafName) ? bankLeafName : "Cash in Bank",
                    memo = br.memo,
                    debit = 0.0,
                    credit = br.total_amount
                });

                br.line_items = ConsolidateLines(rawLines);
                return br;
            }

            // 3. General Journal Entry (Make General Journal Entries)
            XmlNodeList jeList = doc.SelectNodes("//JournalEntryRet");
            if (jeList != null && jeList.Count > 0)
            {
                XmlNode je = null;
                foreach (XmlNode candidate in jeList)
                {
                    if (string.Equals(GetNodeText(candidate, "RefNumber"), refNumber, StringComparison.OrdinalIgnoreCase))
                    {
                        je = candidate;
                        break;
                    }
                }
                if (je == null) je = jeList[0];

                LoadChartOfAccounts(session, acctNumById, acctNumByName);

                BridgeResponse br = new BridgeResponse { success = true };
                string foundRef = GetNodeText(je, "RefNumber");
                br.ref_number = !string.IsNullOrEmpty(foundRef) ? foundRef : refNumber;
                br.date = FormatQbDate(GetNodeText(je, "TxnDate"));
                br.memo = GetNodeText(je, "Memo");

                List<LineItemDto> rawLines = new List<LineItemDto>();
                string firstEntityId = "";
                string firstEntityName = "";
                double totalDebit = 0.0;

                foreach (XmlNode child in je.ChildNodes)
                {
                    bool isDebit = string.Equals(child.Name, "JournalDebitLine", StringComparison.OrdinalIgnoreCase);
                    bool isCredit = string.Equals(child.Name, "JournalCreditLine", StringComparison.OrdinalIgnoreCase);
                    if (!isDebit && !isCredit) continue;

                    string accFull = GetNodeText(child, "AccountRef/FullName");
                    string accId = GetNodeText(child, "AccountRef/ListID");
                    string accLeaf = GetLeafAccountName(accFull);
                    string accNum = LookupAccountNumber(accId, accFull, acctNumById, acctNumByName);
                    double amt = GetNodeDouble(child, "Amount");
                    string lineMemo = GetNodeText(child, "Memo");

                    if (string.IsNullOrEmpty(br.memo) && !string.IsNullOrEmpty(lineMemo))
                    {
                        br.memo = lineMemo;
                    }

                    string entName = GetNodeText(child, "EntityRef/FullName");
                    string entId = GetNodeText(child, "EntityRef/ListID");
                    if (string.IsNullOrEmpty(firstEntityName) && !string.IsNullOrEmpty(entName))
                    {
                        firstEntityName = entName;
                        firstEntityId = entId;
                    }

                    if (isDebit) totalDebit += amt;

                    rawLines.Add(new LineItemDto
                    {
                        account_number = accNum,
                        account_name = accLeaf,
                        class_name = GetNodeText(child, "ClassRef/FullName"),
                        memo = lineMemo,
                        debit = isDebit ? amt : 0.0,
                        credit = isCredit ? amt : 0.0
                    });
                }

                br.payee_name = firstEntityName;
                if (!string.IsNullOrEmpty(firstEntityId) || !string.IsNullOrEmpty(firstEntityName))
                {
                    QueryVendorDetails(session, firstEntityId, firstEntityName, br);
                }
                br.total_amount = totalDebit;
                br.line_items = ConsolidateLines(rawLines);
                return br;
            }

            return new BridgeResponse
            {
                success = false,
                error = "Check Reference Number '" + refNumber + "' not found in QuickBooks."
            };
        }

        static BridgeResponse QueryCheckOrBillPayment(
            QbXmlSession session,
            string txnNumber,
            Dictionary<string, string> acctNumById,
            Dictionary<string, string> acctNumByName)
        {
            string matchedCheckTxnId = "";
            string matchedBpTxnId = "";
            string matchedJeTxnId = "";
            bool fromCache = false;

            // Step 0: Check local TxnNumber -> TxnID cache first
            Dictionary<string, Tuple<string, string>> cache = LoadTxnCache();
            if (cache.ContainsKey(txnNumber))
            {
                var cached = cache[txnNumber];
                fromCache = true;
                if (cached.Item1 == "CHK") matchedCheckTxnId = cached.Item2;
                else if (cached.Item1 == "BP") matchedBpTxnId = cached.Item2;
                else if (cached.Item1 == "JE") matchedJeTxnId = cached.Item2;
            }

            // Step 1: If not in cache, scan headers (recent 180 days first, then full fallback)
            if (string.IsNullOrEmpty(matchedCheckTxnId) &&
                string.IsNullOrEmpty(matchedBpTxnId) &&
                string.IsNullOrEmpty(matchedJeTxnId))
            {
                ScanHeadersForTxnNumber(session, txnNumber, cache, ref matchedCheckTxnId, ref matchedBpTxnId, ref matchedJeTxnId);
            }

            for (int attempt = 0; attempt < 2; attempt++)
            {
                // 1. Check Response: Regular Check (Write Checks)
                if (!string.IsNullOrEmpty(matchedCheckTxnId))
                {
                    XmlDocument doc = session.ProcessRequest(
                        "<CheckQueryRq>" +
                        "<TxnID>" + EscapeXml(matchedCheckTxnId) + "</TxnID>" +
                        "<IncludeLineItems>true</IncludeLineItems>" +
                        "</CheckQueryRq>"
                    );
                    XmlNode chk = doc.SelectSingleNode("//CheckRet");
                    if (chk != null && string.Equals(GetNodeText(chk, "TxnNumber"), txnNumber, StringComparison.OrdinalIgnoreCase))
                    {
                        LoadChartOfAccounts(session, acctNumById, acctNumByName);

                        BridgeResponse br = new BridgeResponse { success = true };
                        br.ref_number = GetNodeText(chk, "RefNumber");
                        br.date = FormatQbDate(GetNodeText(chk, "TxnDate"));
                        br.payee_name = GetNodeText(chk, "PayeeEntityRef/FullName");
                        XmlNode addrNode = chk.SelectSingleNode("Address");
                        br.payee_address = ExtractAddress(addrNode);
                        br.payee_zip = GetNodeText(addrNode, "PostalCode");
                        string payeeListId = GetNodeText(chk, "PayeeEntityRef/ListID");
                        QueryVendorDetails(session, payeeListId, br.payee_name, br);

                        string bankFullName = GetNodeText(chk, "AccountRef/FullName");
                        string bankListId = GetNodeText(chk, "AccountRef/ListID");
                        string bankLeafName = GetLeafAccountName(bankFullName);
                        string bankAcctNum = LookupAccountNumber(bankListId, bankFullName, acctNumById, acctNumByName);

                        br.bank_account = bankLeafName;
                        br.memo = GetNodeText(chk, "Memo");
                        br.total_amount = GetNodeDouble(chk, "Amount");

                        List<LineItemDto> rawLines = new List<LineItemDto>();

                        XmlNodeList expLines = chk.SelectNodes("ExpenseLineRet");
                        if (expLines != null)
                        {
                            foreach (XmlNode exp in expLines)
                            {
                                string accName = GetNodeText(exp, "AccountRef/FullName");
                                string accId = GetNodeText(exp, "AccountRef/ListID");
                                string accNum = LookupAccountNumber(accId, accName, acctNumById, acctNumByName);
                                double amt = GetNodeDouble(exp, "Amount");

                                rawLines.Add(new LineItemDto
                                {
                                    account_number = accNum,
                                    account_name = GetLeafAccountName(accName),
                                    class_name = GetNodeText(exp, "ClassRef/FullName"),
                                    customer_job = GetNodeText(exp, "CustomerRef/FullName"),
                                    memo = GetNodeText(exp, "Memo"),
                                    debit = amt >= 0 ? amt : 0.0,
                                    credit = amt < 0 ? Math.Abs(amt) : 0.0
                                });
                            }
                        }

                        XmlNodeList itemLines = chk.SelectNodes("ItemLineRet");
                        if (itemLines != null && itemLines.Count > 0)
                        {
                            Dictionary<string, ItemAccountInfo> itemAcctMap = new Dictionary<string, ItemAccountInfo>(StringComparer.OrdinalIgnoreCase);
                            LoadSpecificItemsAccountMap(session, itemLines, acctNumById, acctNumByName, itemAcctMap);

                            foreach (XmlNode il in itemLines)
                            {
                                string itemId = GetNodeText(il, "ItemRef/ListID");
                                string itemName = GetNodeText(il, "ItemRef/FullName");
                                double amt = GetNodeDouble(il, "Amount");

                                string resolvedAcctName = GetLeafAccountName(itemName);
                                string resolvedAcctNum = "";
                                if (!string.IsNullOrEmpty(itemId) && itemAcctMap.ContainsKey(itemId))
                                {
                                    resolvedAcctName = itemAcctMap[itemId].AccountLeafName;
                                    resolvedAcctNum = itemAcctMap[itemId].AccountNumber;
                                }
                                else if (!string.IsNullOrEmpty(itemName) && itemAcctMap.ContainsKey(itemName))
                                {
                                    resolvedAcctName = itemAcctMap[itemName].AccountLeafName;
                                    resolvedAcctNum = itemAcctMap[itemName].AccountNumber;
                                }

                                rawLines.Add(new LineItemDto
                                {
                                    account_number = resolvedAcctNum,
                                    account_name = resolvedAcctName,
                                    class_name = GetNodeText(il, "ClassRef/FullName"),
                                    customer_job = GetNodeText(il, "CustomerRef/FullName"),
                                    memo = GetNodeText(il, "Desc"),
                                    debit = amt >= 0 ? amt : 0.0,
                                    credit = amt < 0 ? Math.Abs(amt) : 0.0,
                                    quantity = GetNodeDouble(il, "Quantity"),
                                    unit_cost = GetNodeDouble(il, "Cost"),
                                    item_name = itemName
                                });
                            }
                        }

                        rawLines.Add(new LineItemDto
                        {
                            account_number = bankAcctNum,
                            account_name = !string.IsNullOrEmpty(bankLeafName) ? bankLeafName : "Cash in Bank",
                            memo = br.memo,
                            debit = 0.0,
                            credit = br.total_amount
                        });

                        br.line_items = ConsolidateLines(rawLines);
                        return br;
                    }
                }

                // 2. Bill Payment Check (Pay Bills)
                if (!string.IsNullOrEmpty(matchedBpTxnId))
                {
                    XmlDocument doc = session.ProcessRequest(
                        "<BillPaymentCheckQueryRq>" +
                        "<TxnID>" + EscapeXml(matchedBpTxnId) + "</TxnID>" +
                        "<IncludeLineItems>true</IncludeLineItems>" +
                        "</BillPaymentCheckQueryRq>"
                    );
                    XmlNode bp = doc.SelectSingleNode("//BillPaymentCheckRet");
                    if (bp != null && string.Equals(GetNodeText(bp, "TxnNumber"), txnNumber, StringComparison.OrdinalIgnoreCase))
                    {
                        LoadChartOfAccounts(session, acctNumById, acctNumByName);

                        BridgeResponse br = new BridgeResponse { success = true };
                        br.ref_number = GetNodeText(bp, "RefNumber");
                        br.date = FormatQbDate(GetNodeText(bp, "TxnDate"));
                        br.payee_name = GetNodeText(bp, "PayeeEntityRef/FullName");
                        XmlNode addrNode = bp.SelectSingleNode("Address");
                        br.payee_address = ExtractAddress(addrNode);
                        br.payee_zip = GetNodeText(addrNode, "PostalCode");
                        string payeeListId = GetNodeText(bp, "PayeeEntityRef/ListID");
                        QueryVendorDetails(session, payeeListId, br.payee_name, br);

                        string bankFullName = GetNodeText(bp, "BankAccountRef/FullName");
                        string bankListId = GetNodeText(bp, "BankAccountRef/ListID");
                        string bankLeafName = GetLeafAccountName(bankFullName);
                        string bankAcctNum = LookupAccountNumber(bankListId, bankFullName, acctNumById, acctNumByName);

                        string headerApFullName = GetNodeText(bp, "APAccountRef/FullName");
                        if (string.IsNullOrEmpty(headerApFullName)) headerApFullName = "Accounts Payable";
                        string headerApListId = GetNodeText(bp, "APAccountRef/ListID");
                        string headerApLeafName = GetLeafAccountName(headerApFullName);
                        string headerApAcctNum = LookupAccountNumber(headerApListId, headerApFullName, acctNumById, acctNumByName);

                        br.bank_account = bankLeafName;
                        br.ap_account = headerApLeafName;
                        br.memo = GetNodeText(bp, "Memo");
                        br.total_amount = GetNodeDouble(bp, "Amount");

                        List<LineItemDto> rawLines = new List<LineItemDto>();
                        List<string> billMemos = new List<string>();

                        XmlNodeList appliedList = bp.SelectNodes("AppliedToTxnRet");
                        if (appliedList != null && appliedList.Count > 0)
                        {
                            Dictionary<string, Tuple<string, string, string>> billInfoByTxnId = QueryAppliedBills(session, appliedList, acctNumById, acctNumByName);

                            foreach (XmlNode app in appliedList)
                            {
                                string txnId = GetNodeText(app, "TxnID");
                                string billRef = GetNodeText(app, "RefNumber");

                                if (!string.IsNullOrEmpty(txnId) && billInfoByTxnId.ContainsKey(txnId))
                                {
                                    var info = billInfoByTxnId[txnId];
                                    if (!string.IsNullOrEmpty(info.Item1)) headerApLeafName = info.Item1;
                                    if (!string.IsNullOrEmpty(info.Item2)) headerApAcctNum = info.Item2;
                                    if (!string.IsNullOrEmpty(info.Item3)) billMemos.Add(info.Item3);
                                }
                                else if (!string.IsNullOrEmpty(billRef) && string.IsNullOrEmpty(br.memo))
                                {
                                    billMemos.Add("Bill #" + billRef);
                                }
                            }
                        }

                        if (string.IsNullOrEmpty(br.memo) && billMemos.Count > 0)
                        {
                            br.memo = string.Join("; ", billMemos.ToArray());
                        }

                        rawLines.Add(new LineItemDto
                        {
                            account_number = headerApAcctNum,
                            account_name = !string.IsNullOrEmpty(headerApLeafName) ? headerApLeafName : "Accounts Payable",
                            memo = br.memo,
                            debit = br.total_amount,
                            credit = 0.0
                        });

                        rawLines.Add(new LineItemDto
                        {
                            account_number = bankAcctNum,
                            account_name = !string.IsNullOrEmpty(bankLeafName) ? bankLeafName : "Cash in Bank",
                            memo = br.memo,
                            debit = 0.0,
                            credit = br.total_amount
                        });

                        br.line_items = ConsolidateLines(rawLines);
                        return br;
                    }
                }

                // 3. General Journal Entry (Make General Journal Entries)
                if (!string.IsNullOrEmpty(matchedJeTxnId))
                {
                    XmlDocument doc = session.ProcessRequest(
                        "<JournalEntryQueryRq>" +
                        "<TxnID>" + EscapeXml(matchedJeTxnId) + "</TxnID>" +
                        "<IncludeLineItems>true</IncludeLineItems>" +
                        "</JournalEntryQueryRq>"
                    );
                    XmlNode je = doc.SelectSingleNode("//JournalEntryRet");
                    if (je != null && string.Equals(GetNodeText(je, "TxnNumber"), txnNumber, StringComparison.OrdinalIgnoreCase))
                    {
                        LoadChartOfAccounts(session, acctNumById, acctNumByName);

                        BridgeResponse br = new BridgeResponse { success = true };
                        br.ref_number = GetNodeText(je, "RefNumber");
                        br.date = FormatQbDate(GetNodeText(je, "TxnDate"));
                        br.memo = GetNodeText(je, "Memo");

                        List<LineItemDto> rawLines = new List<LineItemDto>();
                        string firstEntityId = "";
                        string firstEntityName = "";
                        double totalDebit = 0.0;

                        foreach (XmlNode child in je.ChildNodes)
                        {
                            bool isDebit = string.Equals(child.Name, "JournalDebitLine", StringComparison.OrdinalIgnoreCase);
                            bool isCredit = string.Equals(child.Name, "JournalCreditLine", StringComparison.OrdinalIgnoreCase);
                            if (!isDebit && !isCredit) continue;

                            string accFull = GetNodeText(child, "AccountRef/FullName");
                            string accId = GetNodeText(child, "AccountRef/ListID");
                            string accLeaf = GetLeafAccountName(accFull);
                            string accNum = LookupAccountNumber(accId, accFull, acctNumById, acctNumByName);
                            double amt = GetNodeDouble(child, "Amount");
                            string lineMemo = GetNodeText(child, "Memo");

                            if (string.IsNullOrEmpty(br.memo) && !string.IsNullOrEmpty(lineMemo))
                            {
                                br.memo = lineMemo;
                            }

                            string entName = GetNodeText(child, "EntityRef/FullName");
                            string entId = GetNodeText(child, "EntityRef/ListID");
                            if (string.IsNullOrEmpty(firstEntityName) && !string.IsNullOrEmpty(entName))
                            {
                                firstEntityName = entName;
                                firstEntityId = entId;
                            }

                            if (isDebit) totalDebit += amt;

                            rawLines.Add(new LineItemDto
                            {
                                account_number = accNum,
                                account_name = accLeaf,
                                class_name = GetNodeText(child, "ClassRef/FullName"),
                                memo = lineMemo,
                                debit = isDebit ? amt : 0.0,
                                credit = isCredit ? amt : 0.0
                            });
                        }

                        br.payee_name = firstEntityName;
                        if (!string.IsNullOrEmpty(firstEntityId) || !string.IsNullOrEmpty(firstEntityName))
                        {
                            QueryVendorDetails(session, firstEntityId, firstEntityName, br);
                        }
                        br.total_amount = totalDebit;
                        br.line_items = ConsolidateLines(rawLines);
                        return br;
                    }
                }

                // If cache had a stale TxnID (e.g. company file switched), rescan once
                if (!fromCache) break;
                fromCache = false;
                matchedCheckTxnId = "";
                matchedBpTxnId = "";
                matchedJeTxnId = "";
                cache.Clear();
                ScanHeadersForTxnNumber(session, txnNumber, cache, ref matchedCheckTxnId, ref matchedBpTxnId, ref matchedJeTxnId);
            }

            return new BridgeResponse
            {
                success = false,
                error = "Journal Transaction Number (Trans #) '" + txnNumber + "' not found in QuickBooks."
            };
        }

        static Dictionary<string, Tuple<string, string, string>> QueryAppliedBills(
            QbXmlSession session,
            XmlNodeList appliedList,
            Dictionary<string, string> acctNumById,
            Dictionary<string, string> acctNumByName)
        {
            var result = new Dictionary<string, Tuple<string, string, string>>(StringComparer.OrdinalIgnoreCase);
            try
            {
                StringBuilder sb = new StringBuilder("<BillQueryRq>");
                int count = 0;
                foreach (XmlNode app in appliedList)
                {
                    string txnId = GetNodeText(app, "TxnID");
                    if (!string.IsNullOrEmpty(txnId))
                    {
                        sb.Append("<TxnID>").Append(EscapeXml(txnId)).Append("</TxnID>");
                        count++;
                    }
                }
                sb.Append("</BillQueryRq>");
                if (count == 0) return result;

                XmlDocument doc = session.ProcessRequest(sb.ToString());
                XmlNodeList bills = doc.SelectNodes("//BillRet");
                if (bills != null)
                {
                    foreach (XmlNode b in bills)
                    {
                        string txnId = GetNodeText(b, "TxnID");
                        string apFull = GetNodeText(b, "APAccountRef/FullName");
                        string apId = GetNodeText(b, "APAccountRef/ListID");
                        string apLeaf = GetLeafAccountName(apFull);
                        string apNum = LookupAccountNumber(apId, apFull, acctNumById, acctNumByName);
                        string billMemo = GetNodeText(b, "Memo");
                        if (!string.IsNullOrEmpty(txnId))
                        {
                            result[txnId] = Tuple.Create(apLeaf, apNum, billMemo);
                        }
                    }
                }
            }
            catch { }
            return result;
        }

        static void PopulateCompanyInfo(QbXmlSession session, BridgeResponse br)
        {
            try
            {
                XmlDocument doc = session.ProcessRequest("<CompanyQueryRq/>");
                XmlNode comp = doc.SelectSingleNode("//CompanyRet");
                if (comp != null)
                {
                    string legalName = GetNodeText(comp, "LegalCompanyName");
                    string compName = GetNodeText(comp, "CompanyName");
                    br.payor_name = !string.IsNullOrEmpty(legalName) ? legalName : compName;
                    br.payor_tin = GetNodeText(comp, "EIN");

                    XmlNode compAddr = comp.SelectSingleNode("LegalAddress") ?? comp.SelectSingleNode("Address");
                    if (compAddr != null)
                    {
                        List<string> parts = new List<string>();
                        string a1 = GetNodeText(compAddr, "Addr1");
                        string a2 = GetNodeText(compAddr, "Addr2");
                        string a3 = GetNodeText(compAddr, "Addr3");
                        string city = GetNodeText(compAddr, "City");
                        string state = GetNodeText(compAddr, "State");
                        if (!string.IsNullOrEmpty(a1)) parts.Add(a1);
                        if (!string.IsNullOrEmpty(a2)) parts.Add(a2);
                        if (!string.IsNullOrEmpty(a3)) parts.Add(a3);
                        if (!string.IsNullOrEmpty(city)) parts.Add(city);
                        if (!string.IsNullOrEmpty(state)) parts.Add(state);
                        br.payor_address = string.Join(", ", parts.ToArray());
                        br.payor_zip = GetNodeText(compAddr, "PostalCode");
                    }
                }
            }
            catch { }
        }

        static void QueryVendorDetails(QbXmlSession session, string listId, string fullName, BridgeResponse br)
        {
            try
            {
                if (string.IsNullOrEmpty(listId) && string.IsNullOrEmpty(fullName)) return;
                string filter = !string.IsNullOrEmpty(listId)
                    ? "<ListID>" + EscapeXml(listId) + "</ListID>"
                    : "<FullName>" + EscapeXml(fullName) + "</FullName>";

                XmlDocument doc = session.ProcessRequest("<VendorQueryRq>" + filter + "</VendorQueryRq>");
                XmlNode v = doc.SelectSingleNode("//VendorRet");
                if (v != null)
                {
                    string taxId = GetNodeText(v, "VendorTaxIdent");
                    if (!string.IsNullOrEmpty(taxId)) br.tin = taxId;

                    XmlNode vAddr = v.SelectSingleNode("VendorAddress");
                    if (vAddr != null)
                    {
                        if (string.IsNullOrEmpty(br.payee_address))
                        {
                            br.payee_address = ExtractAddress(vAddr);
                        }
                        string pCode = GetNodeText(vAddr, "PostalCode");
                        if (string.IsNullOrEmpty(br.payee_zip) && !string.IsNullOrEmpty(pCode))
                        {
                            br.payee_zip = pCode;
                        }
                    }
                }
            }
            catch { }
        }

        static string ExtractAddress(XmlNode addr)
        {
            if (addr == null) return "";
            List<string> parts = new List<string>();
            string a2 = GetNodeText(addr, "Addr2");
            string a3 = GetNodeText(addr, "Addr3");
            string city = GetNodeText(addr, "City");
            string state = GetNodeText(addr, "State");
            string postal = GetNodeText(addr, "PostalCode");
            if (!string.IsNullOrEmpty(a2)) parts.Add(a2);
            if (!string.IsNullOrEmpty(a3)) parts.Add(a3);
            if (!string.IsNullOrEmpty(city)) parts.Add(city);
            if (!string.IsNullOrEmpty(state)) parts.Add(state);
            if (!string.IsNullOrEmpty(postal)) parts.Add(postal);
            return string.Join(", ", parts.ToArray());
        }

        static string EscapeJson(string s)
        {
            if (s == null) return "";
            return s.Replace("\\", "\\\\")
                    .Replace("\"", "\\\"")
                    .Replace("\r", "\\r")
                    .Replace("\n", "\\n")
                    .Replace("\t", "\\t");
        }

        static void PrintJson(BridgeResponse r)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append("{");
            sb.AppendFormat("\"success\":{0},", r.success ? "true" : "false");
            sb.AppendFormat("\"error\":\"{0}\",", EscapeJson(r.error));
            sb.AppendFormat("\"ref_number\":\"{0}\",", EscapeJson(r.ref_number));
            sb.AppendFormat("\"date\":\"{0}\",", EscapeJson(r.date));
            sb.AppendFormat("\"due_date\":\"{0}\",", EscapeJson(r.due_date));
            sb.AppendFormat("\"payee_name\":\"{0}\",", EscapeJson(r.payee_name));
            sb.AppendFormat("\"payee_address\":\"{0}\",", EscapeJson(r.payee_address));
            sb.AppendFormat("\"bank_account\":\"{0}\",", EscapeJson(r.bank_account));
            sb.AppendFormat("\"ap_account\":\"{0}\",", EscapeJson(r.ap_account));
            sb.AppendFormat("\"tin\":\"{0}\",", EscapeJson(r.tin));
            sb.AppendFormat("\"payee_zip\":\"{0}\",", EscapeJson(r.payee_zip));
            sb.AppendFormat("\"payor_name\":\"{0}\",", EscapeJson(r.payor_name));
            sb.AppendFormat("\"payor_address\":\"{0}\",", EscapeJson(r.payor_address));
            sb.AppendFormat("\"payor_tin\":\"{0}\",", EscapeJson(r.payor_tin));
            sb.AppendFormat("\"payor_zip\":\"{0}\",", EscapeJson(r.payor_zip));
            sb.AppendFormat("\"po_number\":\"{0}\",", EscapeJson(r.po_number));
            sb.AppendFormat("\"memo\":\"{0}\",", EscapeJson(r.memo));
            sb.AppendFormat(CultureInfo.InvariantCulture, "\"total_amount\":{0:F2},", r.total_amount);

            sb.Append("\"line_items\":[");
            for (int i = 0; i < r.line_items.Count; i++)
            {
                var li = r.line_items[i];
                if (i > 0) sb.Append(",");
                sb.Append("{");
                sb.AppendFormat("\"account_number\":\"{0}\",", EscapeJson(li.account_number));
                sb.AppendFormat("\"account_name\":\"{0}\",", EscapeJson(li.account_name));
                sb.AppendFormat("\"class_name\":\"{0}\",", EscapeJson(li.class_name));
                sb.AppendFormat("\"customer_job\":\"{0}\",", EscapeJson(li.customer_job));
                sb.AppendFormat("\"memo\":\"{0}\",", EscapeJson(li.memo));
                sb.AppendFormat(CultureInfo.InvariantCulture, "\"debit\":{0:F2},", li.debit);
                sb.AppendFormat(CultureInfo.InvariantCulture, "\"credit\":{0:F2},", li.credit);
                sb.AppendFormat(CultureInfo.InvariantCulture, "\"quantity\":{0:F2},", li.quantity);
                sb.AppendFormat(CultureInfo.InvariantCulture, "\"unit_cost\":{0:F2},", li.unit_cost);
                sb.AppendFormat("\"item_name\":\"{0}\"", EscapeJson(li.item_name));
                sb.Append("}");
            }
            sb.Append("],");

            sb.Append("\"bill_credits\":[");
            for (int i = 0; i < r.bill_credits.Count; i++)
            {
                var bc = r.bill_credits[i];
                if (i > 0) sb.Append(",");
                sb.Append("{");
                sb.AppendFormat("\"credit_ref_number\":\"{0}\",", EscapeJson(bc.credit_ref_number));
                sb.AppendFormat(CultureInfo.InvariantCulture, "\"applied_amount\":{0:F2},", bc.applied_amount);
                sb.AppendFormat("\"account_name\":\"{0}\",", EscapeJson(bc.account_name));
                sb.AppendFormat("\"class_name\":\"{0}\",", EscapeJson(bc.class_name));
                sb.AppendFormat("\"memo\":\"{0}\"", EscapeJson(bc.memo));
                sb.Append("}");
            }
            sb.Append("]}");

            Console.WriteLine(sb.ToString());
        }
    }
}
