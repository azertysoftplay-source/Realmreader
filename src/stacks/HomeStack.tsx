import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import HomeDetails from '../screens/HomeDetails';
import { useTranslation } from 'react-i18next';

export type HomeStackParamList = {
  HomeMain: undefined;
  HomeDetails: { id: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  const { t, i18n } = useTranslation();

  return (
    <Stack.Navigator
      id="HomeStack"
      // This forces re-render when language changes
      key={i18n.language}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: t("account.text_Hello") }}
      />
      <Stack.Screen
        name="HomeDetails"
        component={HomeDetails}
        options={{ title: t("details") }}
      />
    </Stack.Navigator>
  );
}
