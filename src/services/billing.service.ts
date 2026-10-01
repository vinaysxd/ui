import api from "../lib/api";
import { getErrorMessage } from "../constants/errors";

export interface InvoiceLineItem {
  description: string;
  qty: number;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  DueDate: string;
  TotalAmt: number;
  Balance: number;
  Line?: any[];
  line_items?: InvoiceLineItem[];
}

export interface Estimate {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  ExpirationDate?: string;
  TotalAmt: number;
  TxnStatus?: string;
  Line?: any[];
  line_items?: InvoiceLineItem[];
}

export interface StatementTransaction {
  id: string;
  date: string;
  type: string;
  number: string;
  detail?: string;
  amount: number; // signed: charges positive, payments/credits negative
  balance: number; // running balance after this transaction
}

export interface Statement {
  total_outstanding: number;
  overdue: number;
  transactions: StatementTransaction[]; // newest first
}

export class QuickBooksNotLinkedError extends Error {
  constructor() {
    super("QuickBooks account is not linked");
    this.name = "QuickBooksNotLinkedError";
  }
}

const toError = (error: any): Error => {
  const code = error?.response?.data?.code;
  return code === "QBO_003" ? new QuickBooksNotLinkedError() : new Error(getErrorMessage(code));
};

// The API returns either a bare array or an object wrapping it.
const unwrap = (data: any, ...keys: string[]): any[] => {
  if (Array.isArray(data)) {
    return data;
  }
  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }
  return [];
};

const byDateDesc = (a: { TxnDate: string }, b: { TxnDate: string }) =>
  new Date(b.TxnDate).getTime() - new Date(a.TxnDate).getTime();

export const getClientInvoices = async (): Promise<Invoice[]> => {
  try {
    const response = await api.get("/integrations/quickbooks/client/invoices");
    return (unwrap(response.data, "invoices") as Invoice[]).sort(byDateDesc);
  } catch (error: any) {
    throw toError(error);
  }
};

export const getClientEstimates = async (): Promise<Estimate[]> => {
  try {
    const response = await api.get("/integrations/quickbooks/client/estimates");
    return (unwrap(response.data, "estimates") as Estimate[]).sort(byDateDesc);
  } catch (error: any) {
    throw toError(error);
  }
};

const lineRefNumber = (line: any): string | undefined =>
  line?.LineEx?.any?.find((entry: any) => entry?.value?.Name === "txnReferenceNumber")?.value?.Value;

// Builds the statement from the invoices and payments the API returns. Payments with a zero total
// are QuickBooks credit-memo applications, so their credit-memo lines are shown as credits.
// Running balance is computed oldest to newest; the list is returned newest first.
export const getClientStatement = async (): Promise<Statement> => {
  try {
    const response = await api.get("/integrations/quickbooks/client/statement");
    const data = response.data ?? {};
    const invoices: any[] = data.invoices ?? [];
    const payments: any[] = data.payments ?? [];
    const invoiceNumbers = new Map<string, string>(
      invoices.map((invoice) => [String(invoice.Id), String(invoice.DocNumber)])
    );

    const rows: Omit<StatementTransaction, "balance">[] = invoices.map((invoice) => ({
      id: `invoice-${invoice.Id}`,
      date: invoice.TxnDate,
      type: "Invoice",
      number: String(invoice.DocNumber ?? ""),
      amount: invoice.TotalAmt ?? 0,
    }));

    for (const payment of payments) {
      if ((payment.TotalAmt ?? 0) > 0) {
        const appliedTo = (payment.Line ?? [])
          .flatMap((line: any) => line.LinkedTxn ?? [])
          .filter((txn: any) => txn.TxnType === "Invoice")
          .map((txn: any) => invoiceNumbers.get(String(txn.TxnId)) ?? txn.TxnId);
        rows.push({
          id: `payment-${payment.Id}`,
          date: payment.TxnDate,
          type: "Payment",
          number: payment.PaymentRefNum ?? "",
          detail: appliedTo.length ? `Applied to #${appliedTo.join(", #")}` : undefined,
          amount: -payment.TotalAmt,
        });
        continue;
      }

      (payment.Line ?? []).forEach((line: any, index: number) => {
        if (line.LinkedTxn?.some((txn: any) => txn.TxnType === "CreditMemo")) {
          rows.push({
            id: `credit-${payment.Id}-${index}`,
            date: payment.TxnDate,
            type: "Credit",
            number: lineRefNumber(line) ?? "",
            amount: -(line.Amount ?? 0),
          });
        }
      });
    }

    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    const transactions: StatementTransaction[] = rows.map((row) => {
      running += row.amount;
      return { ...row, balance: running };
    });

    return {
      total_outstanding: data.total_outstanding ?? 0,
      overdue: data.overdue ?? 0,
      transactions: transactions.reverse(),
    };
  } catch (error: any) {
    throw toError(error);
  }
};

export const getLineItems = (doc: {
  Line?: any[];
  line_items?: InvoiceLineItem[];
}): InvoiceLineItem[] => {
  if (doc.line_items) {
    return doc.line_items;
  }
  if (!doc.Line) {
    return [];
  }
  return doc.Line.filter((line: any) => line.DetailType === "SalesItemLineDetail").map(
    (line: any) => ({
      description: line.Description || line.SalesItemLineDetail?.ItemRef?.name || "Item",
      qty: line.SalesItemLineDetail?.Qty ?? 1,
      unit_price: line.SalesItemLineDetail?.UnitPrice ?? line.Amount ?? 0,
      amount: line.Amount ?? 0,
    })
  );
};
