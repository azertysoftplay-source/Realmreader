import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../auth/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import TabNavigator from "./TabNavigator";

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return user ? <TabNavigator /> : <LoginScreen />;
}
