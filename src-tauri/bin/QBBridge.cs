using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using QBFC16Lib;

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

    class Program
    {
        [STAThread]
        static int Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            if (args.Length < 2)
            {
                PrintJson(new BridgeResponse { success = false, error = "Usage: QBBridge.exe <FormType> <RefNumber>" });
                return 1;
            }

            string formType = args[0].Trim().ToUpperInvariant();
            string refNumber = args[1].Trim();

            QBSessionManager sessionManager = null;
            bool sessionBegun = false;
            bool connectionOpen = false;

            try
            {
                sessionManager = new QBSessionManager();
                sessionManager.OpenConnection2("", "VoucherPro Check Data", ENConnectionType.ctLocalQBD);
                connectionOpen = true;
                sessionManager.BeginSession("", ENOpenMode.omDontCare);
                sessionBegun = true;

                // 1. Load Chart of Accounts lookup (ListID -> AccountNumber, FullName -> AccountNumber)
                Dictionary<string, string> acctNumById = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                Dictionary<string, string> acctNumByName = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                LoadChartOfAccounts(sessionManager, acctNumById, acctNumByName);

                // 2. Load Item -> Asset/Expense Account lookup (matching VoucherPROV2 AccessQueries_DRC)
                Dictionary<string, ItemAccountInfo> itemAcctMap = new Dictionary<string, ItemAccountInfo>(StringComparer.OrdinalIgnoreCase);
                LoadItemAccountMap(sessionManager, acctNumById, acctNumByName, itemAcctMap);

                BridgeResponse resp = null;

                if (formType == "CV" || formType == "CHECK")
                {
                    resp = QueryCheckOrBillPayment(sessionManager, refNumber, acctNumById, acctNumByName, itemAcctMap);
                }
                else
                {
                    resp = QueryCheckOrBillPayment(sessionManager, refNumber, acctNumById, acctNumByName, itemAcctMap);
                }

                PrintJson(resp);
                return resp.success ? 0 : 2;
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
            finally
            {
                try
                {
                    if (sessionBegun && sessionManager != null) sessionManager.EndSession();
                    if (connectionOpen && sessionManager != null) sessionManager.CloseConnection();
                }
                catch { }
            }
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
            QBSessionManager sm,
            Dictionary<string, string> byId,
            Dictionary<string, string> byName)
        {
            try
            {
                IMsgSetRequest req = sm.CreateMsgSetRequest("US", 13, 0);
                req.Attributes.OnError = ENRqOnError.roeContinue;
                IAccountQuery acctQ = req.AppendAccountQueryRq();
                acctQ.ORAccountListQuery.AccountListFilter.ActiveStatus.SetValue(ENActiveStatus.asAll);

                IMsgSetResponse resp = sm.DoRequests(req);
                if (resp.ResponseList == null || resp.ResponseList.Count == 0) return;

                IResponse r = resp.ResponseList.GetAt(0);
                IAccountRetList list = r.Detail as IAccountRetList;
                if (list == null) return;

                for (int i = 0; i < list.Count; i++)
                {
                    IAccountRet a = list.GetAt(i);
                    string num = a.AccountNumber != null ? a.AccountNumber.GetValue() : "";
                    string id = a.ListID != null ? a.ListID.GetValue() : "";
                    string name = a.FullName != null ? a.FullName.GetValue() : "";
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

        static void LoadItemAccountMap(
            QBSessionManager sm,
            Dictionary<string, string> acctNumById,
            Dictionary<string, string> acctNumByName,
            Dictionary<string, ItemAccountInfo> itemAcctMap)
        {
            try
            {
                IMsgSetRequest req = sm.CreateMsgSetRequest("US", 13, 0);
                req.Attributes.OnError = ENRqOnError.roeContinue;
                IItemQuery itemQ = req.AppendItemQueryRq();
                itemQ.ORListQuery.ListFilter.ActiveStatus.SetValue(ENActiveStatus.asAll);

                IMsgSetResponse resp = sm.DoRequests(req);
                if (resp.ResponseList == null || resp.ResponseList.Count == 0) return;

                IResponse r = resp.ResponseList.GetAt(0);
                IORItemRetList list = r.Detail as IORItemRetList;
                if (list == null) return;

                for (int i = 0; i < list.Count; i++)
                {
                    IORItemRet orItem = list.GetAt(i);
                    string itemId = "";
                    string itemFullName = "";
                    string acctId = "";
                    string acctFullName = "";

                    if (orItem.ItemInventoryRet != null)
                    {
                        var it = orItem.ItemInventoryRet;
                        itemId = it.ListID != null ? it.ListID.GetValue() : "";
                        itemFullName = it.FullName != null ? it.FullName.GetValue() : "";
                        if (it.AssetAccountRef != null)
                        {
                            acctId = it.AssetAccountRef.ListID != null ? it.AssetAccountRef.ListID.GetValue() : "";
                            acctFullName = it.AssetAccountRef.FullName != null ? it.AssetAccountRef.FullName.GetValue() : "";
                        }
                        if (string.IsNullOrEmpty(acctFullName) && it.COGSAccountRef != null)
                        {
                            acctId = it.COGSAccountRef.ListID != null ? it.COGSAccountRef.ListID.GetValue() : "";
                            acctFullName = it.COGSAccountRef.FullName != null ? it.COGSAccountRef.FullName.GetValue() : "";
                        }
                    }
                    else if (orItem.ItemInventoryAssemblyRet != null)
                    {
                        var it = orItem.ItemInventoryAssemblyRet;
                        itemId = it.ListID != null ? it.ListID.GetValue() : "";
                        itemFullName = it.FullName != null ? it.FullName.GetValue() : "";
                        if (it.AssetAccountRef != null)
                        {
                            acctId = it.AssetAccountRef.ListID != null ? it.AssetAccountRef.ListID.GetValue() : "";
                            acctFullName = it.AssetAccountRef.FullName != null ? it.AssetAccountRef.FullName.GetValue() : "";
                        }
                    }
                    else if (orItem.ItemNonInventoryRet != null)
                    {
                        var it = orItem.ItemNonInventoryRet;
                        itemId = it.ListID != null ? it.ListID.GetValue() : "";
                        itemFullName = it.FullName != null ? it.FullName.GetValue() : "";
                        if (it.ORSalesPurchase != null)
                        {
                            if (it.ORSalesPurchase.SalesOrPurchase != null && it.ORSalesPurchase.SalesOrPurchase.AccountRef != null)
                            {
                                acctId = it.ORSalesPurchase.SalesOrPurchase.AccountRef.ListID != null ? it.ORSalesPurchase.SalesOrPurchase.AccountRef.ListID.GetValue() : "";
                                acctFullName = it.ORSalesPurchase.SalesOrPurchase.AccountRef.FullName != null ? it.ORSalesPurchase.SalesOrPurchase.AccountRef.FullName.GetValue() : "";
                            }
                            else if (it.ORSalesPurchase.SalesAndPurchase != null && it.ORSalesPurchase.SalesAndPurchase.ExpenseAccountRef != null)
                            {
                                acctId = it.ORSalesPurchase.SalesAndPurchase.ExpenseAccountRef.ListID != null ? it.ORSalesPurchase.SalesAndPurchase.ExpenseAccountRef.ListID.GetValue() : "";
                                acctFullName = it.ORSalesPurchase.SalesAndPurchase.ExpenseAccountRef.FullName != null ? it.ORSalesPurchase.SalesAndPurchase.ExpenseAccountRef.FullName.GetValue() : "";
                            }
                        }
                    }
                    else if (orItem.ItemServiceRet != null)
                    {
                        var it = orItem.ItemServiceRet;
                        itemId = it.ListID != null ? it.ListID.GetValue() : "";
                        itemFullName = it.FullName != null ? it.FullName.GetValue() : "";
                        if (it.ORSalesPurchase != null)
                        {
                            if (it.ORSalesPurchase.SalesOrPurchase != null && it.ORSalesPurchase.SalesOrPurchase.AccountRef != null)
                            {
                                acctId = it.ORSalesPurchase.SalesOrPurchase.AccountRef.ListID != null ? it.ORSalesPurchase.SalesOrPurchase.AccountRef.ListID.GetValue() : "";
                                acctFullName = it.ORSalesPurchase.SalesOrPurchase.AccountRef.FullName != null ? it.ORSalesPurchase.SalesOrPurchase.AccountRef.FullName.GetValue() : "";
                            }
                            else if (it.ORSalesPurchase.SalesAndPurchase != null && it.ORSalesPurchase.SalesAndPurchase.ExpenseAccountRef != null)
                            {
                                acctId = it.ORSalesPurchase.SalesAndPurchase.ExpenseAccountRef.ListID != null ? it.ORSalesPurchase.SalesAndPurchase.ExpenseAccountRef.ListID.GetValue() : "";
                                acctFullName = it.ORSalesPurchase.SalesAndPurchase.ExpenseAccountRef.FullName != null ? it.ORSalesPurchase.SalesAndPurchase.ExpenseAccountRef.FullName.GetValue() : "";
                            }
                        }
                    }
                    else if (orItem.ItemOtherChargeRet != null)
                    {
                        var it = orItem.ItemOtherChargeRet;
                        itemId = it.ListID != null ? it.ListID.GetValue() : "";
                        itemFullName = it.FullName != null ? it.FullName.GetValue() : "";
                        if (it.ORSalesPurchase != null)
                        {
                            if (it.ORSalesPurchase.SalesOrPurchase != null && it.ORSalesPurchase.SalesOrPurchase.AccountRef != null)
                            {
                                acctId = it.ORSalesPurchase.SalesOrPurchase.AccountRef.ListID != null ? it.ORSalesPurchase.SalesOrPurchase.AccountRef.ListID.GetValue() : "";
                                acctFullName = it.ORSalesPurchase.SalesOrPurchase.AccountRef.FullName != null ? it.ORSalesPurchase.SalesOrPurchase.AccountRef.FullName.GetValue() : "";
                            }
                            else if (it.ORSalesPurchase.SalesAndPurchase != null && it.ORSalesPurchase.SalesAndPurchase.ExpenseAccountRef != null)
                            {
                                acctId = it.ORSalesPurchase.SalesAndPurchase.ExpenseAccountRef.ListID != null ? it.ORSalesPurchase.SalesAndPurchase.ExpenseAccountRef.ListID.GetValue() : "";
                                acctFullName = it.ORSalesPurchase.SalesAndPurchase.ExpenseAccountRef.FullName != null ? it.ORSalesPurchase.SalesAndPurchase.ExpenseAccountRef.FullName.GetValue() : "";
                            }
                        }
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

        static BridgeResponse QueryCheckOrBillPayment(
            QBSessionManager sm,
            string refNumber,
            Dictionary<string, string> acctNumById,
            Dictionary<string, string> acctNumByName,
            Dictionary<string, ItemAccountInfo> itemAcctMap)
        {
            // Batch both Regular Check Query and Bill Payment Check Query using US v13.0 (matching VoucherPROV2)
            IMsgSetRequest req = sm.CreateMsgSetRequest("US", 13, 0);
            req.Attributes.OnError = ENRqOnError.roeContinue;

            ICheckQuery chkQ = req.AppendCheckQueryRq();
            chkQ.ORTxnQuery.TxnFilter.ORRefNumberFilter.RefNumberFilter.MatchCriterion.SetValue(ENMatchCriterion.mcStartsWith);
            chkQ.ORTxnQuery.TxnFilter.ORRefNumberFilter.RefNumberFilter.RefNumber.SetValue(refNumber);
            chkQ.IncludeLineItems.SetValue(true);

            IBillPaymentCheckQuery bpQ = req.AppendBillPaymentCheckQueryRq();
            bpQ.ORTxnQuery.TxnFilter.ORRefNumberFilter.RefNumberFilter.MatchCriterion.SetValue(ENMatchCriterion.mcStartsWith);
            bpQ.ORTxnQuery.TxnFilter.ORRefNumberFilter.RefNumberFilter.RefNumber.SetValue(refNumber);
            bpQ.IncludeLineItems.SetValue(true);

            IMsgSetResponse resp = sm.DoRequests(req);
            if (resp.ResponseList == null || resp.ResponseList.Count == 0)
            {
                return new BridgeResponse { success = false, error = "Empty response from QuickBooks." };
            }

            // 1. Check Response 0: Regular Check (Write Checks)
            IResponse r0 = resp.ResponseList.GetAt(0);
            ICheckRetList chkList = r0.Detail as ICheckRetList;
            if (chkList != null && chkList.Count > 0)
            {
                ICheckRet chk = null;
                for (int i = 0; i < chkList.Count; i++)
                {
                    ICheckRet candidate = chkList.GetAt(i);
                    if (candidate.RefNumber != null && string.Equals(candidate.RefNumber.GetValue(), refNumber, StringComparison.OrdinalIgnoreCase))
                    {
                        chk = candidate;
                        break;
                    }
                }
                if (chk == null) chk = chkList.GetAt(0);

                BridgeResponse br = new BridgeResponse { success = true };
                br.ref_number = chk.RefNumber != null ? chk.RefNumber.GetValue() : refNumber;
                br.date = chk.TxnDate != null ? chk.TxnDate.GetValue().ToString("MM/dd/yyyy") : "";
                br.payee_name = chk.PayeeEntityRef != null && chk.PayeeEntityRef.FullName != null ? chk.PayeeEntityRef.FullName.GetValue() : "";
                br.payee_address = ExtractAddress(chk.Address);

                string bankFullName = chk.AccountRef != null && chk.AccountRef.FullName != null ? chk.AccountRef.FullName.GetValue() : "";
                string bankListId = chk.AccountRef != null && chk.AccountRef.ListID != null ? chk.AccountRef.ListID.GetValue() : "";
                string bankLeafName = GetLeafAccountName(bankFullName);
                string bankAcctNum = LookupAccountNumber(bankListId, bankFullName, acctNumById, acctNumByName);

                br.bank_account = bankLeafName;
                br.memo = chk.Memo != null ? chk.Memo.GetValue() : "";
                br.total_amount = chk.Amount != null ? chk.Amount.GetValue() : 0.0;

                List<LineItemDto> rawLines = new List<LineItemDto>();

                if (chk.ExpenseLineRetList != null)
                {
                    for (int i = 0; i < chk.ExpenseLineRetList.Count; i++)
                    {
                        IExpenseLineRet exp = chk.ExpenseLineRetList.GetAt(i);
                        string accName = exp.AccountRef != null && exp.AccountRef.FullName != null ? exp.AccountRef.FullName.GetValue() : "";
                        string accId = exp.AccountRef != null && exp.AccountRef.ListID != null ? exp.AccountRef.ListID.GetValue() : "";
                        string accNum = LookupAccountNumber(accId, accName, acctNumById, acctNumByName);
                        double amt = exp.Amount != null ? exp.Amount.GetValue() : 0.0;

                        rawLines.Add(new LineItemDto
                        {
                            account_number = accNum,
                            account_name = GetLeafAccountName(accName),
                            class_name = exp.ClassRef != null && exp.ClassRef.FullName != null ? exp.ClassRef.FullName.GetValue() : "",
                            customer_job = exp.CustomerRef != null && exp.CustomerRef.FullName != null ? exp.CustomerRef.FullName.GetValue() : "",
                            memo = exp.Memo != null ? exp.Memo.GetValue() : "",
                            debit = amt >= 0 ? amt : 0.0,
                            credit = amt < 0 ? Math.Abs(amt) : 0.0
                        });
                    }
                }

                if (chk.ORItemLineRetList != null)
                {
                    for (int i = 0; i < chk.ORItemLineRetList.Count; i++)
                    {
                        IORItemLineRet orLine = chk.ORItemLineRetList.GetAt(i);
                        if (orLine.ItemLineRet != null)
                        {
                            var il = orLine.ItemLineRet;
                            string itemId = il.ItemRef != null && il.ItemRef.ListID != null ? il.ItemRef.ListID.GetValue() : "";
                            string itemName = il.ItemRef != null && il.ItemRef.FullName != null ? il.ItemRef.FullName.GetValue() : "";
                            double amt = il.Amount != null ? il.Amount.GetValue() : 0.0;

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
                                class_name = il.ClassRef != null && il.ClassRef.FullName != null ? il.ClassRef.FullName.GetValue() : "",
                                customer_job = il.CustomerRef != null && il.CustomerRef.FullName != null ? il.CustomerRef.FullName.GetValue() : "",
                                memo = il.Desc != null ? il.Desc.GetValue() : "",
                                debit = amt >= 0 ? amt : 0.0,
                                credit = amt < 0 ? Math.Abs(amt) : 0.0,
                                quantity = il.Quantity != null ? il.Quantity.GetValue() : 0.0,
                                unit_cost = il.Cost != null ? il.Cost.GetValue() : 0.0,
                                item_name = itemName
                            });
                        }
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

            // 2. Check Response 1: Bill Payment Check (Pay Bills)
            if (resp.ResponseList.Count > 1)
            {
                IResponse r1 = resp.ResponseList.GetAt(1);
                IBillPaymentCheckRetList bpList = r1.Detail as IBillPaymentCheckRetList;
                if (bpList != null && bpList.Count > 0)
                {
                    IBillPaymentCheckRet bp = null;
                    for (int i = 0; i < bpList.Count; i++)
                    {
                        IBillPaymentCheckRet candidate = bpList.GetAt(i);
                        if (candidate.RefNumber != null && string.Equals(candidate.RefNumber.GetValue(), refNumber, StringComparison.OrdinalIgnoreCase))
                        {
                            bp = candidate;
                            break;
                        }
                    }
                    if (bp == null) bp = bpList.GetAt(0);

                    BridgeResponse br = new BridgeResponse { success = true };
                    br.ref_number = bp.RefNumber != null ? bp.RefNumber.GetValue() : refNumber;
                    br.date = bp.TxnDate != null ? bp.TxnDate.GetValue().ToString("MM/dd/yyyy") : "";
                    br.payee_name = bp.PayeeEntityRef != null && bp.PayeeEntityRef.FullName != null ? bp.PayeeEntityRef.FullName.GetValue() : "";
                    br.payee_address = ExtractAddress(bp.Address);

                    string bankFullName = bp.BankAccountRef != null && bp.BankAccountRef.FullName != null ? bp.BankAccountRef.FullName.GetValue() : "";
                    string bankListId = bp.BankAccountRef != null && bp.BankAccountRef.ListID != null ? bp.BankAccountRef.ListID.GetValue() : "";
                    string bankLeafName = GetLeafAccountName(bankFullName);
                    string bankAcctNum = LookupAccountNumber(bankListId, bankFullName, acctNumById, acctNumByName);

                    string headerApFullName = bp.APAccountRef != null && bp.APAccountRef.FullName != null ? bp.APAccountRef.FullName.GetValue() : "Accounts Payable";
                    string headerApListId = bp.APAccountRef != null && bp.APAccountRef.ListID != null ? bp.APAccountRef.ListID.GetValue() : "";
                    string headerApLeafName = GetLeafAccountName(headerApFullName);
                    string headerApAcctNum = LookupAccountNumber(headerApListId, headerApFullName, acctNumById, acctNumByName);

                    br.bank_account = bankLeafName;
                    br.ap_account = headerApLeafName;
                    br.memo = bp.Memo != null ? bp.Memo.GetValue() : "";
                    br.total_amount = bp.Amount != null ? bp.Amount.GetValue() : 0.0;

                    List<LineItemDto> rawLines = new List<LineItemDto>();
                    List<string> billMemos = new List<string>();

                    if (bp.AppliedToTxnRetList != null && bp.AppliedToTxnRetList.Count > 0)
                    {
                        Dictionary<string, Tuple<string, string, string>> billInfoByTxnId = QueryAppliedBills(sm, bp.AppliedToTxnRetList, acctNumById, acctNumByName);

                        for (int i = 0; i < bp.AppliedToTxnRetList.Count; i++)
                        {
                            IAppliedToTxnRet app = bp.AppliedToTxnRetList.GetAt(i);
                            string txnId = app.TxnID != null ? app.TxnID.GetValue() : "";
                            string billRef = app.RefNumber != null ? app.RefNumber.GetValue() : "";

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

            return new BridgeResponse
            {
                success = false,
                error = "Check RefNumber '" + refNumber + "' not found in QuickBooks."
            };
        }

        static Dictionary<string, Tuple<string, string, string>> QueryAppliedBills(
            QBSessionManager sm,
            IAppliedToTxnRetList appliedList,
            Dictionary<string, string> acctNumById,
            Dictionary<string, string> acctNumByName)
        {
            var result = new Dictionary<string, Tuple<string, string, string>>(StringComparer.OrdinalIgnoreCase);
            try
            {
                IMsgSetRequest req = sm.CreateMsgSetRequest("US", 13, 0);
                req.Attributes.OnError = ENRqOnError.roeContinue;
                IBillQuery bq = req.AppendBillQueryRq();

                for (int i = 0; i < appliedList.Count; i++)
                {
                    IAppliedToTxnRet app = appliedList.GetAt(i);
                    if (app.TxnID != null && !string.IsNullOrEmpty(app.TxnID.GetValue()))
                    {
                        bq.ORBillQuery.TxnIDList.Add(app.TxnID.GetValue());
                    }
                }

                IMsgSetResponse resp = sm.DoRequests(req);
                if (resp.ResponseList != null && resp.ResponseList.Count > 0)
                {
                    IResponse r = resp.ResponseList.GetAt(0);
                    IBillRetList bills = r.Detail as IBillRetList;
                    if (bills != null)
                    {
                        for (int i = 0; i < bills.Count; i++)
                        {
                            IBillRet b = bills.GetAt(i);
                            string txnId = b.TxnID != null ? b.TxnID.GetValue() : "";
                            string apFull = b.APAccountRef != null && b.APAccountRef.FullName != null ? b.APAccountRef.FullName.GetValue() : "";
                            string apId = b.APAccountRef != null && b.APAccountRef.ListID != null ? b.APAccountRef.ListID.GetValue() : "";
                            string apLeaf = GetLeafAccountName(apFull);
                            string apNum = LookupAccountNumber(apId, apFull, acctNumById, acctNumByName);
                            string billMemo = b.Memo != null ? b.Memo.GetValue() : "";
                            if (!string.IsNullOrEmpty(txnId))
                            {
                                result[txnId] = Tuple.Create(apLeaf, apNum, billMemo);
                            }
                        }
                    }
                }
            }
            catch { }
            return result;
        }

        static string ExtractAddress(IAddress addr)
        {
            if (addr == null) return "";
            List<string> parts = new List<string>();
            if (addr.Addr2 != null && !string.IsNullOrEmpty(addr.Addr2.GetValue())) parts.Add(addr.Addr2.GetValue());
            if (addr.Addr3 != null && !string.IsNullOrEmpty(addr.Addr3.GetValue())) parts.Add(addr.Addr3.GetValue());
            if (addr.City != null && !string.IsNullOrEmpty(addr.City.GetValue())) parts.Add(addr.City.GetValue());
            if (addr.State != null && !string.IsNullOrEmpty(addr.State.GetValue())) parts.Add(addr.State.GetValue());
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
