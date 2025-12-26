import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useObject } from '@realm/react';
import { OperationsStackParamList } from '../stacks/OperationsStack';
import { operation } from '../models/Clients_details';

type OperationDetailsRouteProp = RouteProp<
  OperationsStackParamList,
  'OperationDetails'
>;

export default function OperationDetails() {
  const route = useRoute<OperationDetailsRouteProp>();
  const { operationId } = route.params;

  // Typed Realm object
  const op = useObject(operation, operationId);

  if (!op) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Operation not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Operation Details</Text>

      <Text style={styles.item}>ID: {op.operation_id}</Text>
      <Text style={styles.item}>Type: {op.type}</Text>
      <Text style={styles.item}>Value: {op.value}</Text>
      <Text style={styles.item}>
        Currency: {op.currency ? op.currency.name : 'N/A'}
      </Text>
      <Text style={styles.item}>
        Date: {op.time ? op.time.toString() : 'No Date'}
      </Text>
      <Text style={styles.item}>Description: {op.desc ?? 'No description'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { fontSize: 18, color: 'red' },
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 16 },
  item: { fontSize: 16, marginBottom: 8 },
});
