import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { useTasks } from '../hooks/useTasks';

const AREAS = [
  "PRUEBAS REACT","COMERCIAL", "CORTE", "TELA", "INSUMOS", "MUESTRAS", "DESARROLLO", 
  "LOGISTICA", "PRODUCCIÓN", "AUDITORIAS", "R. HUMANOS", "GERENCIA", 
  "INTEGRACIÓN", "P. INTERMEDIOS", "COMPRAS", "PROCESOS", "CONTABILIDAD", 
  "PROCESOS INTERNOS", "OPERACIONES", "SAYA", "SISTEMAS", "MPS", "LOOKER STUDIO"
];

const COLUMNAS_KANBAN = [
  { id: 'Programado', titulo: 'Programada', color: 'border-warning', bg: 'bg-warning' },
  { id: 'En curso', titulo: 'En Curso', color: 'border-primary', bg: 'bg-primary' },
  { id: 'Requiere Reunión', titulo: 'Reunión', color: 'border-purple', bg: 'bg-purple', styleBg: '#8E24AA' },
  { id: 'Completada', titulo: 'Completada', color: 'border-success', bg: 'bg-success' },
  { id: 'Rechazada', titulo: 'Rechazada', color: 'border-dark', bg: 'bg-dark' }
];

export default function AdminView() {
  const { tasks, setTasks, historyTasks, loadAdminTasks, loadHistory, isLoading } = useTasks();
  
  const [filterPrioridad, setFilterPrioridad] = useState('TODAS');
  const [filterArea, setFilterArea] = useState('TODAS');
  const [filterEncargado, setFilterEncargado] = useState('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); 
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 8;
  
  const [selectedTasks, setSelectedTasks] = useState([]);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showReunionModal, setShowReunionModal] = useState(false);
  
  // ==========================================
  // ESTADOS DEL CHAT DEL ADMIN
  // ==========================================
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTask, setChatTask] = useState(null);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const chatScrollRef = useRef(null);
  
  const [currentTask, setCurrentTask] = useState(null);
  const [newAdminTask, setNewAdminTask] = useState({ userEmail: '', area: '', encargado: '', prioridad: '', actividad: '' });
  const [reunionData, setReunionData] = useState({ fecha: '', hora: '', lugar: '', detalles: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { loadAdminTasks(); }, [loadAdminTasks]);

  // Auto-scroll del chat
  useEffect(() => {
    if (showChatModal && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [showChatModal, chatTask]);

  // Auto-scroll del chat
  useEffect(() => {
    if (showChatModal && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [showChatModal, chatTask]);

  // ✨ NUEVO: Sincronizar el chat abierto con los datos en tiempo real
  useEffect(() => {
    if (chatTask) {
      // Buscamos la versión más reciente de la tarea en la tabla viva
      const tareaActualizada = tasks.find(t => t.id === chatTask.id);
      
      // Si existe y tiene un mensaje nuevo, actualizamos el modal sin cerrarlo
      if (tareaActualizada && tareaActualizada.notas !== chatTask.notas) {
        setChatTask(tareaActualizada);
      }
    }
  }, [tasks]); // Se ejecuta automáticamente cada 3 segundos cuando React Query consulta la DB

  const formatToInput = (dateStr) => {
    if (!dateStr || !dateStr.includes('/')) return '';
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  const formatToDoc = (dateStr) => {
    if (!dateStr || !dateStr.includes('-')) return dateStr || '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const preparePayload = (taskObj, overrides = {}) => {
    const merged = { ...taskObj, ...overrides };
    return {
        ...merged,
        fechaPactada: merged.fecha_pactada,
        fechaFinalizacion: merged.fecha_finalizacion,
        fechaAsignacion: merged.fecha_asignacion
    };
  };

  // =======================================================
  // FILTRADO MULTICRITERIO
  // =======================================================
  const filteredTasks = tasks.filter(task => {
    const matchPrioridad = filterPrioridad === 'TODAS' || task.prioridad === filterPrioridad;
    const matchArea = filterArea === 'TODAS' || task.area === filterArea;
    const matchEncargado = filterEncargado === 'TODOS' || task.encargado === filterEncargado || (filterEncargado === 'SIN_ASIGNAR' && (!task.encargado || task.encargado.trim() === ''));
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = searchQuery === '' || (task.actividad && task.actividad.toLowerCase().includes(searchLower)) || (task.solicitante && task.solicitante.toLowerCase().includes(searchLower)) || (task.notas && task.notas.toLowerCase().includes(searchLower));
    return matchPrioridad && matchArea && matchEncargado && matchSearch;
  });

  useEffect(() => { setCurrentPage(1); }, [filterPrioridad, filterArea, filterEncargado, searchQuery]);

  // =======================================================
  // SELECCIÓN MASIVA
  // =======================================================
  const handleSelectAll = (e) => { setSelectedTasks(e.target.checked ? filteredTasks.map(t => t.id) : []); };
  const handleSelectTask = (taskId) => { setSelectedTasks(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]); };

  const handleBulkStatusChange = async (nuevoEstado) => {
    if(!nuevoEstado) return;
    const result = await Swal.fire({ title: '¿Actualizar seleccionadas?', text: `Se cambiará el estado de ${selectedTasks.length} tareas a "${nuevoEstado}".`, icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, actualizar' });
    if (!result.isConfirmed) return;
    Swal.fire({ title: 'Actualizando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      await Promise.all(selectedTasks.map(async (taskId) => {
        const task = tasks.find(t => t.id === taskId); if(!task) return;
        let taskActualizada = { ...task, estado: nuevoEstado };
        if ((nuevoEstado === 'Completada' || nuevoEstado === 'Completado') && !task.fecha_finalizacion) {
          const today = new Date(); taskActualizada.fecha_finalizacion = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
        }
        return fetch(`http://localhost:3000/api/tasks/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preparePayload(taskActualizada)) });
      }));
      Swal.fire({ icon: 'success', title: '¡Éxito!', text: 'Tareas actualizadas.', timer: 1500, showConfirmButton: false });
      setSelectedTasks([]); loadAdminTasks();
    } catch (error) { Swal.fire('Error', 'Hubo un fallo.', 'error'); }
  };

  const handleBulkDelete = async () => {
    const result = await Swal.fire({ title: '¿Eliminar seleccionadas?', text: `¡Borrarás permanentemente ${selectedTasks.length} tareas!`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', confirmButtonText: 'Sí, eliminar' });
    if (!result.isConfirmed) return;
    Swal.fire({ title: 'Eliminando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      await Promise.all(selectedTasks.map(taskId => fetch(`http://localhost:3000/api/tasks/${taskId}`, { method: 'DELETE' })));
      Swal.fire({ icon: 'success', title: 'Eliminadas', timer: 1500, showConfirmButton: false });
      setSelectedTasks([]); loadAdminTasks();
    } catch (error) { Swal.fire('Error', 'No se pudo eliminar.', 'error'); }
  };

  // =======================================================
  // DRAG & DROP
  // =======================================================
  const handleDragStart = (e, taskId) => { e.dataTransfer.setData('taskId', taskId); e.target.style.opacity = '0.5'; };
  const handleDragEnd = (e) => { e.target.style.opacity = '1'; };
  const handleDragOver = (e) => { e.preventDefault(); };

  const handleDrop = async (e, nuevoEstado) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id.toString() === taskId);
    let estadoActual = task?.estado;
    if (estadoActual === 'Programada') estadoActual = 'Programado';
    if (estadoActual === 'Completado') estadoActual = 'Completada';
    if (!task || estadoActual === nuevoEstado) return;

    if (nuevoEstado === 'Requiere Reunión') {
      setCurrentTask(task); setShowReunionModal(true); return; 
    }

    const tareasPrevias = [...tasks];
    let taskActualizada = { ...task, estado: nuevoEstado };
    if (nuevoEstado === 'Completada' && !task.fecha_finalizacion) {
      const today = new Date(); taskActualizada.fecha_finalizacion = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    }
    setTasks(tasks.map(t => t.id === task.id ? taskActualizada : t));
    try {
      const response = await fetch(`http://localhost:3000/api/tasks/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preparePayload(taskActualizada)) });
      if (!response.ok) throw new Error("Fallo");
      Swal.mixin({ toast: true, position: "top-end", showConfirmButton: false, timer: 2000 }).fire({ icon: "success", title: "Estado actualizado" });
    } catch (error) { setTasks(tareasPrevias); Swal.fire('Error', 'No se pudo guardar.', 'error'); }
  };

  // =======================================================
  // LÓGICA DEL CHAT DEL ADMINISTRADOR
  // =======================================================
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tag = `[Admin - ${timeString}]: `;
    const fullMessage = `${tag}${nuevoMensaje}`;

    const notasActualizadas = chatTask.notas ? `${chatTask.notas}\n${fullMessage}` : fullMessage;

    const taskTemporal = { ...chatTask, notas: notasActualizadas };
    setChatTask(taskTemporal);
    setNuevoMensaje('');

    const payload = preparePayload(taskTemporal);

    try {
      const response = await fetch(`http://localhost:3000/api/tasks/${chatTask.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Fallo");
      loadAdminTasks();
    } catch (error) {
      Swal.fire('Error', 'No se pudo enviar el mensaje.', 'error');
    }
  };

  const renderChatBubbles = (notasString) => {
    if (!notasString || notasString.trim() === '') {
      return (
        <div className="text-center text-muted mt-5 d-flex flex-column align-items-center">
          <i className="bi bi-chat-square-dots opacity-25" style={{ fontSize: '3rem' }}></i>
          <p className="mt-2 small">Aún no hay mensajes. Escribe aquí para comunicarte con el usuario.</p>
        </div>
      );
    }

    const lineas = notasString.split('\n').filter(l => l.trim() !== '');

    return lineas.map((linea, index) => {
      // Como estamos en la vista de Admin, "Admin" y "📌" somos nosotros (derecha, azul)
      const esAdmin = linea.startsWith('[Admin') || linea.startsWith('📌');
      const esUsuario = linea.startsWith('[Usuario');
      
      if (!esUsuario && !esAdmin) {
         return <div key={index} className="text-center mb-3"><span className="badge bg-light text-secondary border px-3 py-2 text-wrap lh-base">{renderTextoConEnlaces(linea)}</span></div>;
      }

      const bubbleColor = esAdmin ? 'bg-primary text-white ms-auto' : 'bg-white border text-dark me-auto shadow-sm';
      const alignContainer = esAdmin ? 'justify-content-end' : 'justify-content-start';
      const senderName = esAdmin ? 'Tú (Admin)' : 'Usuario';
      
      const cleanMessage = linea.replace(/\[.*?\]:\s*/, '');
      const timeMatch = linea.match(/\[.*?-\s*(.*?)\]/);
      const time = timeMatch ? timeMatch[1] : '';

      return (
         <div key={index} className={`d-flex mb-3 ${alignContainer} fade-in-up`}>
           <div className={`p-3 rounded-4 ${bubbleColor}`} style={{ maxWidth: '85%', borderBottomRightRadius: esAdmin ? '4px' : '', borderBottomLeftRadius: !esAdmin ? '4px' : '' }}>
             <div className="d-flex justify-content-between align-items-end gap-3 mb-1">
               <span className={`d-block fw-bold ${esAdmin ? 'text-white opacity-75' : 'text-primary'}`} style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>{senderName}</span>
               {time && <span className="opacity-50" style={{ fontSize: '0.6rem' }}>{time}</span>}
             </div>
             <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{renderTextoConEnlaces(cleanMessage)}</div>
           </div>
         </div>
      );
    });
  };

  const renderTextoConEnlaces = (texto) => {
    if (!texto) return '';
    return texto.split(/(https?:\/\/[^\s]+)/g).map((parte, index) => 
      /https?:\/\/[^\s]+/.test(parte) ? <a key={index} href={parte} target="_blank" rel="noopener noreferrer" className="fw-bold text-decoration-underline text-break" style={{ color: 'inherit' }}>{parte}</a> : parte
    );
  };

  // =======================================================
  // FUNCIONES CRUD RESTAURADAS
  // =======================================================
  const deleteRecord = async (id) => {
    const result = await Swal.fire({ title: '¿Estás seguro?', text: "Se eliminará el registro.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', confirmButtonText: 'Sí, eliminar' });
    if (!result.isConfirmed) return;
    try { await fetch(`http://localhost:3000/api/tasks/${id}`, { method: 'DELETE' }); Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false }); loadAdminTasks(); } catch (error) { Swal.fire('Error', 'Fallo.', 'error'); }
  };

  const duplicateRecord = async (task) => {
    const result = await Swal.fire({ title: '¿Duplicar?', text: `Copia de la tarea...`, icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, duplicar' });
    if (!result.isConfirmed) return;
    const today = new Date();
    const payload = preparePayload(task, { actividad: task.actividad + " (Copia)", fecha_asignacion: `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}` });
    try { await fetch('http://localhost:3000/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); loadAdminTasks(); Swal.fire({ icon: 'success', title: 'Duplicada', timer: 1500, showConfirmButton: false }); } catch (error) { Swal.fire('Error', 'Fallo.', 'error'); }
  };

  const changeEncargado = async (task, newEncargado) => {
    try { await fetch(`http://localhost:3000/api/tasks/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preparePayload(task, { encargado: newEncargado })) }); loadAdminTasks(); } catch (error) { alert("Error"); }
  };

  const saveEdit = async (e) => {
    e.preventDefault(); setIsSubmitting(true);
    try { await fetch(`http://localhost:3000/api/tasks/${currentTask.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preparePayload(currentTask, { fecha_pactada: formatToDoc(currentTask.fecha_pactada), fecha_finalizacion: formatToDoc(currentTask.fecha_finalizacion) })) }); setShowEditModal(false); loadAdminTasks(); Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });} catch (error) { alert("Error"); } finally { setIsSubmitting(false); }
  };

  const saveAdminAdd = async (e) => {
    e.preventDefault(); setIsSubmitting(true); const today = new Date();
    try { await fetch('http://localhost:3000/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newAdminTask, solicitante: newAdminTask.userEmail, estado: 'Programado', fechaAsignacion: `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}` }) }); setShowAddModal(false); setNewAdminTask({ userEmail: '', area: '', encargado: '', prioridad: '', actividad: '' }); loadAdminTasks(); Swal.fire({ icon: 'success', title: 'Registrado', timer: 1500, showConfirmButton: false });} catch (error) { alert("Error"); } finally { setIsSubmitting(false); }
  };

  const saveReunion = async (e) => {
    e.preventDefault(); setIsSubmitting(true); const fechaFormateada = formatToDoc(reunionData.fecha); let [hora, min] = reunionData.hora.split(':');
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let cita = `${fechaFormateada} a las ${hora % 12 || 12}:${min} ${hora >= 12 ? 'PM' : 'AM'} en ${reunionData.lugar}`; if (reunionData.detalles.trim() !== "") cita += `\nDetalles: ${reunionData.detalles}`;
    
    // Lo guardamos como etiqueta de administrador para que se vea azul de nuestro lado
    const notaReunion = `📌 [Admin - ${timeString}]: REUNIÓN REQUERIDA: ${cita}`;
    const notasFinales = currentTask.notas ? currentTask.notas + "\n\n" + notaReunion : notaReunion;
    
    try { await fetch(`http://localhost:3000/api/tasks/${currentTask.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preparePayload(currentTask, { estado: 'Requiere Reunión', notas: notasFinales })) }); setShowReunionModal(false); setReunionData({ fecha: '', hora: '', lugar: '', detalles: '' }); loadAdminTasks(); Swal.fire({ icon: 'success', title: 'Reunión Agendada', timer: 1500, showConfirmButton: false });} catch (error) { alert("Error"); } finally { setIsSubmitting(false); }
  };

  const triggerArchivado = async () => {
    const result = await Swal.fire({ title: '¿Limpiar tabla principal?', text: "Se archivarán tareas Completadas y Rechazadas.", icon: 'info', showCancelButton: true, confirmButtonText: 'Sí, archivar' });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch('http://localhost:3000/api/tasks/archive', { method: 'POST' });
      const data = await res.json();
      Swal.fire({ icon: 'success', title: '¡Éxito!', text: `Se archivaron ${data.archivedCount} tareas.`}); loadAdminTasks();
    } catch (error) { Swal.fire('Error', 'No se pudo archivar.', 'error'); }
  };

  // =======================================================
  // SKELETONS ANIMADOS
  // =======================================================
  const renderTableSkeleton = () => {
    return Array(5).fill(0).map((_, i) => (
      <tr key={i} className="placeholder-glow">
        <td><span className="placeholder col-8 bg-secondary opacity-25 rounded py-2"></span></td>
        <td><span className="placeholder col-10 bg-secondary opacity-25 rounded py-2"></span></td>
        <td><span className="placeholder col-6 bg-secondary opacity-25 rounded py-2"></span></td>
        <td><span className="placeholder col-8 bg-secondary opacity-25 rounded py-2"></span></td>
        <td><span className="placeholder col-7 bg-secondary opacity-25 rounded py-2"></span></td>
        <td><span className="placeholder col-5 bg-secondary opacity-25 rounded py-2"></span></td>
        <td><span className="placeholder col-6 bg-secondary opacity-25 rounded py-2"></span></td>
        <td><span className="placeholder col-5 bg-secondary opacity-25 rounded py-2"></span></td>
        <td><span className="placeholder col-7 bg-secondary opacity-25 rounded py-2"></span></td>
        <td><span className="placeholder col-9 bg-secondary opacity-25 rounded py-2"></span></td>
        <td><span className="placeholder col-8 bg-secondary opacity-25 rounded py-2"></span></td>
      </tr>
    ));
  };

  const renderKanbanSkeleton = () => {
    return (
      <div className="d-flex overflow-auto pb-3 pt-2 px-1 gap-2 custom-scrollbar shadow-inner" style={{ minHeight: '600px', alignItems: 'flex-start' }}>
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="flex-shrink-0 d-flex flex-column rounded-3 bg-light p-2" style={{ width: '260px', minHeight: '300px', backgroundColor: '#eef0f3' }}>
            <div className="placeholder-glow p-1 mb-2"><span className="placeholder col-5 bg-secondary opacity-25 rounded py-2"></span></div>
            {Array(2).fill(0).map((_, j) => (
              <div key={j} className="card p-2 border-0 shadow-sm mb-2 placeholder-glow rounded-2 bg-white">
                <div className="d-flex justify-content-between mb-2"><span className="placeholder col-4 bg-secondary opacity-25 rounded"></span><span className="placeholder col-3 bg-secondary opacity-25 rounded"></span></div>
                <span className="placeholder col-12 bg-secondary opacity-25 rounded mb-1"></span>
                <span className="placeholder col-8 bg-secondary opacity-25 rounded mb-3"></span>
                <div className="d-flex justify-content-between"><span className="placeholder col-5 bg-secondary opacity-25 rounded"></span><span className="placeholder col-2 bg-secondary opacity-25 rounded"></span></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // KPIs y Paginación de Tabla
  const indexOfLastTask = currentPage * tasksPerPage; const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTableTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);

  const kpiPendientes = tasks.filter(t => !['Completada', 'Completado', 'Rechazada'].includes(t.estado)).length;
  const kpiCompletadasMes = tasks.filter(t => { if (!t.fecha_finalizacion || !['Completada', 'Completado'].includes(t.estado)) return false; const hoy = new Date(); const mes = (hoy.getMonth() + 1).toString().padStart(2, '0'); return t.fecha_finalizacion.includes(`/${mes}/${hoy.getFullYear()}`) || t.fecha_finalizacion.includes(`${hoy.getFullYear()}-${mes}`); }).length;
  const cargaMiller = tasks.filter(t => (t.encargado === 'MILLER' || t.encargado === 'AMBOS') && !['Completada', 'Completado', 'Rechazada'].includes(t.estado)).length;
  const cargaEmanuel = tasks.filter(t => (t.encargado === 'EMANUEL' || t.encargado === 'AMBOS') && !['Completada', 'Completado', 'Rechazada'].includes(t.estado)).length;

  return (
    <>
      <div className="card p-4 shadow-sm w-100 mb-5 border-0 rounded-4">
        
        {/* ================= HEADER Y ACCIONES ================= */}
        <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 pb-3 border-bottom gap-3">
          <h4 className="mt-2 fw-bold text-dark mb-0"><i className="bi bi-speedometer2 me-2" style={{color: '#7CB342'}}></i>Panel de Control General</h4>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <button className="btn btn-outline-dark fw-bold rounded-pill shadow-sm px-3 me-2" onClick={() => setViewMode(viewMode === 'table' ? 'kanban' : 'table')}>
              {viewMode === 'table' ? <><i className="bi bi-kanban me-1"></i> Tablero Kanban</> : <><i className="bi bi-table me-1"></i> Ver Tabla</>}
            </button>
            <button className="btn btn-primary fw-bold shadow-sm rounded-pill px-3" onClick={() => setShowAddModal(true)}><i className="bi bi-plus-lg me-1"></i> Añadir</button>
            <button className="btn btn-success fw-bold shadow-sm rounded-pill px-3" onClick={loadAdminTasks}><i className="bi bi-arrow-clockwise me-1"></i> Actualizar</button>
            <button className="btn btn-dark fw-bold shadow-sm rounded-pill px-3" onClick={() => {loadHistory(); setShowHistoryModal(true)}}><i className="bi bi-clock-history me-1"></i> Historial</button>
            <button className="btn btn-secondary fw-bold shadow-sm rounded-pill px-3" onClick={triggerArchivado} style={{background: '#111', color: '#fff', border: 'none'}}><i className="bi bi-archive-fill me-1"></i> Archivar</button>
          </div>
        </div>

        {/* ================= KPIs ================= */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-6 col-xl-3"><div className="card border-0 shadow-sm rounded-4 h-100 p-3" style={{ borderLeft: '5px solid #ffc107', backgroundColor: '#fffdf5' }}><div className="d-flex justify-content-between align-items-center"><div><p className="text-muted fw-bold mb-1" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Tareas Pendientes</p><h3 className="fw-bold mb-0" style={{ color: '#444' }}>{kpiPendientes}</h3></div><div className="bg-warning bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}><i className="bi bi-hourglass-split text-warning fs-5"></i></div></div></div></div>
          <div className="col-12 col-md-6 col-xl-3"><div className="card border-0 shadow-sm rounded-4 h-100 p-3" style={{ borderLeft: '5px solid #7CB342', backgroundColor: '#f9fdf5' }}><div className="d-flex justify-content-between align-items-center"><div><p className="text-muted fw-bold mb-1" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Éxitos del Mes</p><h3 className="fw-bold mb-0" style={{ color: '#444' }}>{kpiCompletadasMes}</h3></div><div className="bg-success bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}><i className="bi bi-check-circle-fill text-success fs-5"></i></div></div></div></div>
          <div className="col-12 col-md-6 col-xl-3"><div className="card border-0 shadow-sm rounded-4 h-100 p-3" style={{ borderLeft: '5px solid #0dcaf0', backgroundColor: '#f0fbfe' }}><div className="d-flex justify-content-between align-items-center"><div><p className="text-muted fw-bold mb-1" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Carga: Miller</p><h3 className="fw-bold mb-0" style={{ color: '#444' }}>{cargaMiller}</h3></div><div className="bg-info bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}><i className="bi bi-person-workspace text-info fs-5"></i></div></div></div></div>
          <div className="col-12 col-md-6 col-xl-3"><div className="card border-0 shadow-sm rounded-4 h-100 p-3" style={{ borderLeft: '5px solid #8E24AA', backgroundColor: '#fcf5fd' }}><div className="d-flex justify-content-between align-items-center"><div><p className="text-muted fw-bold mb-1" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Carga: Emanuel</p><h3 className="fw-bold mb-0" style={{ color: '#444' }}>{cargaEmanuel}</h3></div><div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', backgroundColor: 'rgba(142, 36, 170, 0.15)' }}><i className="bi bi-person-workspace fs-5" style={{ color: '#8E24AA' }}></i></div></div></div></div>
        </div>

        {/* ================= FILTROS MULTICRITERIO ================= */}
        <div className="bg-light p-3 rounded-4 shadow-sm mb-4 border border-light">
          <div className="row g-3">
            <div className="col-12 col-md-5 col-xl-4"><label className="form-label small fw-bold text-muted text-uppercase mb-1">Buscador Global</label><div className="input-group shadow-sm rounded-pill overflow-hidden bg-white border"><span className="input-group-text bg-white border-0"><i className="bi bi-search text-muted"></i></span><input type="text" className="form-control border-0 shadow-none bg-white" placeholder="Buscar actividad..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />{searchQuery && <button type="button" className="btn bg-white border-0" onClick={() => setSearchQuery('')}><i className="bi bi-x-circle-fill text-secondary"></i></button>}</div></div>
            <div className="col-6 col-md-3 col-xl-2"><label className="form-label small fw-bold text-muted text-uppercase mb-1">Encargado</label><select className="form-select border-0 shadow-sm rounded-pill fw-bold" value={filterEncargado} onChange={(e) => setFilterEncargado(e.target.value)}><option value="TODOS">Todos</option><option value="MILLER">Miller</option><option value="EMANUEL">Emanuel</option><option value="AMBOS">Ambos</option><option value="SIN_ASIGNAR">Sin Asignar</option></select></div>
            <div className="col-6 col-md-3 col-xl-2"><label className="form-label small fw-bold text-muted text-uppercase mb-1">Prioridad</label><select className="form-select border-0 shadow-sm rounded-pill fw-bold" value={filterPrioridad} onChange={(e) => setFilterPrioridad(e.target.value)}><option value="TODAS">Todas</option><option value="ALTA">🔴 Alta</option><option value="MEDIA">🟡 Media</option><option value="BAJA">🟢 Baja</option></select></div>
            <div className="col-12 col-md-4 col-xl-4"><label className="form-label small fw-bold text-muted text-uppercase mb-1">Área / Departamento</label><select className="form-select border-0 shadow-sm rounded-pill fw-bold" value={filterArea} onChange={(e) => setFilterArea(e.target.value)}><option value="TODAS">Todas las áreas</option>{AREAS.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
          </div>
        </div>

        {/* ================= ACCIONES MASIVAS ================= */}
        {selectedTasks.length > 0 && (
          <div className="alert bg-primary text-white d-flex flex-wrap align-items-center justify-content-between shadow py-2 px-4 rounded-pill mb-4 fade-in-up" style={{ border: 'none' }}>
            <span className="fw-bold"><i className="bi bi-check2-square me-2 fs-5"></i> {selectedTasks.length} seleccionadas</span>
            <div className="d-flex gap-2 align-items-center">
              <select className="form-select form-select-sm rounded-pill w-auto fw-bold text-dark border-0 shadow-sm" onChange={(e) => { handleBulkStatusChange(e.target.value); e.target.value = ""; }} defaultValue="">
                <option value="" disabled>Cambiar estado a...</option><option value="Programado">Programada</option><option value="En curso">En curso</option><option value="Completada">Completada</option><option value="Rechazada">Rechazada</option>
              </select>
              <button className="btn btn-sm btn-danger rounded-pill fw-bold shadow-sm px-3" onClick={handleBulkDelete}><i className="bi bi-trash-fill"></i> Borrar</button>
              <button className="btn btn-sm btn-outline-light rounded-pill border-2" onClick={() => setSelectedTasks([])}><i className="bi bi-x-lg"></i></button>
            </div>
          </div>
        )}

        {/* ================= RENDERIZADO DE VISTAS CON SKELETON LOADERS ================= */}
        {viewMode === 'table' ? (
          <div className="fade-in-up">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{minWidth: '1000px'}}>
                <thead>
                  <tr>
                    <th className="text-center" style={{ width: '40px' }}><input type="checkbox" className="form-check-input border-secondary shadow-sm" checked={filteredTasks.length > 0 && selectedTasks.length === filteredTasks.length} onChange={handleSelectAll} /></th>
                    <th>Área</th><th className="text-center">Actividad</th><th>Encargado</th><th>Fecha Asig.</th><th>Prioridad</th><th>Estado</th><th>F. Finalización</th><th className="text-center">Chat</th><th>Solicitante</th><th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    renderTableSkeleton()
                  ) : currentTableTasks.length === 0 ? (
                    <tr><td colSpan="11" className="text-center py-4 fw-bold text-secondary">No se encontraron tareas con los filtros actuales.</td></tr>
                  ) : (
                    currentTableTasks.map((task) => (
                      <tr key={task.id} className={task.estado === 'Completada' || task.estado === 'Completado' ? 'opacity-75' : ''} style={{ backgroundColor: selectedTasks.includes(task.id) ? 'rgba(13, 202, 240, 0.08)' : '' }}>
                        <td className="text-center"><input type="checkbox" className="form-check-input border-secondary shadow-sm" checked={selectedTasks.includes(task.id)} onChange={() => handleSelectTask(task.id)} /></td>
                        <td className="fw-bold text-dark">{task.area}</td>
                        <td className="text-center">
                          <span className="d-inline-block text-truncate text-muted" style={{ maxWidth: '150px' }} title={task.actividad}>{task.actividad}</span>
                        </td>
                        <td><select className="form-select form-select-sm fw-bold shadow-sm inline-select" value={task.encargado || ''} onChange={(e) => changeEncargado(task, e.target.value)}><option value="">-- Asignar --</option><option value="MILLER">MILLER</option><option value="EMANUEL">EMANUEL</option><option value="AMBOS">AMBOS</option></select></td>
                        <td className="small fw-bold text-dark">{task.fecha_asignacion}</td>
                        <td><span className={`badge shadow-sm ${task.prioridad === 'ALTA' ? 'bg-danger text-white' : task.prioridad === 'MEDIA' ? 'bg-warning text-dark' : 'bg-info text-dark'}`}>{task.prioridad}</span></td>
                        <td><span className={`badge shadow-sm ${task.estado === 'Completada' || task.estado === 'Completado' ? 'bg-success text-white' : task.estado === 'En curso' ? 'bg-primary text-white' : task.estado === 'Rechazada' ? 'bg-dark text-white' : task.estado === 'Requiere Reunión' ? 'bg-purple text-white' : 'bg-warning text-dark'}`}>{task.estado}</span></td>
                        <td className="small fw-bold text-success">{task.fecha_finalizacion || '-'}</td>
                        <td className="text-center">
                          {/* 🚨 BOTÓN DE CHAT (Reemplaza a Notas) */}
                          <button className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold" onClick={() => { setChatTask(task); setShowChatModal(true); }}>
                            <i className="bi bi-chat-dots-fill me-1"></i> Chat
                          </button>
                        </td>
                        <td className="small text-dark">{task.solicitante}</td>
                        <td className="text-center text-nowrap">
                          <button className="btn btn-sm me-1 shadow-sm text-white" style={{backgroundColor: '#8E24AA'}} onClick={() => { setCurrentTask(task); setShowReunionModal(true); }} title="Agendar Reunión"><i className="bi bi-calendar-event-fill"></i></button>
                          <button className="btn btn-sm btn-info me-1 shadow-sm text-white" onClick={() => duplicateRecord(task)} title="Duplicar"><i className="bi bi-copy"></i></button>
                          <button className="btn btn-sm btn-primary me-1 shadow-sm" onClick={() => { setCurrentTask({ ...task, fecha_pactada: formatToInput(task.fecha_pactada), fecha_finalizacion: formatToInput(task.fecha_finalizacion) }); setShowEditModal(true); }} title="Editar"><i className="bi bi-pencil-fill"></i></button>
                          <button className="btn btn-sm btn-danger shadow-sm" onClick={() => deleteRecord(task.id)} title="Eliminar"><i className="bi bi-trash-fill"></i></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!isLoading && totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                <span className="text-muted small fw-bold">Mostrando {indexOfFirstTask + 1} a {Math.min(indexOfLastTask, filteredTasks.length)} de {filteredTasks.length} tareas</span>
                <div className="btn-group shadow-sm">
                  <button className="btn btn-sm btn-outline-primary fw-bold" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><i className="bi bi-chevron-left"></i> Anterior</button>
                  <span className="btn btn-sm btn-primary fw-bold px-3" style={{ pointerEvents: 'none' }}>Página {currentPage} de {totalPages}</span>
                  <button className="btn btn-sm btn-outline-primary fw-bold" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Siguiente <i className="bi bi-chevron-right"></i></button>
                </div>
              </div>
            )}
          </div>
          
        ) : isLoading ? (
          renderKanbanSkeleton()
        ) : (
          /* ================= VISTA KANBAN ACTUALIZADA ================= */
          <div className="d-flex overflow-auto pb-3 pt-2 px-1 fade-in-up gap-2 custom-scrollbar" style={{ minHeight: '600px', alignItems: 'flex-start' }}>
            {COLUMNAS_KANBAN.map(columna => (
              <div 
                key={columna.id} 
                className="flex-shrink-0 d-flex flex-column rounded-3 bg-light shadow-sm border border-light" 
                style={{ width: '260px', backgroundColor: '#f4f5f7', maxHeight: '75vh' }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, columna.id)}
              >
                <div className={`p-2 border-bottom ${columna.color} border-3 rounded-top-3`} style={{ backgroundColor: '#ffffff' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="fw-bold mb-0 text-dark text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.3px' }}>{columna.titulo}</h6>
                    <span className={`badge ${columna.bg} rounded-pill shadow-sm`} style={{ backgroundColor: columna.styleBg || '', fontSize: '0.7rem' }}>
                      {filteredTasks.filter(t => (t.estado === columna.id) || (columna.id === 'Completada' && t.estado === 'Completado') || (columna.id === 'Programado' && t.estado === 'Programada')).length}
                    </span>
                  </div>
                </div>
                <div className="p-2 flex-grow-1 overflow-auto custom-scrollbar" style={{ minHeight: '100px' }}>
                  {filteredTasks
                    .filter(t => (t.estado === columna.id) || (columna.id === 'Completada' && t.estado === 'Completado') || (columna.id === 'Programado' && t.estado === 'Programada'))
                    .map(task => (
                      <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} onDragEnd={handleDragEnd} className="card shadow-sm border-0 mb-2 p-2 rounded-2 task-card position-relative" style={{ cursor: 'grab', transition: 'all 0.15s', backgroundColor: selectedTasks.includes(task.id) ? 'rgba(13, 202, 240, 0.08)' : '#ffffff' }}>
                        <div className="position-absolute" style={{ top: '8px', right: '8px', zIndex: 10 }}><input type="checkbox" className="form-check-input border-secondary shadow-sm" checked={selectedTasks.includes(task.id)} onChange={() => handleSelectTask(task.id)} /></div>
                        <div className="d-flex justify-content-between align-items-center mb-1 pe-4">
                          <span className="badge bg-light text-secondary border fw-bold text-truncate" style={{ fontSize: '0.65rem', maxWidth: '120px' }}>{task.area}</span>
                          <span className={`badge ${task.prioridad === 'ALTA' ? 'bg-danger' : task.prioridad === 'MEDIA' ? 'bg-warning text-dark' : 'bg-info text-dark'}`} style={{ fontSize: '0.6rem', padding: '0.25em 0.4em' }}>{task.prioridad}</span>
                        </div>
                        <p className="mb-2 text-dark fw-medium lh-sm" style={{ fontSize: '0.8rem', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '30px' }} title={task.actividad}>{task.actividad}</p>
                        <div className="d-flex justify-content-between align-items-center border-top pt-1 mt-1">
                          <div className="d-flex align-items-center gap-1">
                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '18px', height: '18px', fontSize: '0.55rem' }}><i className="bi bi-person-fill"></i></div>
                            <span className="text-muted fw-bold text-truncate" style={{ fontSize: '0.65rem', maxWidth: '80px' }}>{task.encargado ? task.encargado.substring(0, 8) : 'Sin asignar'}</span>
                          </div>
                          <div className="d-flex gap-1">
                            {/* 🚨 BOTÓN DE CHAT (Reemplaza a Notas) */}
                            <button className="btn btn-sm btn-link text-info p-0" title="Abrir Chat" onClick={() => { setChatTask(task); setShowChatModal(true); }}><i className="bi bi-chat-fill" style={{ fontSize: '0.75rem' }}></i></button>
                            <button className="btn btn-sm btn-link text-primary p-0" title="Editar" onClick={() => { setCurrentTask({ ...task, fecha_pactada: formatToInput(task.fecha_pactada), fecha_finalizacion: formatToInput(task.fecha_finalizacion) }); setShowEditModal(true); }}><i className="bi bi-pencil-square" style={{ fontSize: '0.75rem' }}></i></button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= MODAL EDITAR (Sin el cuadro de texto de Notas) ================= */}
      {showEditModal && currentTask && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1050}}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 py-3"><h5 className="modal-title fw-bold text-white"><i className="bi bi-pencil-square me-2"></i>Gestión de Actividad</h5><button type="button" className="btn-close btn-close-white" onClick={() => setShowEditModal(false)}></button></div>
              <div className="modal-body p-4" style={{backgroundColor: 'rgba(255,255,255,0.5)'}}>
                <form onSubmit={saveEdit}>
                  <div className="row g-4">
                    <div className="col-md-6"><label className="form-label">Área de impacto</label><select className="form-select shadow-sm" value={currentTask.area} onChange={(e) => setCurrentTask({...currentTask, area: e.target.value})}>{AREAS.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                    <div className="col-md-6"><label className="form-label">Prioridad</label><select className="form-select shadow-sm" value={currentTask.prioridad} onChange={(e) => setCurrentTask({...currentTask, prioridad: e.target.value})}><option value="ALTA">ALTA</option><option value="MEDIA">MEDIA</option><option value="BAJA">BAJA</option></select></div>
                    <div className="col-12"><label className="form-label">Actividad Solicitada</label><textarea className="form-control shadow-sm" rows="3" value={currentTask.actividad} onChange={(e) => setCurrentTask({...currentTask, actividad: e.target.value})}></textarea></div>
                    <div className="col-12"><hr className="my-2 border-secondary"/></div>
                    <div className="col-md-3"><label className="form-label text-primary">Encargado</label><select className="form-select shadow-sm fw-bold border-primary" value={currentTask.encargado || ''} onChange={(e) => setCurrentTask({...currentTask, encargado: e.target.value})}><option value="">Sin asignar</option><option value="MILLER">MILLER</option><option value="EMANUEL">EMANUEL</option><option value="AMBOS">AMBOS</option></select></div>
                    <div className="col-md-3"><label className="form-label text-dark">Fecha Asig.</label><input type="text" className="form-control shadow-sm input-readonly" readOnly value={currentTask.fecha_asignacion || ''}/></div>
                    <div className="col-md-3"><label className="form-label">F. Pactada</label><input type="date" className="form-control shadow-sm" value={currentTask.fecha_pactada || ''} onChange={(e) => setCurrentTask({...currentTask, fecha_pactada: e.target.value})}/></div>
                    <div className="col-md-3"><label className="form-label text-success fw-bold">F. Finalización</label><input type="date" className="form-control border-success shadow-sm" value={currentTask.fecha_finalizacion || ''} onChange={(e) => setCurrentTask({...currentTask, fecha_finalizacion: e.target.value})}/></div>
                    <div className="col-md-12 mt-4"><label className="form-label">Estado Actual</label>
                      <select className="form-select shadow-sm fw-bold border-primary" value={currentTask.estado} onChange={(e) => {
                          const nuevoEstado = e.target.value; let taskActualizada = { ...currentTask, estado: nuevoEstado };
                          if ((nuevoEstado === 'Completada' || nuevoEstado === 'Completado') && !currentTask.fecha_finalizacion) {
                            const today = new Date(); taskActualizada.fecha_finalizacion = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
                          }
                          setCurrentTask(taskActualizada);
                        }}><option value="Programado">Programada</option><option value="En curso">En curso</option><option value="Requiere Reunión">Requiere Reunión</option><option value="Completada">Completada</option><option value="Rechazada">Rechazada</option></select>
                    </div>
                  </div>
                  <div className="mt-4 d-flex justify-content-between">
                    <span className="text-muted small"><i className="bi bi-info-circle me-1"></i> Para hablar con el usuario, usa el botón de <b>Chat</b> en la tabla o tablero.</span>
                    <div>
                      <button type="button" className="btn btn-outline-dark fw-bold rounded-pill px-4 me-2" onClick={() => setShowEditModal(false)}>Cancelar</button>
                      <button type="submit" className="btn btn-primary fw-bold shadow-sm rounded-pill px-4" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= OTROS MODALES (Add, Reunion, History) ================= */}
      {showAddModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1050}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 py-3"><h5 className="modal-title fw-bold text-white"><i className="bi bi-plus-circle me-2"></i>Añadir Solicitud a Tercero</h5><button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button></div>
              <div className="modal-body p-4" style={{backgroundColor: 'rgba(255,255,255,0.5)'}}>
                <form onSubmit={saveAdminAdd}>
                  <div className="mb-3"><label className="form-label">Correo</label><input type="email" className="form-control shadow-sm" required value={newAdminTask.userEmail} onChange={(e) => setNewAdminTask({...newAdminTask, userEmail: e.target.value})} /></div>
                  <div className="row"><div className="col-md-6 mb-3"><label className="form-label">Área</label><select className="form-select shadow-sm" required value={newAdminTask.area} onChange={(e) => setNewAdminTask({...newAdminTask, area: e.target.value})}><option value="">Seleccione...</option>{AREAS.map(a => <option key={a} value={a}>{a}</option>)}</select></div><div className="col-md-6 mb-3"><label className="form-label">Encargado</label><select className="form-select shadow-sm" value={newAdminTask.encargado} onChange={(e) => setNewAdminTask({...newAdminTask, encargado: e.target.value})}><option value="">Sin asignar</option><option value="MILLER">MILLER</option><option value="EMANUEL">EMANUEL</option><option value="AMBOS">AMBOS</option></select></div></div>
                  <div className="mb-3"><label className="form-label">Prioridad</label><select className="form-select shadow-sm" required value={newAdminTask.prioridad} onChange={(e) => setNewAdminTask({...newAdminTask, prioridad: e.target.value})}><option value="" disabled>Seleccione...</option><option value="ALTA">🔴 ALTA</option><option value="MEDIA">🟡 MEDIA</option><option value="BAJA">🟢 BAJA</option></select></div>
                  <div className="mb-3"><label className="form-label">Actividad</label><textarea className="form-control shadow-sm" rows="3" required value={newAdminTask.actividad} onChange={(e) => setNewAdminTask({...newAdminTask, actividad: e.target.value})}></textarea></div>
                  <div className="mt-4 text-end"><button type="button" className="btn btn-outline-dark fw-bold rounded-pill px-4 me-2" onClick={() => setShowAddModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary fw-bold shadow-sm rounded-pill px-4" disabled={isSubmitting}>Registrar</button></div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReunionModal && currentTask && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.6)', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1050}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 py-3"><h5 className="modal-title fw-bold text-light"><i className="bi bi-calendar-event-fill me-2" style={{color: '#AB47BC'}}></i>Agendar Reunión</h5><button type="button" className="btn-close btn-close-white" onClick={() => setShowReunionModal(false)}></button></div>
              <div className="modal-body p-4 bg-dark text-white">
                <form onSubmit={saveReunion}>
                  <div className="mb-4 text-info small fw-bold">Solicitante: <span className="text-white">{currentTask.solicitante}</span></div>
                  <div className="row g-3 mb-3"><div className="col-md-6"><label className="form-label text-light">Fecha</label><input type="date" className="form-control shadow-sm border-secondary text-dark" required value={reunionData.fecha} onChange={(e) => setReunionData({...reunionData, fecha: e.target.value})}/></div><div className="col-md-6"><label className="form-label text-light">Hora</label><input type="time" className="form-control shadow-sm border-secondary text-dark" required value={reunionData.hora} onChange={(e) => setReunionData({...reunionData, hora: e.target.value})}/></div></div>
                  <div className="mb-3"><label className="form-label text-light">Lugar o Medio</label><input type="text" className="form-control shadow-sm border-secondary text-dark" required value={reunionData.lugar} onChange={(e) => setReunionData({...reunionData, lugar: e.target.value})}/></div>
                  <div className="mb-4"><label className="form-label text-light">Detalles</label><textarea className="form-control shadow-sm border-secondary text-dark" rows="2" value={reunionData.detalles} onChange={(e) => setReunionData({...reunionData, detalles: e.target.value})}></textarea></div>
                  <div className="text-end"><button type="button" className="btn btn-outline-light fw-bold rounded-pill px-4 me-2" onClick={() => setShowReunionModal(false)}>Cancelar</button><button type="submit" className="btn fw-bold shadow-sm rounded-pill px-4" style={{backgroundColor: '#8E24AA', color: 'white'}} disabled={isSubmitting}>Confirmar Cita</button></div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.7)', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1050}}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 py-3"><h5 className="modal-title fw-bold text-white"><i className="bi bi-archive-fill text-info me-2"></i>Historial Archivadas</h5><button type="button" className="btn-close btn-close-white" onClick={() => setShowHistoryModal(false)}></button></div>
              <div className="modal-body p-4" style={{backgroundColor: 'rgba(255,255,255,0.8)'}}>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{minWidth: '1000px'}}>
                    <thead><tr><th>Área</th><th>Actividad</th><th>Encargado</th><th>Fecha Asig.</th><th>Estado</th><th>F. Finalización</th><th>Solicitante</th></tr></thead>
                    <tbody>{historyTasks.map(ht => (<tr key={ht.id}><td className="fw-bold text-dark">{ht.area}</td><td className="small text-truncate" style={{maxWidth: '250px'}}>{ht.actividad}</td><td className="fw-bold text-primary small">{ht.encargado || '-'}</td><td className="small fw-bold text-dark">{ht.fecha_asignacion}</td><td><span className="badge bg-dark text-white">{ht.estado}</span></td><td className="small fw-bold text-success">{ht.fecha_finalizacion || '-'}</td><td className="small text-dark">{ht.solicitante}</td></tr>))}</tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE CHAT DEL ADMINISTRADOR ================= */}
      {showChatModal && chatTask && createPortal(
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden" style={{ maxHeight: '85vh' }}>
              
              {/* Cabecera del Chat */}
              <div className="modal-header border-0 py-3 bg-dark text-white d-flex align-items-center">
                <div className="d-flex align-items-center">
                  <div className="bg-success rounded-circle me-2" style={{ width: '10px', height: '10px' }}></div>
                  <div>
                    <h6 className="modal-title fw-bold mb-0">Chat con Usuario</h6>
                    <small className="text-white-50" style={{ fontSize: '0.7rem' }}>Ref: {chatTask.actividad.substring(0, 40)}...</small>
                  </div>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowChatModal(false)}></button>
              </div>

              {/* Cuerpo del Chat (Mensajes) */}
              <div className="modal-body p-4 custom-scrollbar" style={{ backgroundColor: '#f0f2f5' }} ref={chatScrollRef}>
                {renderChatBubbles(chatTask.notas)}
              </div>

              {/* Footer del Chat (Input para escribir) */}
              <div className="modal-footer border-0 p-3 bg-white">
                <form onSubmit={handleSendMessage} className="w-100 d-flex gap-2">
                  <input 
                    type="text" 
                    className="form-control rounded-pill shadow-sm border-secondary px-4" 
                    placeholder="Escribe una respuesta al usuario..." 
                    value={nuevoMensaje}
                    onChange={(e) => setNuevoMensaje(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="btn btn-primary rounded-circle shadow-sm d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px', flexShrink: 0 }} disabled={!nuevoMensaje.trim()}>
                    <i className="bi bi-send-fill" style={{ marginLeft: '-2px' }}></i>
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>,
        document.body   
      )}
    </>
  );
}