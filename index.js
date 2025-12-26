// MUST be the first import — nothing before it!
import './src/realm-bootstrap';
import '@react-native-firebase/app';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import app from '@react-native-firebase/app';

console.log('Firebase apps:', app.apps);
AppRegistry.registerComponent(appName, () => App);
