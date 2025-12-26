import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ClientsScreen from "../screens/ClientsScreen";
import ClientsDetailsScreen from "../screens/ClientDetails";
import i18n from "../i18n";
export type ClientsStackParamList = {
  ClientsList: undefined;
  ClientsDetails: { clientId: string };
};

const Stack = createNativeStackNavigator<ClientsStackParamList>();

export default function ClientsStack() {
  return (
    <Stack.Navigator id='ClientsStack' key={i18n.language}>
      <Stack.Screen 
        name="ClientsList" 
        component={ClientsScreen}
        options={{ title: i18n.t("tabbar.text_product") }}
      />
      <Stack.Screen 
        name="ClientsDetails" 
        component={ClientsDetailsScreen}
        options={{ title: "Client Details" }}
      />
    </Stack.Navigator>
  );
}
