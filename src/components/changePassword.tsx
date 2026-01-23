import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  StyleSheet,
} from "react-native";
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "@react-native-firebase/auth";
import { getApp } from "@react-native-firebase/app";
import { useTheme } from "../theme";
import i18n from "../i18n";

export default function ChangePasswordSection() {
  const { theme } = useTheme();

 

const auth = getAuth(getApp());
   const user = auth.currentUser;

  // 🔐 Only show for EMAIL/PASSWORD users
  const isPasswordUser = user?.providerData.some(
    p => p.providerId === "password"
  );

  const [visible, setVisible] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  if (!isPasswordUser) return null; // 🚫 Apple users never see it

  /* ---------------- PASSWORD STRENGTH ---------------- */
  const getStrength = (pwd: string) => {
    if (pwd.length < 6) return { label: "Weak", color: "#FF3B30" };
    if (pwd.length < 10) return { label: "Medium", color: "#FF9500" };
    return { label: "Strong", color: "#34C759" };
  };

  /* ---------------- SAVE PASSWORD ---------------- */
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert("Error", "New password must be different");
      return;
    }

    try {
      if (!user?.email) return;

      const credential =EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      await reauthenticateWithCredential(user,credential);
      await updatePassword(user,newPassword);

      Alert.alert(
        i18n.t("common.success"),
        i18n.t("settings.passwordUpdated")
      );

      setVisible(false);
      setCurrentPassword("");
      setNewPassword("");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Password update failed");
    }
  };

  return (
    <>
      {/* ---------- OPEN BUTTON ---------- */}
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={[styles.card, { backgroundColor: theme.card }]}
      >
        <Text style={[styles.title, { color: theme.text }]}>
          {i18n.t("settings.changePassword")}
        </Text> 
      </TouchableOpacity>

      {/* ---------- MODAL ---------- */}
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {i18n.t("settings.changePassword")}
            </Text>

            {/* CURRENT PASSWORD */}
            <View style={[styles.inputWrapper, { borderColor: theme.border }]}>
              <TextInput
                placeholder={i18n.t("settings.currentPassword")}
                secureTextEntry={!showCurrent}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                style={[styles.input, { color: theme.text }]}
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                <Text style={styles.eye}>{showCurrent ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>

            {/* NEW PASSWORD */}
            <View style={[styles.inputWrapper, { borderColor: theme.border }]}>
              <TextInput
                placeholder={i18n.t("settings.newPassword")}
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
                style={[styles.input, { color: theme.text }]}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                <Text style={styles.eye}>{showNew ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>

            {/* STRENGTH */}
            {newPassword.length > 0 && (
              <Text
                style={{
                  marginTop: 6,
                  color: getStrength(newPassword).color,
                  fontWeight: "600",
                }}
              >
                {i18n.t("settings.passwordStrength")}:{" "}
                {getStrength(newPassword).label}
              </Text>
            )}

            {/* ACTIONS */}
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={{ color: theme.text }}>
                  {i18n.t("common.text_cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleChangePassword}>
                <Text style={{ color: theme.success, fontWeight: "700" }}>
                  {i18n.t("common.text_button_save")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 14,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 15,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
  },
  eye: {
    fontSize: 18,
    paddingHorizontal: 6,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
    marginTop: 15,
  },
});
