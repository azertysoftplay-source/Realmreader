import "react-native-gesture-handler"; // 🔥 MUST BE FIRST
import "./src/i18n";

import RNBootSplash from "react-native-bootsplash";
import React, { useState, useEffect } from "react";
import { I18nManager, ActivityIndicator, View } from "react-native";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { RealmProvider } from "@realm/react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ThemeProvider, useTheme } from "./src/theme";
import { AuthProvider } from "./src/auth/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { Clients_details, balance, operation, currency } from "./src/models/Clients_details";

// ✅ MODULAR AUTH
import { getAuth, onAuthStateChanged } from "@react-native-firebase/auth";

// RTL configuration
I18nManager.allowRTL(true);
I18nManager.forceRTL(false);

function AppNavigation() {
  const { isDark } = useTheme();

  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}

// --- DYNAMIC REALM HANDLER ---
function RealmWrapper({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    RNBootSplash.hide({ fade: true });

    const auth = getAuth();

    // ✅ MODULAR LISTENER
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : "guest");
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <RealmProvider
      key={userId} // 🔥 forces Realm reload per user
      schema={[Clients_details, balance, operation, currency]}
      schemaVersion={5}
   onMigration={(oldRealm, newRealm) => {
  if (oldRealm.schemaVersion < 5) {
    const now = new Date();

    const init = (obj: any) => {
      if (obj.createdAt == null) obj.createdAt = now;
      if (obj.updatedAt == null) obj.updatedAt = now;
      if (obj.deleted == null) obj.deleted = false;
    };

    newRealm.objects("Clients_details").forEach(init);
    newRealm.objects("operation").forEach(init);
    newRealm.objects("currency").forEach(init);
    newRealm.objects("balance").forEach(init);
  }
}}

      path={userId ? `user_${userId}.realm` : "default.realm"}
    >
      {children}
    </RealmProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <RealmWrapper>
            <AppNavigation />
          </RealmWrapper>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
