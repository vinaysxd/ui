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
import {
  getClientInvoices,
  getClientEstimates,
  getClientStatement,
  getLineItems,
  Invoice,
  Estimate,
  Statement,
  QuickBooksNotLinkedError,
} from "../../../src/services/billing.service";
import { getErrorMessage } from "../../../src/constants/errors";
import { showError } from "../../../src/utils/toast";
import { COLORS, RADIUS } from "../../../src/constants/theme";

type Tab = "invoices" | "quotes" | "statement";
type DocStatus = "PAID" | "UNPAID" | "PENDING";
type DetailDoc = { kind: "Invoice"; data: Invoice } | { kind: "Quote"; data: Estimate };

const TABS: { key: Tab; label: string }[] = [
  { key: "invoices", label: "Invoices" },
  { key: "quotes", label: "Quotes" },
  { key: "statement", label: "Statement" },
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const formatDate = (iso?: string): string => {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const formatCurrency = (amount: number): string => {
  const value = amount ?? 0;
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
};

// Paid: nothing owing. Unpaid: balance owing past the due date. Pending: balance owing, not yet due.
const getInvoiceStatus = (invoice: Invoice): DocStatus => {
  if ((invoice.Balance ?? 0) <= 0) {
    return "PAID";
  }
  const due = new Date(invoice.DueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today ? "UNPAID" : "PENDING";
};

// Quotes aren't paid, so show the QuickBooks status text and borrow the colours.
const getQuoteStatus = (estimate: Estimate): { label: string; status: DocStatus } => {
  const raw = (estimate.TxnStatus ?? "Pending").toLowerCase();
  const label = raw.toUpperCase();
  if (raw === "accepted" || raw === "closed") {
    return { label, status: "PAID" };
  }
  if (raw === "rejected" || raw === "declined") {
    return { label, status: "UNPAID" };
  }
  return { label, status: "PENDING" };
};

function getStatusStyle(status: DocStatus) {
  if (status === "PAID") {
    return { bar: styles.statusBarPaid, badge: styles.badgePaid, badgeText: styles.badgePaidText };
  }
  if (status === "UNPAID") {
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
  const [activeTab, setActiveTab] = useState<Tab>("invoices");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loadedTabs, setLoadedTabs] = useState<Record<Tab, boolean>>({
    invoices: false,
    quotes: false,
    statement: false,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [notLinked, setNotLinked] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DetailDoc | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchTab = useCallback(async (tab: Tab) => {
    setNotLinked(false);
    setErrorMessage(null);
    try {
      if (tab === "invoices") {
        setInvoices(await getClientInvoices());
      } else if (tab === "quotes") {
        setEstimates(await getClientEstimates());
      } else {
        setStatement(await getClientStatement());
      }
      setLoadedTabs((prev) => ({ ...prev, [tab]: true }));
    } catch (err: any) {
      if (err instanceof QuickBooksNotLinkedError) {
        setNotLinked(true);
      } else {
        setErrorMessage(err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (loadedTabs[activeTab]) {
      setNotLinked(false);
      setErrorMessage(null);
      return;
    }
    setLoading(true);
    fetchTab(activeTab);
  }, [activeTab, loadedTabs, fetchTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTab(activeTab);
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

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={COLORS.gold}
      colors={[COLORS.gold]}
    />
  );

  const renderInvoices = () => (
    <FlatList keyboardShouldPersistTaps="handled"
      data={invoices}
      keyExtractor={(item) => item.Id}
      contentContainerStyle={styles.listContent}
      refreshControl={refreshControl}
      ListEmptyComponent={<Text style={styles.emptyText}>No invoices yet.</Text>}
      renderItem={({ item }) => {
        const status = getInvoiceStatus(item);
        const statusStyle = getStatusStyle(status);
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => setSelectedDoc({ kind: "Invoice", data: item })}
          >
            <View style={[styles.statusBar, statusStyle.bar]} />
            <View style={styles.cardHeader}>
              <Text style={styles.invoiceNumber}>Invoice #{item.DocNumber}</Text>
              <View style={[styles.badge, statusStyle.badge]}>
                <Text style={[styles.badgeText, statusStyle.badgeText]}>{status}</Text>
              </View>
            </View>
            <Row label="Date" value={formatDate(item.TxnDate)} />
            <Row label="Amount" value={formatCurrency(item.TotalAmt)} last />
          </TouchableOpacity>
        );
      }}
    />
  );

  const renderQuotes = () => (
    <FlatList keyboardShouldPersistTaps="handled"
      data={estimates}
      keyExtractor={(item) => item.Id}
      contentContainerStyle={styles.listContent}
      refreshControl={refreshControl}
      ListEmptyComponent={<Text style={styles.emptyText}>No quotes yet.</Text>}
      renderItem={({ item }) => {
        const { label, status } = getQuoteStatus(item);
        const statusStyle = getStatusStyle(status);
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => setSelectedDoc({ kind: "Quote", data: item })}
          >
            <View style={[styles.statusBar, statusStyle.bar]} />
            <View style={styles.cardHeader}>
              <Text style={styles.invoiceNumber}>Quote #{item.DocNumber}</Text>
              <View style={[styles.badge, statusStyle.badge]}>
                <Text style={[styles.badgeText, statusStyle.badgeText]}>{label}</Text>
              </View>
            </View>
            <Row label="Date" value={formatDate(item.TxnDate)} />
            <Row label="Amount" value={formatCurrency(item.TotalAmt)} last />
          </TouchableOpacity>
        );
      }}
    />
  );

  const renderStatement = () => (
    <FlatList keyboardShouldPersistTaps="handled"
      data={statement?.transactions ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={refreshControl}
      ListHeaderComponent={
        statement ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Outstanding</Text>
              <Text style={styles.summaryValue}>{formatCurrency(statement.total_outstanding)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Overdue</Text>
              <Text style={[styles.summaryValue, statement.overdue > 0 && styles.summaryValueDanger]}>
                {formatCurrency(statement.overdue)}
              </Text>
            </View>
          </View>
        ) : null
      }
      ListEmptyComponent={<Text style={styles.emptyText}>No transactions yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={[styles.statusBar, item.amount < 0 ? styles.statusBarPaid : styles.statusBarPending]} />
          <View style={styles.cardHeader}>
            <Text style={styles.invoiceNumber}>
              {item.type}
              {item.number ? ` #${item.number}` : ""}
            </Text>
            <Text style={styles.transactionAmount}>{formatCurrency(item.amount)}</Text>
          </View>
          {item.detail ? <Text style={styles.transactionDetail}>{item.detail}</Text> : null}
          <Row label="Date" value={formatDate(item.date)} />
          <Row label="Balance" value={formatCurrency(item.balance)} last />
        </View>
      )}
    />
  );

  const renderBody = () => {
    if (loading) {
      return <ActivityIndicator style={styles.inlineLoader} size="large" color={COLORS.gold} />;
    }
    if (notLinked) {
      return (
        <View style={styles.stateWrap}>
          <Ionicons name="link-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.stateTitle}>QuickBooks not linked</Text>
          <Text style={styles.stateText}>
            Your account isn't linked to QuickBooks yet. Contact your admin to set up billing.
          </Text>
        </View>
      );
    }
    if (errorMessage) {
      return (
        <View style={styles.stateWrap}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.danger} />
          <Text style={styles.stateTitle}>Couldn't load {activeTab}</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
        </View>
      );
    }
    if (activeTab === "invoices") {
      return renderInvoices();
    }
    return activeTab === "quotes" ? renderQuotes() : renderStatement();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Billing</Text>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.body}>{renderBody()}</View>

      <Modal
        visible={selectedDoc !== null}
        animationType="slide"
        onRequestClose={() => setSelectedDoc(null)}
      >
        {selectedDoc ? (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDoc.kind} #{selectedDoc.data.DocNumber}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDoc(null)}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" style={styles.modalContent} contentContainerStyle={styles.modalContentInner}>
              <View style={styles.section}>
                <Row label={`${selectedDoc.kind} #`} value={selectedDoc.data.DocNumber} />
                <Row label="Date" value={formatDate(selectedDoc.data.TxnDate)} />
                {selectedDoc.kind === "Invoice" ? (
                  <>
                    <Row label="Due Date" value={formatDate(selectedDoc.data.DueDate)} />
                    <Row label="Total" value={formatCurrency(selectedDoc.data.TotalAmt)} />
                    <Row label="Balance" value={formatCurrency(selectedDoc.data.Balance)} last />
                  </>
                ) : (
                  <>
                    <Row label="Expires" value={formatDate(selectedDoc.data.ExpirationDate)} />
                    <Row label="Total" value={formatCurrency(selectedDoc.data.TotalAmt)} last />
                  </>
                )}
              </View>

              <Text style={styles.sectionTitle}>Line Items</Text>
              <View style={styles.section}>
                {getLineItems(selectedDoc.data).length === 0 ? (
                  <Text style={styles.emptyLineText}>No line items</Text>
                ) : (
                  getLineItems(selectedDoc.data).map((line, index, arr) => (
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

              {selectedDoc.kind === "Invoice" ? (
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => handleDownloadPdf(selectedDoc.data)}
                  disabled={downloadingId === selectedDoc.data.Id}
                >
                  {downloadingId === selectedDoc.data.Id ? (
                    <ActivityIndicator color="#1A1A1A" />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={18} color="#1A1A1A" />
                      <Text style={styles.downloadButtonText}>Download PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
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
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: COLORS.gold,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.gold,
  },
  body: {
    flex: 1,
  },
  inlineLoader: {
    marginTop: 48,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.gold,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  summaryValueDanger: {
    color: COLORS.danger,
  },
  transactionDetail: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
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
