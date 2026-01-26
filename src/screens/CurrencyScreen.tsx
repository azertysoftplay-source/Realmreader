import React, { useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Button,
  Pressable,
  Modal,
} from "react-native";
import { useQuery, useRealm } from "@realm/react";
import { LightColors, useTheme } from "../theme";
import { useTranslation } from "react-i18next";
import { operation } from "../models/Clients_details";
import { getAuth } from "@react-native-firebase/auth";
import { getApp } from "@react-native-firebase/app";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { OperationsStackParamList } from "../stacks/OperationsStack";
type Props = NativeStackScreenProps<
  OperationsStackParamList,
  "OperationsMain"
>;
export default function CurrencyScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const realm = useRealm();
  const currencies = useQuery<any>("currency").filtered(
  "deleted == false OR deleted == null"
);
const operations = useQuery<any>("operation").filtered(
  "deleted == false OR deleted == null"
);

  const { t, i18n } = useTranslation();

  const [name, setName] = useState("");
    const auth = getAuth(getApp());
    const user = auth.currentUser;

  // ✅ STORE IDS ONLY
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toDeleteId, setToDeleteId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  useLayoutEffect(() => {
    navigation.setOptions({
      title: i18n.t("tabbar.text_order"),
      headerStyle: { backgroundColor: theme.card },
      headerTintColor: theme.text,
    });
  }, [navigation,i18n,theme]);

  // ✅ RESOLVE REALM OBJECTS SAFELY
  const selected = selectedId
    ? realm.objectForPrimaryKey("currency", selectedId)
    : null;

  const toDelete = toDeleteId
    ? realm.objectForPrimaryKey("currency", toDeleteId)
    : null;

  const handleAdd = () => {
    if (!name.trim()) return;

    const currenciesSorted = realm.objects("currency").sorted("currency_id", true);
    const ID =
      currenciesSorted.length > 0
        ? Number(currenciesSorted[0].currency_id) + 1
        : 1;

   realm.write(() => {
  realm.create("currency", {
    _id: `${user.uid.toString()}${ID.toString()}`,
    currency_id: ID,
    name,

    createdAt: new Date(),
    updatedAt: new Date(),
    deleted: false, // soft delete flag
  });
});


    setName("");
  };

  const handleUpdate = () => {
    if (!selected || !name.trim()) return;

    realm.write(() => {
      selected.name = name;
      selected.createdAt= new Date();
    selected.updatedAt= new Date();
    });

    setSelectedId(null);
    setName("");
  };

  const confirmDelete = () => {
    if (!toDelete) return;

   realm.write(() => {
  toDelete.deleted = true;
  toDelete.updatedAt = new Date();
});

    setShowModal(false);
    setToDeleteId(null);

    if (selectedId === toDeleteId) {
      setSelectedId(null);
      setName("");
    }
  };

  const handleLongPress = (item: any) => {
    setToDeleteId(item._id);
    setShowModal(true);
  };

  const handleSelect = (item: any) => {
    setSelectedId(item._id);
    setName(item.name);
  };

  const calculateTotal = (item: any) => {
    const sum = operations
      .filtered('currency._id == $0 AND type != "check" AND (deleted == false OR deleted == null)', item._id)
      .sum("value");

    return Number(sum).toFixed(2);
  };

  const getColor = (value: number) =>
    value >= 0 ? LightColors.success : LightColors.danger;

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {/* <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 10 }}>
        Currency Management
      </Text> */}

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={i18n.t("inputs.currency_name")}
        placeholderTextColor={theme.placeholder}
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.input,
          color: theme.text,
          borderRadius: 8,
          padding: 10,
          marginBottom: 10,
        }}
      />

      {selected ? (
        <>
          <Button title={i18n.t("alert.update")}  onPress={handleUpdate} />
          <View style={{ height: 10 }} />
          <Button
            title={i18n.t('common.text_cancel')}
            onPress={() => {
              setSelectedId(null);
              setName("");
            }}
            color="gray"
          />
        </>
      ) : (
        <Button title={i18n.t("currency.add")}onPress={handleAdd} />
      )}

      <View style={{ height: 20 }} />

      <FlatList
        data={currencies}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const total = Number(calculateTotal(item));

          return (
            <Pressable onLongPress={() => handleLongPress(item)}>
              <View
                style={{
                  padding: 15,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.input,
                  borderRadius: 8,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <Pressable onPress={() => handleSelect(item)} style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, color: theme.text }}>
                    {item.name}
                  </Text>
                </Pressable>

                <View
                  style={{
                    backgroundColor: getColor(total),
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 5,
                  }}
                >
                  <Text style={{ color: "white" }}>{total}</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <Modal visible={showModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              width: "100%",
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 25,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "700", color: theme.text }}>
 {i18n.t("alert.delete_operation_text")}            </Text>

            <Text style={{ marginVertical: 20, color: theme.text }}>
              {i18n.t("alert.deletecurrency")}
            </Text>

            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <Pressable onPress={() => setShowModal(false)}>
                <Text style={{ color: theme.text, marginRight: 20 }}>
                                {i18n.t("common.text_cancel")}

                </Text>
              </Pressable>

              <Pressable onPress={confirmDelete}>
                <Text style={{ color: "#D32F2F", fontWeight: "600" }}>
                                                  {i18n.t("alert.delete")}

                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
