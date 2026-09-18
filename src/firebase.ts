import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBHVsP76D7UZ2Udb9q8zN0NUZLm9Kfurj0",
  authDomain: "budget-tracker-ba393.firebaseapp.com",
  projectId: "budget-tracker-ba393",
  storageBucket: "budget-tracker-ba393.firebasestorage.app",
  messagingSenderId: "1069486829012",
  appId: "1:1069486829012:web:b44e8a28e686689d4cba41",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);