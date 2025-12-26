import { getFirestore, writeBatch, doc } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

const migrateClientsToFirestore = async (realm: any, user: any, onProgress: (percent: number) => void) => {
  const db = getFirestore();
  const userId = user.uid;

  const clients = realm.objects('Clients_details');
  const currencies = realm.objects('currency');

  // 1. Calculate Total Work Items
  let totalWorkItems = currencies.length;
  clients.forEach((c: any) => {
    totalWorkItems += 1; // The client
    totalWorkItems += c.balance.length;
    totalWorkItems += c.operation.length;
  });

  let processedCount = 0;
  let batch = writeBatch(db);
  let batchCounter = 0;

  // Helper to commit and prevent UI freezing
  const commitIfFull = async (force = false) => {
    batchCounter++;
    processedCount++;
    
    // Update Progress
    const progress = Math.floor((processedCount / totalWorkItems) * 100);
    onProgress(progress);

    // Commit every 400 items or when forced at the end
    if (batchCounter >= 400 || force) {
      await batch.commit();
      batch = writeBatch(db);
      batchCounter = 0;
      // THE FIX FOR 7%: Yield the thread to let the UI update
      await new Promise<void>(resolve => setTimeout(() => resolve(), 10));
    }
  };

  // 2. Migrate Currencies
  for (const cur of currencies) {
    const curRef = doc(db, 'currencies', String(cur._id));
    batch.set(curRef, {
      currency_id: cur.currency_id,
      name: cur.name,
      userId: userId,
    }, { merge: true });
    await commitIfFull();
  }

  // 3. Migrate Clients & Nested Data
  for (const client of clients) {
    const clientRef = doc(db, 'clients', String(client._id));
    batch.set(clientRef, {
      Clients_id: client.Clients_id,
      Clients_name: client.Clients_name,
      Clients_contact: client.Clients_contact,
      userId: userId,
    }, { merge: true });
    await commitIfFull();

    // Inner Balances
    for (const bal of client.balance) {
      const balRef = doc(db, 'balances', String(bal._id));
      batch.set(balRef, {
        client_id: String(client._id),
        balance_id: bal.balance_id || "",
        value: bal.value || 0,
        currency: bal.currency?._id || null,
        userId: userId,
      }, { merge: true });
      await commitIfFull();
    }

    // Inner Operations
    for (const op of client.operation) {
      const opRef = doc(db, 'operations', String(op._id));
      batch.set(opRef, {
        client_id: String(client._id),
        operation_id: op.operation_id || "",
        type: op.type || "",
        value: op.value || 0,
        currency: op.currency?._id || null,
        time: op.time ? op.time.toISOString() : null,
        desc: op.desc || '',
        userId: userId,
      }, { merge: true });
      await commitIfFull();
    }
  }

  // Final Cleanup
  if (batchCounter > 0) {
    await batch.commit();
  }
};

export default migrateClientsToFirestore;