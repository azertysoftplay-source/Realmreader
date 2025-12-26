import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SettingsAdvanced() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Advanced Settings</Text>

      <Text style={styles.item}>• Clear cache</Text>
      <Text style={styles.item}>• Reset application</Text>
      <Text style={styles.item}>• Export debug logs</Text>
      <Text style={styles.item}>• Developer options</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 15,
  },
  item: {
    fontSize: 16,
    paddingVertical: 6,
  },
});
