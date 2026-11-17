import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyACFVN8_dKuXIMcV1yNlAjWPb5J-AZBe80",
    authDomain: "aisystem-project.firebaseapp.com",
    databaseURL: "https://aisystem-project-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "aisystem-project",
    storageBucket: "aisystem-project.firebasestorage.app",
    messagingSenderId: "815098762891",
    appId: "1:815098762891:web:462b6e395f454954f2668e"
  };

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);