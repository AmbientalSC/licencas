import * as firebaseApp from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1pcLUIXvnOO3Zgn9FQ5J02nOkjVpxYXU",
  authDomain: "licencas-a47f9.firebaseapp.com",
  projectId: "licencas-a47f9",
  storageBucket: "licencas-a47f9.firebasestorage.app",
  messagingSenderId: "738531068737",
  appId: "1:738531068737:web:0cc6a20e42a7e118e72fc0",
  measurementId: "G-JGXM1WF3P4"
};

// Initialize Firebase
const app = firebaseApp.initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };