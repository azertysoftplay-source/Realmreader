import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OperationsScreen from '../screens/OperationsScreen';
import OperationDetails from '../screens/OperationDetails';
import CurrencyScreen from '../screens/CurrencyScreen';
import i18n from '../i18n';

export type OperationsStackParamList = {
  OperationsMain: undefined;
  OperationDetails: { operationId: string };
};

const Stack = createNativeStackNavigator<OperationsStackParamList>();

export default function OperationsStack() {
  return (
    <Stack.Navigator id="OperationsStack">
      <Stack.Screen name="OperationsMain" component={CurrencyScreen} options={{ title: i18n.t("tabbar.text_order") }} />
      <Stack.Screen name="OperationDetails" component={OperationDetails} options={{ title: 'Details' }} />
    </Stack.Navigator>
  );
}
