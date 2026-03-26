import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCUWo6X8HCoflJz_szXNZ7vmzOEGFyXeFk",
  authDomain: "stylist-b314d.firebaseapp.com",
  projectId: "stylist-b314d",
  storageBucket: "stylist-b314d.firebasestorage.app",
  messagingSenderId: "167886790732",
  appId: "1:167886790732:web:a0411741ad66ec71ff54e9",
  measurementId: "G-882W8GKJC6"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = 'anaqa-app';
