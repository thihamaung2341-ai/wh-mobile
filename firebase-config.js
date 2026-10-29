// Paste your own values from Firebase console > Project settings > Your apps.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD37DwzL_ba8dMdSthPbD7Sr7AXJhHOplY",
  authDomain: "wh-mobile.firebaseapp.com",
  projectId: "wh-mobile",
  storageBucket: "wh-mobile.firebasestorage.app",
  messagingSenderId: "305565229889",
  appId: "1:305565229889:web:fcf5b1cff882849da237c0"
};

export const auth = getAuth(initializeApp(firebaseConfig));
