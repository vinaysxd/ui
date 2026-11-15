import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { getAllClients, Client } from "../../../src/services/client.service";
import DirectoryScreen, { ActivePill, Avatar, cell } from "../../../src/components/admin/DirectoryScreen";

// Module-level so the list screen's memoised filtering stays stable between renders.
const isActive = (c: Client) => c.is_active;
const searchFields = (c: Client) => [c.full_name, c.email, c.phone, c.company_name];

export default function ClientsScreen() {
  const router = useRouter();

  return (
    <DirectoryScreen<Client>
      title="Clients"
      noun={["client", "clients"]}
      icon="briefcase-outline"
      actionLabel="Invite Client"
      actionIcon="person-add-outline"
      onAction={() => router.push("/(admin)/clients/invite")}
      load={getAllClients}
      getKey={(c) => c.id}
      isActive={isActive}
      searchFields={searchFields}
      searchPlaceholder="Search by name, email, phone or company"
      onOpen={(c) => router.push(`/(admin)/clients/${c.profile_id}`)}
      columns={[
        {
          label: "Name",
          flex: 2,
          render: (c) => (
            <View style={cell.nameRow}>
              <Avatar name={c.full_name} />
              <Text style={cell.primary} numberOfLines={1}>{c.full_name}</Text>
            </View>
          ),
        },
        { label: "Email", flex: 2, render: (c) => <Text style={cell.secondary} numberOfLines={1}>{c.email}</Text> },
        { label: "Phone", flex: 1.3, render: (c) => <Text style={cell.secondary}>{c.phone || "—"}</Text> },
        { label: "Company", flex: 1.7, render: (c) => <Text style={cell.secondary} numberOfLines={1}>{c.company_name ?? "—"}</Text> },
        { label: "Status", flex: 1.2, render: (c) => <ActivePill active={c.is_active} /> },
      ]}
      renderCard={(c) => (
        <View style={cell.nameRow}>
          <Avatar name={c.full_name} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={cell.cardTitle} numberOfLines={1}>{c.full_name}</Text>
            <Text style={cell.cardLine} numberOfLines={1}>{c.email}</Text>
            {c.company_name ? <Text style={cell.muted}>{c.company_name}</Text> : null}
          </View>
        </View>
      )}
    />
  );
}
