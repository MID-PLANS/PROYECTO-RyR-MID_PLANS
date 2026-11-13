import { useQuery, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';

const fetchTasks = async () => {
  const res = await fetch('http://localhost:3000/api/tasks');
  if (!res.ok) throw new Error('Error al cargar la DB');
  return res.json();
};

const fetchHistory = async () => {
  const res = await fetch('http://localhost:3000/api/tasks/history');
  if (!res.ok) throw new Error('Error cargando el historial');
  return res.json();
};

export const useTasks = () => {
  const queryClient = useQueryClient();

  // 1. CARGA AUTOMÁTICA CON CACHÉ INTELIGENTE (Lag-free UX)
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    placeholderData: (previousData) => previousData, // Mantiene los datos viejos visibles en pantalla mientras carga los nuevos de fondo
// ==========================================
    // ✨ MAGIA DEL POLLING AQUÍ ✨
    // ==========================================
    refetchInterval: 3000, // Vuelve a consultar la DB cada 3 segundos
    refetchIntervalInBackground: false, // Pausa las consultas si el usuario cambia de pestaña
  });

  // 2. HISTORIAL BAJO DEMANDA
  const { data: historyTasks = [], refetch: triggerLoadHistory } = useQuery({
    queryKey: ['historyTasks'],
    queryFn: fetchHistory,
    enabled: false, // Evita que cargue automáticamente al abrir la app
  });

  // Forzar limpieza de caché y recarga al presionar "Actualizar"
  const loadAdminTasks = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const loadHistory = () => {
    triggerLoadHistory();
  };

  return {
    tasks,
    setTasks: (newTasks) => queryClient.setQueryData(['tasks'], newTasks), // Mantiene el Drag & Drop optimista e instantáneo
    historyTasks,
    isLoading, // <-- Este booleano nos dirá con precisión milimétrica cuándo mostrar los Skeletons
    loadAdminTasks,
    loadHistory
  };
};