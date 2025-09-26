import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  // Paste your config from Step 1 here
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);