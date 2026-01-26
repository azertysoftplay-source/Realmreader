import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/Ionicons";
import HomeStack from "../stacks/HomeStack";
import ClientsStack from "../stacks/ClientsStack";
import OperationsStack from "../stacks/OperationsStack";
import SettingsStack from "../stacks/SettingsStack";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme";

export type RootTabParamList = {
  HomeTab: undefined;
  ClientsTab: undefined;
  OperationsTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function TabNavigator() {
   const { t, i18n } = useTranslation();
    const { theme, isDark } = useTheme();
  return (
    <Tab.Navigator
      id="MainTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let icon = "home-outline";

          switch (route.name) {
            case "ClientsTab":
              icon = "people-outline";
              break;
            case "OperationsTab":
              icon = "repeat-outline";
              break;
            case "SettingsTab":
              icon = "settings-outline";
              break;
          }

          return <Icon name={icon} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: ({ color }) => (
            <Text style={{ color }}>{i18n.t("tabbar.text_home")}</Text>
          ),
        }}
      />

      <Tab.Screen
        name="ClientsTab"
        component={ClientsStack}
        options={{
          tabBarLabel: ({ color }) => (
            <Text style={{ color }}>{i18n.t("tabbar.text_product")}</Text>
          ),
        }}
      />

      <Tab.Screen
        name="OperationsTab"
        component={OperationsStack}
        options={{
          tabBarLabel: ({ color }) => (
            <Text style={{ color }}>{i18n.t("tabbar.text_order")}</Text>
          ),
        }}
      />

      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{
          tabBarLabel: ({ color }) => (
            <Text style={{ color }}>{i18n.t("account.text_setting")}</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
