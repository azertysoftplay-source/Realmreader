// RealmConfig.js
import Realm from 'realm';
import {  RealmProvider, useRealm, useQuery } from '@realm/react'

import RNFS from 'react-native-fs';
import { schemas } from './models'; // Import your schemas
import { createRealmContext } from 'realm'; 


const BUNDLED_REALM_FILE_NAME = 'marma.realm'; // Name of your bundled file
const destinationPath = `${RNFS.DocumentDirectoryPath}/${BUNDLED_REALM_FILE_NAME}`;

const copyBundledRealmFile = async () => {
  if (!(await RNFS.exists(destinationPath))) {
    // Platform specific path for the bundled file
    const bundledPath = RNFS.MainBundlePath ? `${RNFS.MainBundlePath}/${BUNDLED_REALM_FILE_NAME}` : `asset://${BUNDLED_REALM_FILE_NAME}`;
    await RNFS.copyFile(bundledPath, destinationPath);
  }
};

const config = {
  path: destinationPath,
  schema: schemas,
  readOnly: true, // Set to true if you only intend to read the bundled data
};

//const { RealmProvider, useRealm, useQuery, useObject } = createRealmContext(config);

// Export the provider and hooks
export { RealmProvider, useRealm, useQuery, copyBundledRealmFile ,config};
