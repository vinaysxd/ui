import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import api from "../../../src/lib/api";
import { getErrorMessage } from "../../../src/constants/errors";
import { showError } from "../../../src/utils/toast";
import { COLORS, RADIUS } from "../../../src/constants/theme";

interface InvoiceLineItem {
  description: string;
  qty: number;
  unit_price: number;
  amount: number;
}

interface Invoice {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  DueDate: string;
  TotalAmt: number;
  Balance: number;
  Line?: any[];
  line_items?: InvoiceLineItem[];
}

type InvoiceStatus = "PAID" | "PENDING" | "OVERDUE";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const formatDate = (iso: string): string => {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const formatCurrency = (amount: number): string => `$${(amount ?? 0).toFixed(2)}`;

const getInvoiceStatus = (invoice: Invoice): InvoiceStatus => {
  if ((invoice.Balance ?? 0) <= 0) {
    return "PAID";
  }
  const due = new Date(invoice.DueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (due < today) {
    return "OVERDUE";
  }
  return "PENDING";
};

const getLineItems = (invoice: Invoice): InvoiceLineItem[] => {
  if (invoice.line_items) {
    return invoice.line_items;
  }
  if (!invoice.Line) {
    return [];
  }
  return invoice.Line.filter((line: any) => line.DetailType === "SalesItemLineDetail").map(
    (line: any) => ({
      description: line.Description || line.SalesItemLineDetail?.ItemRef?.name || "Item",
      qty: line.SalesItemLineDetail?.Qty ?? 1,
      unit_price: line.SalesItemLineDetail?.UnitPrice ?? line.Amount ?? 0,
      amount: line.Amount ?? 0,
    })
  );
};

function getStatusStyle(status: InvoiceStatus) {
  if (status === "PAID") {
    return { bar: styles.statusBarPaid, badge: styles.badgePaid, badgeText: styles.badgePaidText };
  }
  if (status === "OVERDUE") {
    return {
      bar: styles.statusBarOverdue,
      badge: styles.badgeOverdue,
      badgeText: styles.badgeOverdueText,
    };
  }
  return {
    bar: styles.statusBarPending,
    badge: styles.badgePending,
    badgeText: styles.badgePendingText,
  };
}

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export default function ClientBillingScreen() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [notLinked, setNotLinked] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setNotLinked(false);
    setErrorMessage(null);
    try {
      const response = await api.get("/integrations/quickbooks/invoices");
      const data: Invoice[] = Array.isArray(response.data)
        ? response.data
        : response.data.invoices ?? [];
      const sorted = [...data].sort(
        (a, b) => new Date(b.TxnDate).getTime() - new Date(a.TxnDate).getTime()
      );
      setInvoices(sorted.slice(0, 10));
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === "QBO_003") {
        setNotLinked(true);
      } else {
        setErrorMessage(getErrorMessage(code));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    setDownloadingId(invoice.Id);
    try {
      const response = await api.get(`/integrations/quickbooks/invoices/${invoice.Id}/pdf`, {
        responseType: "blob",
      });
      const blob: Blob = response.data;

      if (Platform.OS === "web") {
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        return;
      }

      const base64 = await blobToBase64(blob);
      const file = new File(Paths.cache, `invoice-${invoice.DocNumber || invoice.Id}.pdf`);
      file.write(base64, { encoding: "base64" });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: "Invoice PDF" });
      } else {
        showError("Sharing is not available on this device");
      }
    } catch (err: any) {
      const code = err?.response?.data?.code;
      showError(code === "QBO_003" ? "QuickBooks account is not linked" : getErrorMessage(code));
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Billing</Text>

      {notLinked ? (
        <View style={styles.stateWrap}>
          <Ionicons name="link-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.stateTitle}>QuickBooks not linked</Text>
          <Text style={styles.stateText}>
            Your account isn't linked to QuickBooks yet. Contact your admin to set up billing.
          </Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.stateWrap}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.danger} />
          <Text style={styles.stateTitle}>Couldn't load invoices</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.Id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.gold}
              colors={[COLORS.gold]}
            />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No invoices yet.</Text>}
          renderItem={({ item }) => {
            const status = getInvoiceStatus(item);
            const statusStyle = getStatusStyle(status);
            return (
              <TouchableOpacity style={styles.card} onPress={() => setSelectedInvoice(item)}>
                <View style={[styles.statusBar, statusStyle.bar]} />
                <View style={styles.cardHeader}>
                  <Text style={styles.invoiceNumber}>Invoice #{item.DocNumber}</Text>
                  <View style={[styles.badge, statusStyle.badge]}>
                    <Text style={[styles.badgeText, statusStyle.badgeText]}>{status}</Text>
                  </View>
                </View>
                <Row label="Date" value={formatDate(item.TxnDate)} />
                <Row label="Due" value={formatDate(item.DueDate)} />
                <Row label="Total" value={formatCurrency(item.TotalAmt)} />
                <Row label="Balance" value={formatCurrency(item.Balance)} last />
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal
        visible={selectedInvoice !== null}
        animationType="slide"
        onRequestClose={() => setSelectedInvoice(null)}
      >
        {selectedInvoice ? (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invoice #{selectedInvoice.DocNumber}</Text>
              <TouchableOpacity onPress={() => setSelectedInvoice(null)}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentInner}>
              <View style={styles.section}>
                <Row label="Invoice #" value={selectedInvoice.DocNumber} />
                <Row label="Date" value={formatDate(selectedInvoice.TxnDate)} />
                <Row label="Due Date" value={formatDate(selectedInvoice.DueDate)} />
                <Row label="Total" value={formatCurrency(selectedInvoice.TotalAmt)} />
                <Row label="Balance" value={formatCurrency(selectedInvoice.Balance)} last />
              </View>

              <Text style={styles.sectionTitle}>Line Items</Text>
              <View style={styles.section}>
                {getLineItems(selectedInvoice).length === 0 ? (
                  <Text style={styles.emptyLineText}>No line items</Text>
                ) : (
                  getLineItems(selectedInvoice).map((line, index, arr) => (
                    <View
                      key={index}
                      style={[styles.lineItemRow, index !== arr.length - 1 && styles.rowBorder]}
                    >
                      <Text style={styles.lineItemDescription} numberOfLines={2}>
                        {line.description}
                      </Text>
                      <View style={styles.lineItemMeta}>
                        <Text style={styles.lineItemMetaText}>
                          {line.qty} × {formatCurrency(line.unit_price)}
                        </Text>
                        <Text style={styles.lineItemAmount}>{formatCurrency(line.amount)}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => handleDownloadPdf(selectedInvoice)}
                disabled={downloadingId === selectedInvoice.Id}
              >
                {downloadingId === selectedInvoice.Id ? (
                  <ActivityIndicator color="#1A1A1A" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#1A1A1A" />
                    <Text style={styles.downloadButtonText}>Download PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 32,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 32,
  },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 64,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  stateText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 6,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 16,
    paddingLeft: 20,
    marginBottom: 12,
    overflow: "hidden",
  },
  statusBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: RADIUS.full,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    flexShrink: 1,
    marginRight: 8,
  },
  badge: {
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  statusBarPaid: { backgroundColor: COLORS.success },
  statusBarPending: { backgroundColor: COLORS.warning },
  statusBarOverdue: { backgroundColor: COLORS.danger },
  badgePaid: { backgroundColor: COLORS.successBg },
  badgePaidText: { color: COLORS.success },
  badgePending: { backgroundColor: COLORS.warningBg },
  badgePendingText: { color: COLORS.warning },
  badgeOverdue: { backgroundColor: COLORS.dangerBg },
  badgeOverdueText: { color: COLORS.danger },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
    flexShrink: 1,
    marginLeft: 16,
    textAlign: "right",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  doneText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gold,
  },
  modalContent: {
    flex: 1,
  },
  modalContentInner: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.gold,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 24,
  },
  emptyLineText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  lineItemRow: {
    paddingVertical: 10,
  },
  lineItemDescription: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  lineItemMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lineItemMetaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  lineItemAmount: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  downloadButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.gold,
    height: 52,
    borderRadius: RADIUS.md,
    marginBottom: 12,
  },
  downloadButtonText: {
    color: "#1A1A1A",
    fontWeight: "bold",
  },
});
