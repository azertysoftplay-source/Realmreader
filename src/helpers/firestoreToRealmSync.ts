import Realm from "realm";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "@react-native-firebase/firestore";

const toDate = (v: any): Date => {
  if (!v) return new Date();
  if (v instanceof Date) return v;
  if (typeof v?.toDate === "function") return v.toDate();
  return new Date(v);
};

/**
 * @param realmRaw Realm instance
 * @param user Firebase user
 * @param onProgress optional progress callback (0 → 1)
 */
const migrateFirestoreToRealm = async (
  realmRaw: Realm,
  user: any,
  onProgress?: (progress: number) => void
) => {
  if (!user) throw new Error("User not signed in");

  const realm = realmRaw as any;
  const userId = user.uid;

  const app = getApp();
  const db = getFirestore(app);

  console.log("📥 Fetching data from Firestore...");

  const [clientsSnap, currenciesSnap, operationsSnap] = await Promise.all([
    getDocs(query(collection(db, "clients"), where("userId", "==", userId))),
    getDocs(query(collection(db, "currencies"), where("userId", "==", userId))),
    getDocs(query(collection(db, "operations"), where("userId", "==", userId))),
  ]);

  const total =
    currenciesSnap.size +
    clientsSnap.size +
    operationsSnap.size;

  let processed = 0;
  const tick = () => {
    processed++;
    onProgress?.(processed / total);
  };

  realm.write(() => {
    /* ---------- CURRENCIES ---------- */
    currenciesSnap.forEach((docSnap) => {
      const d = docSnap.data();

      realm.create(
        "currency",
        {
          _id: docSnap.id,
          currency_id: d.currency_id,
          name: d.name,
          createdAt: toDate(d.createdAt),
          updatedAt: toDate(d.updatedAt),
          deleted: d.deleted ?? false,
        },
        Realm.UpdateMode.Modified
      );

      tick();
    });

    /* ---------- CLIENTS ---------- */
    clientsSnap.forEach((docSnap) => {
      const d = docSnap.data();

      realm.create(
        "Clients_details",
        {
          _id: docSnap.id,
          Clients_id: d.Clients_id,
          Clients_name: d.Clients_name,
          Clients_contact: d.Clients_contact,
          createdAt: toDate(d.createdAt),
          updatedAt: toDate(d.updatedAt),
          deleted: d.deleted ?? false,
          balance: [],
          operation: [],
        },
        Realm.UpdateMode.Modified
      );

      tick();
    });

    /* ---------- OPERATIONS ---------- */
    operationsSnap.forEach((docSnap) => {
      const d = docSnap.data();

      const client = realm.objectForPrimaryKey(
        "Clients_details",
        d.client_id
      );
      if (!client || client.deleted) {
        tick();
        return;
      }

      const op = realm.create(
        "operation",
        {
          _id: docSnap.id,
          client_id: d.client_id,
          operation_id: d.operation_id,
          type: d.type,
          value: d.value,
          currency: d.currency
            ? realm.objectForPrimaryKey("currency", d.currency)
            : null,
          time: d.time ? toDate(d.time) : null,
          desc: d.desc || "",
          createdAt: toDate(d.createdAt),
          updatedAt: toDate(d.updatedAt),
          deleted: d.deleted ?? false,
        },
        Realm.UpdateMode.Modified
      );

      if (!client.operation.some((o: any) => o._id === op._id)) {
        client.operation.push(op);
      }

      tick();
    });
  });

  onProgress?.(1); // ✅ ensure 100%
};

export default migrateFirestoreToRealm;
