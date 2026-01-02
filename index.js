// MUST be the first import — nothing before it!
import './src/realm-bootstrap';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

import { getApps } from '@react-native-firebase/app';

// Debug: show initialized Firebase apps (optional)
console.log('Firebase apps:', getApps());

AppRegistry.registerComponent(appName, () => App);
