import React from "react";
import { TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import { useColorScheme } from "react-native";

type IconType = "MaterialIcons" | "Ionicons" | "Feather";

type Props = {
  name: string;
  size?: number;
  color?: string;
  type?: IconType;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function Icon({
  name,
  size = 24,
  color,
  type = "MaterialIcons",
  onPress,
  style,
}: Props) {
  const scheme = useColorScheme();
  const iconColor = color ?? (scheme === "dark" ? "#FFF" : "#000");

  const IconComponent =
    type === "Ionicons"
      ? Ionicons
      : type === "Feather"
      ? Feather
      : MaterialIcons;

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={style}>
        <IconComponent name={name} size={size} color={iconColor} type = "MaterialIcons" />
      </TouchableOpacity>
    );
  }

  return <IconComponent name={name} size={size} color={iconColor}  />;
}
