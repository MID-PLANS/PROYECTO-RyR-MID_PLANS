import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // <-- Importar

// Inicializamos el cliente de caché inteligente
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Evita re-cargar la DB cada vez que el usuario cambia de pestaña en Chrome
      staleTime: 1000 * 60 * 5,    // Considera los datos "frescos" durante 5 minutos para evitar peticiones redundantes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Envolvemos la app con el proveedor */}
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);