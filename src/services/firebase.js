import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB3C0iJUsTaLOuJBxiDwiiC4cdUMbYIeaM",
  authDomain: "nightfall-game.firebaseapp.com",
  projectId: "nightfall-game",
  storageBucket: "nightfall-game.firebasestorage.app",
  databaseURL: "https://nightfall-game-default-rtdb.europe-west1.firebasedatabase.app",
  messagingSenderId: "1048654390624",
  appId: "1:1048654390624:web:166c26acdadf35a32cea05"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export default app;
