import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  writeBatch,
  doc,
} from "@react-native-firebase/firestore";

/**
 * Migrate Realm → Firestore (MODULAR, BATCHED, TS-SAFE)
 */
const migrateClientsToFirestore = async (
  realmRaw: any,
  user: any,
  onProgress: (percent: number) => void
) => {
  if (!user) throw new Error("User not signed in");

  // 🔥 THE IMPORTANT FIX (Realm typing)
  const realm = realmRaw as any;

  const app = getApp();
  const db = getFirestore(app);
  const userId = user.uid;

  const clients = realm.objects("Clients_details");
  const currencies = realm.objects("currency");

  /* ---------------- CALCULATE WORK ---------------- */
  let totalWorkItems = currencies.length;

  clients.forEach((c: any) => {
    totalWorkItems += 1; // client
    totalWorkItems += c.balance.length;
    totalWorkItems += c.operation.length;
  });

  let processedCount = 0;
  let batch = writeBatch(db);
  let batchCounter = 0;

  /* ---------------- BATCH HELPER ---------------- */
  const commitIfFull = async (force = false) => {
    batchCounter++;
    processedCount++;

    const progress = Math.floor(
      (processedCount / totalWorkItems) * 100
    );
    onProgress(progress);

    if (batchCounter >= 400 || force) {
      await batch.commit();
      batch = writeBatch(db);
      batchCounter = 0;

      // yield to UI thread (prevents freeze)
      await new Promise<void>((r) => setTimeout(r, 10));
    }
  };

  /* ---------------- CURRENCIES ---------------- */
  for (const cur of currencies) {
    const curRef = doc(db, "currencies", String(cur._id));

    batch.set(
      curRef,
      {
        currency_id: cur.currency_id,
        name: cur.name,
        userId,
      },
      { merge: true }
    );

    await commitIfFull();
  }

  /* ---------------- CLIENTS + NESTED DATA ---------------- */
  for (const client of clients) {
    const clientRef = doc(db, "clients", String(client._id));

    batch.set(
      clientRef,
      {
        Clients_id: client.Clients_id,
        Clients_name: client.Clients_name,
        Clients_contact: client.Clients_contact,
        userId,
      },
      { merge: true }
    );

    await commitIfFull();

    /* ---- BALANCES ---- */
    for (const bal of client.balance) {
      const balRef = doc(db, "balances", String(bal._id));

      batch.set(
        balRef,
        {
          client_id: String(client._id),
          balance_id: bal.balance_id || "",
          value: bal.value || 0,
          currency: bal.currency?._id || null,
          userId,
        },
        { merge: true }
      );

      await commitIfFull();
    }

    /* ---- OPERATIONS ---- */
    for (const op of client.operation) {
      const opRef = doc(db, "operations", String(op._id));

      batch.set(
        opRef,
        {
          client_id: String(client._id),
          operation_id: op.operation_id || "",
          type: op.type || "",
          value: op.value || 0,
          currency: op.currency?._id || null,
          time: op.time ? op.time.toISOString() : null,
          desc: op.desc || "",
          userId,
        },
        { merge: true }
      );

      await commitIfFull();
    }
  }

  /* ---------------- FINAL COMMIT ---------------- */
  if (batchCounter > 0) {
    await batch.commit();
  }
};

export default migrateClientsToFirestore;
