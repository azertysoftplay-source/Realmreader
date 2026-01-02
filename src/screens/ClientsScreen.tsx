import React, {
  useMemo,
  useState,
  useLayoutEffect,
} from "react";
import {
  View,
  Text,
  TextInput,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  useColorScheme,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useQuery, useRealm } from "@realm/react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Realm } from "realm";
import i18n from "../i18n";
import { useTranslation } from "react-i18next";
import { getAuth } from "@react-native-firebase/auth";
import { getApp } from "@react-native-firebase/app";
import { getFirestore, doc, deleteDoc } from "@react-native-firebase/firestore";


/* ================= TYPES ================= */

type Client = Realm.Object & {
  _id: string;
  Clients_id: number;
  Clients_name: string;
  Clients_contact?: string;
  balance: { value: number }[];
};

type RootStackParamList = {
  ClientsDetails: { clientId: string };
};

/* ================= THEMES ================= */

const LightTheme = {
  background: "#FFFFFF",
  card: "#FFFFFF",
  text: "#000000",
  border: "#E0E0E0",
  section: "#F4F4F4",
  primary: "#007AFF",
  danger: "#D32F2F",
};

const DarkTheme = {
  background: "#000000",
  card: "#1C1C1E",
  text: "#FFFFFF",
  border: "#2C2C2E",
  section: "#2C2C2E",
  primary: "#0A84FF",
  danger: "#FF453A",
};

/* ================= SCREEN ================= */

export default function ClientsScreen() {
  const { t, i18n } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const realm = useRealm();
  const clients = useQuery<Client>("Clients_details");

  const scheme = useColorScheme();
  const theme = scheme === "dark" ? DarkTheme : LightTheme;

  const [search, setSearch] = useState("");

  /* ----- MODAL STATE ----- */
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");

  /* ================= HEADER ================= */

  useLayoutEffect(() => {
    navigation.setOptions({
      title:  i18n.t("tabbar.text_product"),
      headerStyle: {
        backgroundColor: theme.card,
      },
      headerTintColor: theme.text,
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            setEditing(null);
            setName("");
            setContact("");
            setShowModal(true);
          }}
          style={{ paddingHorizontal: 12 }}
        >
          <MaterialIcons
            name="person-add-alt-1"
            size={26}
            color={theme.primary}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme,i18n.language]);

  /* ================= SAVE ================= */

  const handleSave = () => {
    if (!name.trim()) return;

    realm.write(() => {
      if (editing) {
        editing.Clients_name = name;
        editing.Clients_contact = contact;
      } else {
        realm.create("Clients_details", {
          _id: `${Date.now()}`,
          Clients_id: Date.now(),
          Clients_name: name,
          Clients_contact: contact,
          balance: [],
          operation: [],
        });
      }
    });

    setShowModal(false);
    setEditing(null);
    setName("");
    setContact("");
  };

  /* ================= DELETE ================= */

 const handleDelete = (client: Client) => {
  Alert.alert(
    "Delete client",
    `Delete ${client.Clients_name}?`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const app = getApp();
            const auth = getAuth(app);
            const user = auth.currentUser;
            if (!user) return;

            const db = getFirestore(app);

            /* 🔥 FIRESTORE DELETE */
            await deleteDoc(
              doc(db, "users", user.uid, "clients", client._id.toString())
            );

            /* 💾 REALM DELETE */
            realm.write(() => {
              realm.delete(client);
            });

          } catch (e: any) {
            Alert.alert("Delete failed", e.message);
          }
        },
      },
    ]
  );
};

  const renderRightActions = (item: Client) => (
    <TouchableOpacity
      onPress={() => handleDelete(item)}
      style={[
        styles.deleteBox,
        { backgroundColor: theme.danger },
      ]}
    >
      <MaterialIcons
        name="delete-outline"
        size={24}
        color="white"
      />
    </TouchableOpacity>
  );

  /* ================= GROUP + FILTER ================= */

  const sections = useMemo(() => {
    let list = [...clients];

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((c) =>
        c.Clients_name.toLowerCase().includes(s)
      );
    }

    list.sort((a, b) =>
      a.Clients_name.localeCompare(b.Clients_name)
    );

    const groups: Record<string, Client[]> = {};
    list.forEach((c) => {
      const letter = c.Clients_name[0].toUpperCase();
      groups[letter] ??= [];
      groups[letter].push(c);
    });

    return Object.keys(groups)
      .sort()
      .map((k) => ({ title: k, data: groups[k] }));
  }, [clients, search]);

  /* ================= UI ================= */

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      <TextInput
        style={[
          styles.search,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        placeholder="Search clients…"
        placeholderTextColor={
          scheme === "dark" ? "#AAA" : "#666"
        }
        value={search}
        onChangeText={setSearch}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item._id}
        renderSectionHeader={({ section }) => (
          <Text
            style={[
              styles.section,
              {
                backgroundColor: theme.section,
                color: theme.text,
              },
            ]}
          >
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <Swipeable
            renderRightActions={() =>
              renderRightActions(item)
            }
          >
            <TouchableOpacity
              style={[
                styles.row,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
                onPress={() =>
    navigation.navigate("ClientsDetails", {
      clientId: item._id,
    })
  }
            >
              <Text
                style={[
                  styles.name,
                  { color: theme.text },
                ]}
              >
                {item.Clients_name}
              </Text>

              {/* <Text
                style={[
                  styles.balance,
                  { color: theme.primary },
                ]}
              >
                {item.balance
                  .reduce((s, b) => s + b.value, 0)
                  .toFixed(2)}
              </Text> */}
            </TouchableOpacity>
          </Swipeable>
        )}
      />

      {/* ================= MODAL ================= */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.card },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: theme.text },
              ]}
            >
              {editing ? "Edit Client" : "Add Client"}
            </Text>

            <TextInput
              placeholder="Client name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              autoFocus
            />

            <TextInput
              placeholder="Contact (optional)"
              placeholderTextColor="#999"
              value={contact}
              onChangeText={setContact}
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
              >
                <Text style={{ color: theme.text }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSave}>
                <Text
                  style={{
                    color: theme.primary,
                    fontWeight: "700",
                  }}
                >
                  {editing ? "Update" : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: {
    margin: 12,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  section: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontWeight: "bold",
  },
  row: {
    padding: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  name: { fontSize: 16 },
  balance: {
    fontSize: 15,
    fontWeight: "bold",
  },
  deleteBox: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
    marginVertical: 4,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "90%",
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
});
