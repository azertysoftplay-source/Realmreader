import auth from '@react-native-firebase/auth';

export const signIn = (email: string, password: string) =>
  auth().signInWithEmailAndPassword(email, password);

export const signUp = (email: string, password: string) =>
  auth().createUserWithEmailAndPassword(email, password);

export const signOut = () =>
  auth().signOut();

export const onAuthStateChanged = (
  callback: (user: any) => void
) => auth().onAuthStateChanged(callback);
