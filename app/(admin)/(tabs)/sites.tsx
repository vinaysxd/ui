import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { getAllSites, Site } from "../../../src/services/sites.service";
import DirectoryScreen, { ActivePill, cell } from "../../../src/components/admin/DirectoryScreen";

const clientLabel = (site: Site): string =>
  site.client ? site.client.company_name ?? site.client.full_name : "No client";

// Module-level so the list screen's memoised filtering stays stable between renders.
const isActive = (s: Site) => s.is_active;
const searchFields = (s: Site) => [s.name, s.address, s.client?.company_name, s.client?.full_name];

export default function SitesScreen() {
  const router = useRouter();

  return (
    <DirectoryScreen<Site>
      title="Locations"
      noun={["site", "sites"]}
      icon="business-outline"
      actionLabel="Add Site"
      actionIcon="add"
      onAction={() => router.push("/(admin)/sites/create")}
      load={getAllSites}
      getKey={(s) => s.id}
      isActive={isActive}
      searchFields={searchFields}
      searchPlaceholder="Search by site, address or client"
      onOpen={(s) => router.push(`/(admin)/sites/${s.id}`)}
      columns={[
        { label: "Site", flex: 2, render: (s) => <Text style={cell.primary} numberOfLines={1}>{s.name}</Text> },
        { label: "Address", flex: 2.5, render: (s) => <Text style={cell.secondary} numberOfLines={1}>{s.address}</Text> },
        { label: "Client", flex: 1.8, render: (s) => <Text style={cell.secondary} numberOfLines={1}>{clientLabel(s)}</Text> },
        { label: "Status", flex: 1.2, render: (s) => <ActivePill active={s.is_active} /> },
      ]}
      renderCard={(s) => (
        <View>
          <Text style={cell.cardTitle} numberOfLines={1}>{s.name}</Text>
          <Text style={cell.cardLine} numberOfLines={1}>{s.address}</Text>
          <Text style={cell.muted}>{clientLabel(s)}</Text>
        </View>
      )}
    />
  );
}
