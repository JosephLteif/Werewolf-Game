import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB3C0iJUsTaLOuJBxiDwiiC4cdUMbYIeaM",
  authDomain: "nightfall-game.firebaseapp.com",
  projectId: "nightfall-game",
  storageBucket: "nightfall-game.firebasestorage.app",
  messagingSenderId: "1048654390624",
  appId: "1:1048654390624:web:166c26acdadf35a32cea05"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
