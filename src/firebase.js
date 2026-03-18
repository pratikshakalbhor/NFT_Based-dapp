import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCqygelSUq8aaXw726qhsqHfgMYCmN-kT0",
  authDomain: "freelancechain-5dfb1.firebaseapp.com",
  projectId: "freelancechain-5dfb1",
  storageBucket: "freelancechain-5dfb1.firebasestorage.app",
  messagingSenderId: "125799745857",
  appId: "1:125799745857:web:64cb0c7526d9896d02f9c0",
  databaseURL: "https://freelancechain-5dfb1-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export default app;