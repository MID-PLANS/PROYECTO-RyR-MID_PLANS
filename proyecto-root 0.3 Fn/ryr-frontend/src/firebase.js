import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// REEMPLAZA ESTO CON LOS DATOS QUE TE DIO FIREBASE EN EL PASO 2
const firebaseConfig = {
apiKey: "AIzaSyBRzsg3rO4CrYkJEhC23gInP7Q3AlDUIwE",
  authDomain: "mid-plans-login.firebaseapp.com",
  projectId: "mid-plans-login",
  storageBucket: "mid-plans-login.firebasestorage.app",
  messagingSenderId: "901023937818",
  appId: "1:901023937818:web:5d853f1cb684db0a56e8a3"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Configurar Autenticación
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();