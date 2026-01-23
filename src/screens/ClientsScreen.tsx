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
import { ClientsDetails, Currency } from "../realm/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";


/* ================= TYPES ================= */


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
const convertToBase = (
  amount: number,
  fromId: string,
  baseId: string,
  rates: Record<string, number>
) => {
  if (fromId === baseId) return amount;

  const direct = rates[`${fromId}_${baseId}`];
  if (direct) return amount * direct;

  const inverse = rates[`${baseId}_${fromId}`];
  if (inverse) return amount / inverse;

  return 0; // ❗ no rate defined
};

/* ================= SCREEN ================= */

export default function ClientsScreen() {
  const { t, i18n } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const realm = useRealm();
  const clients = useQuery<ClientsDetails>("Clients_details").filtered(
  "deleted == false OR deleted == null"
);

  const scheme = useColorScheme();
  const theme = scheme === "dark" ? DarkTheme : LightTheme;

  const [search, setSearch] = useState("");
  const [baseCurrencyId, setBaseCurrencyId] = useState<string | null>(null);
const [rates, setRates] = useState<Record<string, number>>({});


  /* ----- MODAL STATE ----- */
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ClientsDetails | null>(null);
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
 


  useEffect(() => {
  const load = async () => {
    const base = await AsyncStorage.getItem("defaultCurrency");
    const json = await AsyncStorage.getItem("exchangeRates");

    setBaseCurrencyId(base);
    setRates(json ? JSON.parse(json) : {});
  };

  load();

  // 🔄 realtime update when screen is focused
  const unsubscribe = navigation.addListener("focus", load);
  return unsubscribe;
}, [navigation]);
 







const getClientBalance = (clientId: string) => {
  if (!baseCurrencyId) return 0;

  const ops = realm
    .objects("operation")
    .filtered(
      "client_id == $0 AND deleted != true AND type != 'check'",
      clientId
    );

  let total = 0;

  ops.forEach((op: any) => {
    total += convertToBase(
      op.value,
      op.currency._id,
      baseCurrencyId,
      rates
    );
  });

  return total;
};
const currencies = useQuery<Currency>("currency")
  .filtered("deleted == false OR deleted == null");
const baseCurrency = useMemo<Currency | null>(() => {
  return currencies.find(c => c._id === baseCurrencyId) ?? null;
}, [currencies, baseCurrencyId]);

  /* ================= SAVE ================= */

  const handleSave = () => {
    if (!name.trim()) return;

   realm.write(() => {
  const now = new Date();

  if (editing) {
    editing.Clients_name = name;
    editing.Clients_contact = contact;
    editing.updatedAt = now; // ✅
  } else {
    realm.create("Clients_details", {
      _id: `${Date.now()}`,
      Clients_id: Date.now(),
      Clients_name: name,
      Clients_contact: contact,
      balance: [],
      operation: [],

      createdAt: now, // ✅
      updatedAt: now, // ✅
      deleted: false, // ✅
    });
  }
});


    setShowModal(false);
    setEditing(null);
    setName("");
    setContact("");
  };

  /* ================= DELETE ================= */

 const handleDelete = (client: ClientsDetails) => {
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
         

            /* 💾 REALM DELETE */
            realm.write(() => {
              client.deleted=true
              client.updatedAt= new Date()
            });

          } catch (e: any) {
            Alert.alert("Delete failed", e.message);
          }
        },
      },
    ]
  );
};

  const renderRightActions = (item: ClientsDetails) => (
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

    const groups: Record<string, ClientsDetails[]> = {};
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

               <Text
    style={[
      styles.balance,
      {
        color: getClientBalance(item._id) >= 0
          ? "#2E7D32"
          : "#C62828",
      },
    ]}
  >
    {getClientBalance(item._id).toFixed(2)}{" "}
    { baseCurrency?.name}
  </Text>
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
