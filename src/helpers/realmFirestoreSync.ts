import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  writeBatch,
  doc,
  serverTimestamp,
} from "@react-native-firebase/firestore";

/**
 * Migrate Realm → Firestore (SAFE + SOFT DELETE READY)
 */
const migrateClientsToFirestore = async (
  realmRaw: any,
  user: any,
  onProgress: (percent: number) => void
) => {
  if (!user) throw new Error("User not signed in");

  const realm = realmRaw as any;

  const app = getApp();
  const db = getFirestore(app);
  const userId = user.uid;

  const clients = realm.objects("Clients_details");
  const currencies = realm.objects("currency");
  const operations= realm.objects("operation");

  /* ---------------- CALCULATE WORK ---------------- */
  let totalWorkItems = currencies.length;

  clients.forEach((c: any) => {
    totalWorkItems += 1;
    totalWorkItems += c.balance.length;
    totalWorkItems += c.operation.length;
  });

  let processedCount = 0;
  let batch = writeBatch(db);
  let batchCounter = 0;

  const commitIfFull = async (force = false) => {
    batchCounter++;
    processedCount++;

    onProgress(
      Math.floor((processedCount / totalWorkItems) * 100)
    );

    if (batchCounter >= 400 || force) {
      await batch.commit();
      batch = writeBatch(db);
      batchCounter = 0;
      await new Promise<void>((resolve) =>
  setTimeout(() => resolve(), 10)
);
    }
  };

  /* ---------------- CURRENCIES ---------------- */
  for (const cur of currencies) {
    batch.set(
      doc(db, "currencies", String(cur._id)),
      {
        currency_id: cur.currency_id,
        createdAt:cur.createdAt,
        name: cur.name,
        userId,
        deleted: cur.deleted,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await commitIfFull();
  }

  /* ---------------- CLIENTS ---------------- */
  for (const client of clients) {
    const clientRef = doc(db, "clients", String(client._id));

    batch.set(
      clientRef,
      {
        Clients_id: client.Clients_id,
        Clients_name: client.Clients_name,
        Clients_contact: client.Clients_contact,
        userId,
        deleted: client.deleted,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await commitIfFull();

    /* ---- BALANCES (ONLY THIS CLIENT) ---- */
    for (const bal of client.balance) {
      batch.set(
        doc(db, "balances", String(bal._id)),
        {
          client_id: String(client._id),
          balance_id: bal.balance_id,
          value: bal.value,
          currency: bal.currency?._id ?? null,
          userId,
          deleted: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await commitIfFull();
    }

    /* ---- OPERATIONS (FIXED) ---- */
    
  }
 for (const op of operations) {
  batch.set(
    doc(db, "operations", String(op._id)),
    {
      client_id: op.client_id,
      operation_id: op.operation_id,
      type: op.type,
      value: op.value,
      currency: op.currency?._id ?? null,
      // FIX: Convert Realm date to JS Date
      time: op.time ? new Date(op.time) : null,
      desc: op.desc ?? "",
      userId,
      deleted: op.deleted,
      createdAt: op.createdAt ? new Date(op.createdAt) : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await commitIfFull();
}


  if (batchCounter > 0) {
    await batch.commit();
  }
};

export default migrateClientsToFirestore;
