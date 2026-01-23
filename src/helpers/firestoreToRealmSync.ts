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
  if (typeof v?.toDate === "function") return v.toDate(); // Firestore Timestamp
  return new Date(v);
};

const migrateFirestoreToRealm = async (realmRaw: Realm, user: any) => {
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
    });

    /* ---------- OPERATIONS ---------- */
    operationsSnap.forEach((docSnap) => {
      const d = docSnap.data();

      // 🔥 skip soft-deleted operations
      //if (d.deleted === true) return;

      const client = realm.objectForPrimaryKey(
        "Clients_details",
        d.client_id
      );
      if (!client || client.deleted) return;

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
    });
  });

};

export default migrateFirestoreToRealm;
