import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { getAuth, AppleAuthProvider, signInWithCredential, EmailAuthProvider } from "@react-native-firebase/auth";
import appleAuth, { AppleButton } from "@invertase/react-native-apple-authentication";

export default function LoginScreen() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  /* ================= EMAIL LOGIN ================= */
  const loginWithEmail = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    try {
      setLoading(true);
      const auth = getAuth();

            const credential =EmailAuthProvider.credential(
              email.trim(),
              password
            );

      await signInWithCredential(auth, credential);
    } catch (error: any) {
      let message = "Login failed";
      if (error.code === "auth/user-not-found") message = "User not found";
      else if (error.code === "auth/wrong-password") message = "Wrong password";
      else if (error.code === "auth/invalid-email") message = "Invalid email";
      Alert.alert("Login Error", message);
    } finally {
      setLoading(false);
    }
  };

  /* ================= APPLE SIGN-IN ================= */
  const loginWithApple = async () => {
    try {
      if (Platform.OS !== "ios" || !appleAuth.isSupported) {
        Alert.alert("Apple Sign-In not supported on this device");
        return;
      }

      const appleAuthResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [
          appleAuth.Scope.EMAIL,
          appleAuth.Scope.FULL_NAME,
        ],
      });
            const auth = getAuth();


      const { identityToken, nonce, user } = appleAuthResponse;

      if (!identityToken) throw new Error("Apple Sign-In failed: no token returned");

      const appleCredential = AppleAuthProvider.credential(identityToken, nonce);

      await signInWithCredential(auth,appleCredential);

    } catch (err: any) {
      console.error("Apple Sign-In error", err);
      Alert.alert("Apple Sign-In failed", err.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back</Text>

        {/* Email login */}
        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={loginWithEmail}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>

        {/* Apple Sign-In */}
        {Platform.OS === "ios" && appleAuth.isSupported && (
          <AppleButton
            buttonStyle={AppleButton.Style.BLACK}
            buttonType={AppleButton.Type.SIGN_IN}
            style={{ width: "100%", height: 44, marginTop: 12 }}
            onPress={loginWithApple}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#F2F2F7" },
  card: { backgroundColor: "#FFF", borderRadius: 12, padding: 20, elevation: 3 },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 20 },
  input: { borderWidth: 1, borderColor: "#DDD", borderRadius: 8, padding: 12, marginBottom: 12 },
  button: { backgroundColor: "#007AFF", padding: 14, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
});
