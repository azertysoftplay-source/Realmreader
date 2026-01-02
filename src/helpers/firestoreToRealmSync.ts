import Realm from "realm";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "@react-native-firebase/firestore";

const migrateFirestoreToRealm = async (realmRaw: Realm, user: any) => {
  if (!user) throw new Error("User not signed in");

  // 🔥 THIS IS THE FIX
  const realm = realmRaw as any;

  const userId = user.uid;
  const app = getApp();
  const db = getFirestore(app);

  console.log("📥 Fetching data from Firestore...");

  const [
    clientsSnap,
    currenciesSnap,
    operationsSnap,
  ] = await Promise.all([
    getDocs(query(collection(db, "clients"), where("userId", "==", userId))),
    getDocs(query(collection(db, "currencies"), where("userId", "==", userId))),
    getDocs(query(collection(db, "operations"), where("userId", "==", userId))),
  ]);

  realm.write(() => {
    /* ---- CURRENCIES ---- */
    currenciesSnap.forEach((docSnap) => {
      const data = docSnap.data();

      realm.create(
        "currency",
        {
          _id: docSnap.id,
          currency_id: data.currency_id,
          name: data.name,
        },
        Realm.UpdateMode.Modified
      );
    });

    /* ---- CLIENTS ---- */
    clientsSnap.forEach((docSnap) => {
      const data = docSnap.data();

      realm.create(
        "Clients_details",
        {
          _id: docSnap.id,
          Clients_id: data.Clients_id,
          Clients_name: data.Clients_name,
          Clients_contact: data.Clients_contact,
          balance: [],
          operation: [],
        },
        Realm.UpdateMode.Modified
      );
    });

    /* ---- OPERATIONS ---- */
    operationsSnap.forEach((docSnap) => {
      const data = docSnap.data();

      const client = realm.objectForPrimaryKey(
        "Clients_details",
        data.client_id
      );

      if (!client) return;

      const newOp = realm.create(
        "operation",
        {
          _id: docSnap.id,
          client_id: data.client_id,
          operation_id: data.operation_id,
          type: data.type,
          value: data.value,
          currency: realm.objectForPrimaryKey("currency", data.currency),
          time: data.time ? new Date(data.time) : null,
          desc: data.desc || "",
        },
        Realm.UpdateMode.Modified
      );

      if (!client.operation.some((o: any) => o._id === docSnap.id)) {
        client.operation.push(newOp);
      }
    });
  });

  console.log("✅ Migration from Firestore to Realm completed");
};

export default migrateFirestoreToRealm;
