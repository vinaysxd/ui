import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { getAllStaff, Staff } from "../../../src/services/staff.service";
import DirectoryScreen, { ActivePill, Avatar, cell } from "../../../src/components/admin/DirectoryScreen";

// Module-level so the list screen's memoised filtering stays stable between renders.
const isActive = (s: Staff) => s.is_active;
const searchFields = (s: Staff) => [s.full_name, s.email, s.phone];

export default function StaffScreen() {
  const router = useRouter();

  return (
    <DirectoryScreen<Staff>
      title="Team Members"
      noun={["staff member", "staff members"]}
      icon="people-outline"
      actionLabel="Invite Staff"
      actionIcon="person-add-outline"
      onAction={() => router.push("/(admin)/staff/invite")}
      load={getAllStaff}
      getKey={(s) => s.id}
      isActive={isActive}
      searchFields={searchFields}
      searchPlaceholder="Search by name, email or phone"
      onOpen={(s) => router.push(`/(admin)/staff/${s.profile_id}`)}
      columns={[
        {
          label: "Name",
          flex: 2.5,
          render: (s) => (
            <View style={cell.nameRow}>
              <Avatar name={s.full_name} />
              <Text style={cell.primary} numberOfLines={1}>{s.full_name}</Text>
            </View>
          ),
        },
        { label: "Email", flex: 2.5, render: (s) => <Text style={cell.secondary} numberOfLines={1}>{s.email}</Text> },
        { label: "Phone", flex: 1.5, render: (s) => <Text style={cell.secondary}>{s.phone || "—"}</Text> },
        { label: "Status", flex: 1.2, render: (s) => <ActivePill active={s.is_active} /> },
      ]}
      renderCard={(s) => (
        <View style={cell.nameRow}>
          <Avatar name={s.full_name} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={cell.cardTitle} numberOfLines={1}>{s.full_name}</Text>
            <Text style={cell.cardLine} numberOfLines={1}>{s.email}</Text>
            {s.phone ? <Text style={cell.muted}>{s.phone}</Text> : null}
          </View>
        </View>
      )}
    />
  );
}
