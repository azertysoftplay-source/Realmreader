import firestore from '@react-native-firebase/firestore';

const migrateFirestoreToRealm = async (realm: any, user: any) => {
  if (!user) throw new Error('User not signed in');
  const userId = user.uid;

  console.log('Fetching data from Firestore...');

  // 1. Fetch all collections from Firestore filtered by userId
  const [clientsSnap, currenciesSnap, balancesSnap, operationsSnap] = await Promise.all([
    firestore().collection('clients').where('userId', '==', userId).get(),
    firestore().collection('currencies').where('userId', '==', userId).get(),
    firestore().collection('balances').where('userId', '==', userId).get(),
    firestore().collection('operations').where('userId', '==', userId).get(),
  ]);

  // 2. Start Realm Transaction
  realm.write(() => {
    // Migrate Currencies
    currenciesSnap.forEach(doc => {
      const data = doc.data();
      realm.create('currency', {
        _id: doc.id, // Using the Firestore Doc ID as the Realm primary key
        currency_id: data.currency_id,
        name: data.name,
      }, Realm.UpdateMode.Modified);
    });

    // Migrate Clients
    clientsSnap.forEach(doc => {
      const data = doc.data();
      realm.create('Clients_details', {
        _id: doc.id,
        Clients_id: data.Clients_id,
        Clients_name: data.Clients_name,
        Clients_contact: data.Clients_contact,
        balance: [],   // We will link these below
        operation: [], // We will link these below
      }, Realm.UpdateMode.Modified);
    });

    // Migrate Balances and Link to Clients
  /*  balancesSnap.forEach(doc => {
  const data = doc.data();

  // 1. Skip if client_id is missing in Firestore to prevent the crash
  if (!data.client_id) {
    console.warn(`Skipping balance ${doc.id} because client_id is missing`);
    return; 
  }

  const client = realm.objectForPrimaryKey('Clients_details', data.client_id);
  
  if (client) {
    realm.create('balance', {
      _id: doc.id,
      balance_id: data.balance_id || "", // Fallback if missing
      value: data.value || 0,
      currency: realm.objectForPrimaryKey('currency', data.currency),
      // client_id: data.client_id // Only include this if your Realm Schema explicitly has a client_id string property
    }, Realm.UpdateMode.Modified);
    
    // ... rest of push logic
  }
}); */

    // Migrate Operations and Link to Clients
    operationsSnap.forEach(doc => {
      const data = doc.data();
      const client = realm.objectForPrimaryKey('Clients_details', data.client_id);
      console.log('Linking operation to client:', data);
      if (client) {
        const newOp = realm.create('operation', {
          _id: doc.id,
         
          client_id: data.client_id,
           operation_id: data.operation_id,
          type: data.type,
          value: data.value,
          currency: realm.objectForPrimaryKey('currency', data.currency),
          time: data.time ? new Date(data.time) : null,
          desc: data.desc || '',
        }, Realm.UpdateMode.Modified);

        if (!client.operation.some((o: any) => o._id === doc.id)) {
          client.operation.push(newOp);
        }
      }
    });
  });

  console.log('Migration from Firestore to Realm complete!');
};

export default migrateFirestoreToRealm;