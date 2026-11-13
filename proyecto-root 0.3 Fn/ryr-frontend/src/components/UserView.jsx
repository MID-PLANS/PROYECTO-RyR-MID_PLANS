import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';

const AREAS = [
  "PRUEBAS REACT","COMERCIAL", "CORTE", "TELA", "INSUMOS", "MUESTRAS", "DESARROLLO", 
  "LOGISTICA", "PRODUCCIÓN", "AUDITORIAS", "R. HUMANOS", "GERENCIA", 
  "INTEGRACIÓN", "P. INTERMEDIOS", "COMPRAS", "PROCESOS", "CONTABILIDAD", 
  "PROCESOS INTERNOS", "OPERACIONES", "SAYA", "SISTEMAS", "MPS", "LOOKER STUDIO"
];

export default function UserView({ userEmail }) {
  const [activeTab, setActiveTab] = useState('form'); 
  const [userTasks, setUserTasks] = useState([]);
  
  // ==========================================
  // ESTADOS DEL FORMULARIO
  // ==========================================
  const [email, setEmail] = useState(userEmail || '');
  const [area, setArea] = useState('');
  const [actividad, setActividad] = useState('');
  const [impacto, setImpacto] = useState('');
  const [urgencia, setUrgencia] = useState('');
  const [prioridad, setPrioridad] = useState('BAJA');
  const [archivo, setArchivo] = useState(null); // <-- NUEVO: Estado para el archivo adjunto

  const [badgeScale, setBadgeScale] = useState(1);
  const [badgeStyle, setBadgeStyle] = useState({ bg: 'bg-secondary', text: 'text-light', icon: 'bi-cpu', label: 'Esperando respuestas...' });
  const [submitStatus, setSubmitStatus] = useState('idle'); 

  // ==========================================
  // ESTADOS DEL CHAT
  // ==========================================
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTask, setChatTask] = useState(null);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const chatScrollRef = useRef(null); // Para hacer auto-scroll al último mensaje

  useEffect(() => {
    if (!impacto || !urgencia) return;
    const puntaje = parseInt(impacto) + parseInt(urgencia);
    let nuevaPrioridad = "BAJA"; let bgClass = "bg-success"; let textClass = "text-white"; let iconClass = "bi-check-circle-fill";
    if (puntaje >= 5) { nuevaPrioridad = "ALTA"; bgClass = "bg-danger"; textClass = "text-white"; iconClass = "bi-exclamation-triangle-fill"; } 
    else if (puntaje === 4) { nuevaPrioridad = "MEDIA"; bgClass = "bg-warning"; textClass = "text-dark"; iconClass = "bi-exclamation-circle-fill"; }
    setPrioridad(nuevaPrioridad);
    setBadgeScale(1.15);
    setTimeout(() => { setBadgeStyle({ bg: bgClass, text: textClass, icon: iconClass, label: `Prioridad ${nuevaPrioridad}` }); setBadgeScale(1); }, 150);
  }, [impacto, urgencia]);

  const loadUserTasks = async () => {
    if (!email) return;
    try {
      const res = await fetch(`http://localhost:3000/api/tasks/user/${email}`);
      const data = await res.json();
      setUserTasks(data);
    } catch (error) { console.error("Error cargando solicitudes", error); }
  };

  // ✨ NUEVO: Polling automático para el Usuario (cada 3 segundos)
  useEffect(() => { 
    if (activeTab === 'list') {
      loadUserTasks(); // Carga inicial
      
      // Creamos un ciclo repetitivo en segundo plano
      const interval = setInterval(() => {
        loadUserTasks();
      }, 3000);
      
      // Limpiamos el ciclo si el usuario cambia de pestaña
      return () => clearInterval(interval);
    }
  }, [activeTab, email]);

  // ✨ NUEVO: Sincronizar el chat abierto con los datos en tiempo real (Vista Usuario)
  useEffect(() => {
    if (chatTask) {
      const tareaActualizada = userTasks.find(t => t.id === chatTask.id);
      if (tareaActualizada && tareaActualizada.notas !== chatTask.notas) {
        setChatTask(tareaActualizada);
      }
    }
  }, [userTasks]);
  // Hacer scroll automático al fondo cuando se abre el chat
  useEffect(() => {
    if (showChatModal && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [showChatModal, chatTask]);

  // =======================================================
  // REGISTRO CON ARCHIVOS
  // =======================================================
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) { // Límite de 5MB
      Swal.fire('Archivo muy pesado', 'Por favor sube un archivo menor a 5MB.', 'warning');
      e.target.value = null;
      return;
    }
    setArchivo(file);
  };

// =======================================================
  // REGISTRO CON ARCHIVOS (FORMDATA REAL)
  // =======================================================
  const handleSubmitUser = async (e) => {
    e.preventDefault();
    setSubmitStatus('submitting');

    const today = new Date();
    const fechaAsignacion = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

    // ⚠️ NUEVO: Usamos FormData para poder enviar archivos físicos
    const formData = new FormData();
    formData.append('area', area);
    formData.append('actividad', actividad);
    formData.append('prioridad', prioridad);
    formData.append('solicitante', email);
    formData.append('fechaAsignacion', fechaAsignacion);
    formData.append('estado', 'Programado'); // Estado inicial explícito
    
    // Si el usuario seleccionó un archivo, lo metemos al paquete
    if (archivo) {
      formData.append('archivo', archivo);
    }

    try {
      const response = await fetch('http://localhost:3000/api/tasks', {
        method: 'POST',
        // 🚨 MUY IMPORTANTE: Cuando usas FormData, NO debes poner el header 'Content-Type'. 
        // El navegador lo pone automáticamente con los "boundaries" correctos.
        body: formData
      });

      if (response.ok) {
        setSubmitStatus('success');
        
        // Limpieza de campos
        setArea(''); setActividad(''); setImpacto(''); setUrgencia(''); setPrioridad('BAJA'); 
        setArchivo(null); // Limpiamos el estado del archivo
        
        // Limpiamos visualmente el input de archivo
        const fileInput = document.getElementById('fileUploadInput');
        if (fileInput) fileInput.value = '';

        setBadgeStyle({ bg: 'bg-secondary', text: 'text-light', icon: 'bi-cpu', label: 'Esperando respuestas...' });
        
        Swal.fire({ 
          icon: 'success', 
          title: '¡Solicitud Registrada!', 
          text: 'El equipo de administración ha sido notificado.', 
          confirmButtonColor: '#7CB342' 
        });
        setTimeout(() => { setSubmitStatus('idle'); }, 3000);
      } else {
        Swal.fire('Error', 'Hubo un problema al registrar la solicitud.', 'error'); 
        setSubmitStatus('idle');
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error de conexión', 'No se pudo contactar con el servidor.', 'error'); 
      setSubmitStatus('idle');
    }
  };

  // =======================================================
  // CANCELAR TAREA
  // =======================================================
  const handleCancelTask = async (id) => {
    const result = await Swal.fire({ title: '¿Cancelar solicitud?', text: "Puedes cancelarla ahora antes de que la procesen.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d', confirmButtonText: '<i class="bi bi-trash me-1"></i> Sí, cancelar', cancelButtonText: 'Mantener solicitud' });
    if (!result.isConfirmed) return;
    try {
      await fetch(`http://localhost:3000/api/tasks/${id}`, { method: 'DELETE' });
      Swal.fire({ icon: 'success', title: 'Cancelada', text: 'Tu solicitud ha sido anulada.', timer: 2000, showConfirmButton: false });
      loadUserTasks();
    } catch (error) { Swal.fire('Error', 'No se pudo cancelar.', 'error'); }
  };

  // =======================================================
  // ENVIAR MENSAJE AL CHAT
  // =======================================================
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;

    // Construimos la estampa del mensaje
    const date = new Date();
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tag = `[Usuario - ${timeString}]: `;
    const fullMessage = `${tag}${nuevoMensaje}`;

    // Anexamos el mensaje al historial existente
    const notasActualizadas = chatTask.notas ? `${chatTask.notas}\n${fullMessage}` : fullMessage;

    // Actualización optimista en pantalla
    const taskTemporal = { ...chatTask, notas: notasActualizadas };
    setChatTask(taskTemporal);
    setNuevoMensaje('');

    // Preparamos el payload para el backend
    const payload = { ...taskTemporal, fechaPactada: taskTemporal.fecha_pactada, fechaFinalizacion: taskTemporal.fecha_finalizacion, fechaAsignacion: taskTemporal.fecha_asignacion };

    try {
      const response = await fetch(`http://localhost:3000/api/tasks/${chatTask.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Fallo");
      loadUserTasks(); // Recargar de fondo
    } catch (error) {
      Swal.fire('Error', 'No se pudo enviar el mensaje.', 'error');
    }
  };

  // =======================================================
  // RENDERIZADO INTELIGENTE DEL CHAT (BURBUJAS)
  // =======================================================
  const renderChatBubbles = (notasString) => {
    if (!notasString || notasString.trim() === '') {
      return (
        <div className="text-center text-muted mt-5 d-flex flex-column align-items-center">
          <i className="bi bi-chat-square-dots opacity-25" style={{ fontSize: '3rem' }}></i>
          <p className="mt-2 small">Aún no hay mensajes. Escribe aquí para comunicarte con el administrador.</p>
        </div>
      );
    }

    const lineas = notasString.split('\n').filter(l => l.trim() !== '');

    return lineas.map((linea, index) => {
      // Detectamos de quién es el mensaje mediante la etiqueta invisible
      const esUsuario = linea.startsWith('[Usuario');
      const esAdmin = linea.startsWith('[Admin') || linea.startsWith('📌');
      
      // Si es un texto antiguo que no tiene el formato de chat, lo centramos
      if (!esUsuario && !esAdmin) {
         return <div key={index} className="text-center mb-3"><span className="badge bg-light text-secondary border px-3 py-2 text-wrap lh-base">{renderTextoConEnlaces(linea)}</span></div>;
      }

      // Estilos condicionales
      const bubbleColor = esUsuario ? 'bg-primary text-white ms-auto' : 'bg-white border text-dark me-auto shadow-sm';
      const alignContainer = esUsuario ? 'justify-content-end' : 'justify-content-start';
      const senderName = esUsuario ? 'Tú' : 'Administrador';
      
      // Limpiamos la etiqueta del texto para que solo se vea el mensaje limpio
      const cleanMessage = linea.replace(/\[.*?\]:\s*/, '');
      const timeMatch = linea.match(/\[.*?-\s*(.*?)\]/);
      const time = timeMatch ? timeMatch[1] : '';

      return (
         <div key={index} className={`d-flex mb-3 ${alignContainer} fade-in-up`}>
           <div className={`p-3 rounded-4 ${bubbleColor}`} style={{ maxWidth: '85%', borderBottomRightRadius: esUsuario ? '4px' : '', borderBottomLeftRadius: !esUsuario ? '4px' : '' }}>
             <div className="d-flex justify-content-between align-items-end gap-3 mb-1">
               <span className={`d-block fw-bold ${esUsuario ? 'text-white opacity-75' : 'text-primary'}`} style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>{senderName}</span>
               {time && <span className="opacity-50" style={{ fontSize: '0.6rem' }}>{time}</span>}
             </div>
             <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{renderTextoConEnlaces(cleanMessage)}</div>
           </div>
         </div>
      );
    });
  };

  // Convertidor de Links general
  const renderTextoConEnlaces = (texto) => {
    if (!texto) return '';
    return texto.split(/(https?:\/\/[^\s]+)/g).map((parte, index) => 
      /https?:\/\/[^\s]+/.test(parte) ? 
        <a key={index} href={parte} target="_blank" rel="noopener noreferrer" className="fw-bold text-decoration-underline text-break" style={{ color: 'inherit' }}>{parte}</a> : parte
    );
  };

  const renderProgress = (estado, encargado) => {
    let progress = 25; let color = 'bg-secondary'; let text = 'Recibida';
    if (estado === 'Programado' || estado === 'Programada') { progress = encargado ? 50 : 25; color = 'bg-warning'; text = encargado ? 'Asignada' : 'En Cola'; }
    else if (estado === 'En curso') { progress = 75; color = 'bg-primary'; text = 'En progreso'; }
    else if (estado === 'Requiere Reunión') { progress = 50; color = 'bg-purple'; text = 'Pausada (Reunión)'; }
    else if (estado === 'Completada' || estado === 'Completado') { progress = 100; color = 'bg-success'; text = 'Finalizada'; }
    else if (estado === 'Rechazada') { progress = 100; color = 'bg-dark'; text = 'Rechazada'; }

    return (
      <div className="w-100 mt-1" style={{ maxWidth: '120px' }}>
        <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.7rem' }}>
          <span className="fw-bold text-muted">{text}</span>
          <span className="text-muted">{progress}%</span>
        </div>
        <div className="progress" style={{ height: '6px' }}>
          <div className={`progress-bar ${color} progress-bar-striped ${progress < 100 && estado !== 'Rechazada' ? 'progress-bar-animated' : ''}`} role="progressbar" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="card user-card p-4 p-md-5 pt-0 shadow mt-3 border-0 rounded-4">
      <div className="text-center mb-4">
        <div className="icon-header"><i className="bi bi-clipboard2-check"></i></div>
        <h3 className="mt-3 fw-bold" style={{ color: '#7CB342', textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
          Portal de Solicitudes
        </h3>
      </div>

      <ul className="nav nav-pills nav-fill mb-4 p-1 bg-light rounded-pill shadow-sm border border-white" role="tablist">
        <li className="nav-item">
          <button className={`nav-link fw-bold ${activeTab === 'form' ? 'active' : ''}`} onClick={() => setActiveTab('form')} type="button">
            <i className="bi bi-plus-circle me-2"></i>Nueva Solicitud
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link fw-bold ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')} type="button">
            <i className="bi bi-list-task me-2"></i>Mis Solicitudes
          </button>
        </li>
      </ul>

      {/* ================= TAB 1: FORMULARIO ================= */}
      {activeTab === 'form' && (
        <form onSubmit={handleSubmitUser} className="fade-in-up">
          {!userEmail && (
            <div className="mb-4 p-4 rounded-3 border border-warning" style={{ backgroundColor: 'rgba(255, 193, 7, 0.2)' }}>
              <label className="form-label text-dark"><i className="bi bi-envelope-at me-1"></i> Tu Correo Electrónico <span className="text-danger">*</span></label>
              <input type="email" className="form-control" required placeholder="ejemplo@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)}/>
            </div>
          )}
          
          <div className="mb-4">
            <label className="form-label">Área de Impacto</label>
            <div className="input-group shadow-sm rounded">
              <span className="input-group-text"><i className="bi bi-building"></i></span>
              <select className="form-select" value={area} onChange={(e) => setArea(e.target.value)} required>
                <option value="" disabled>Selecciona un área...</option>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="form-label">Detalle de la Actividad / Solicitud</label>
            <div className="input-group shadow-sm rounded mb-2">
              <span className="input-group-text align-items-start pt-3"><i className="bi bi-text-paragraph"></i></span>
              <textarea className="form-control" rows="4" required placeholder="Describe la necesidad..." value={actividad} onChange={(e) => setActividad(e.target.value)}></textarea>
            </div>
            
            {/* NUEVO: Zona para adjuntar evidencias (Archivos/Imágenes) */}
            <div className="p-3 border rounded-3 bg-light d-flex flex-column align-items-center justify-content-center position-relative" style={{ borderStyle: 'dashed !important' }}>
              <i className="bi bi-cloud-arrow-up text-secondary fs-3 mb-1"></i>
              <span className="small text-muted fw-bold mb-2">¿Tienes una captura o evidencia? Adjúntala aquí</span>
              <input 
              id="fileUploadInput"
                type="file" 
                className="form-control form-control-sm w-75 rounded-pill shadow-sm" 
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
              />
              <span className="small opacity-50 mt-2" style={{ fontSize: '0.65rem' }}>Máx. 5MB (JPG, PNG, PDF)</span>
            </div>
          </div>
          
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label fw-bold text-dark"><i className="bi bi-people-fill text-primary me-2"></i>¿A quién afecta?</label>
              <select className="form-select shadow-sm" value={impacto} onChange={(e) => setImpacto(e.target.value)} required>
                <option value="" disabled>Selecciona...</option>
                <option value="1">👤 Solo a mis tareas (Bajo)</option>
                <option value="2">👥 A mi equipo o área (Medio)</option>
                <option value="3">🏢 Detiene la producción (Alto)</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-bold text-dark"><i className="bi bi-clock-history text-info me-2"></i>Nivel de urgencia</label>
              <select className="form-select shadow-sm" value={urgencia} onChange={(e) => setUrgencia(e.target.value)} required>
                <option value="" disabled>Selecciona...</option>
                <option value="1">☕ Es de rutina (Bajo)</option>
                <option value="2">📅 Esta semana (Medio)</option>
                <option value="3">🚨 Bloqueo crítico (Alto)</option>
              </select>
            </div>
          </div>

          <div className="col-12 mb-4 d-flex flex-column align-items-center justify-content-center p-3 rounded-4 shadow-sm" style={{ backgroundColor: 'rgba(255,255,255,0.4)', border: '1px dashed rgba(156, 204, 101, 0.6)' }}>
            <span className="text-dark small fw-bold mb-2">Prioridad calculada:</span>
            <span className={`badge ${badgeStyle.bg} ${badgeStyle.text} px-4 py-2`} style={{ fontSize: '1.05rem', borderRadius: '50rem', transform: `scale(${badgeScale})`, transition: 'all 0.3s ease' }}>
              <i className={`bi ${badgeStyle.icon} me-2`}></i> {badgeStyle.label}
            </span>
          </div>
          
          <button type="submit" className={`btn w-100 py-3 fw-bold text-uppercase rounded-pill shadow ${submitStatus === 'success' ? 'btn-success' : 'btn-primary'}`} disabled={submitStatus === 'submitting'}>
            {submitStatus === 'idle' && <><i className="bi bi-send-fill me-2"></i> Registrar Actividad</>}
            {submitStatus === 'submitting' && <><span className="spinner-border spinner-border-sm me-2"></span> Registrando...</>}
            {submitStatus === 'success' && <><i className="bi bi-check-circle-fill me-2"></i> ¡Solicitud Registrada!</>}
          </button>
        </form>
      )}

      {/* ================= TAB 2: MIS SOLICITUDES ================= */}
      {activeTab === 'list' && (
        <div className="table-responsive fade-in-up">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Área</th>
                <th className="text-center">Actividad</th>
                <th>Progreso</th>
                <th>Encargado</th>
                <th className="text-center">Chat / Acción</th>
              </tr>
            </thead>
            <tbody>
              {userTasks.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-5"><span className="text-secondary">Aún no tienes solicitudes registradas.</span></td></tr>
              ) : (
                userTasks.map((task) => (
                  <tr key={task.id}>
                    <td data-label="Fecha" className="small fw-bold text-dark">{task.fecha_asignacion}</td>
                    <td data-label="Área" className="small fw-bold">{task.area}</td>
                    
                    <td data-label="Actividad" className="text-center">
                      {/* Mostrar toolip o preview corto para no ocupar tanto espacio */}
                      <span className="d-inline-block text-truncate" style={{ maxWidth: '150px' }} title={task.actividad}>
                        {task.actividad}
                      </span>
                    </td>
                    
                    <td data-label="Progreso">
                      {renderProgress(task.estado, task.encargado)}
                    </td>
                    
                    <td data-label="Encargado" className="fw-bold text-primary small">{task.encargado || '-'}</td>
                    
                    <td data-label="Chat / Acción" className="text-center text-nowrap">
                      {/* BOTÓN DE CHAT (Reemplaza al de "Ver notas") */}
                      <button 
                        className="btn btn-sm btn-primary shadow-sm rounded-pill px-3 me-2" 
                        onClick={() => { setChatTask(task); setShowChatModal(true); }}
                      >
                        <i className="bi bi-chat-dots-fill me-1"></i> Chat
                      </button>
                      
                      {/* Botón Cancelar SOLO en Programada */}
                      {(task.estado === 'Programado' || task.estado === 'Programada') && (
                        <button className="btn btn-sm btn-outline-danger shadow-sm rounded-circle" title="Cancelar Solicitud" onClick={() => handleCancelTask(task.id)}>
                          <i className="bi bi-x-lg"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ==============================================================================
          MODAL DE CHAT EN TIEMPO REAL (NUEVO)
          ============================================================================== */}
      {showChatModal && chatTask && createPortal (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ height: '85vh' }}>
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden d-flex flex-column h-100">
              
              {/* Header del Chat */}
              <div className="modal-header border-0 py-3 bg-dark text-white shadow-sm z-1">
                <div className="d-flex align-items-center">
                  <div className="bg-success rounded-circle me-3" style={{ width: '10px', height: '10px' }}></div>
                  <div>
                    <h6 className="mb-0 fw-bold">Chat de Soporte</h6>
                    <span className="small opacity-75 d-block text-truncate" style={{ maxWidth: '250px', fontSize: '0.7rem' }}>Ref: {chatTask.actividad}</span>
                  </div>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowChatModal(false)}></button>
              </div>

              {/* Cuerpo del Chat (Zona de mensajes con scroll automático) */}
              <div 
                className="modal-body p-4 d-flex flex-column flex-grow-1 overflow-auto" 
                style={{ backgroundColor: '#f0f2f5' }}
                ref={chatScrollRef}
              >
                {renderChatBubbles(chatTask.notas)}
              </div>
              
              {/* Input para enviar mensaje */}
              <div className="modal-footer border-top p-3 bg-white d-block shadow-lg z-1">
                <form onSubmit={handleSendMessage} className="d-flex gap-2">
                  <input 
                    type="text" 
                    className="form-control rounded-pill bg-light border-0 px-4 shadow-sm" 
                    placeholder="Escribe un mensaje aquí..." 
                    value={nuevoMensaje}
                    onChange={(e) => setNuevoMensaje(e.target.value)}
                    disabled={chatTask.estado === 'Completada' || chatTask.estado === 'Completado' || chatTask.estado === 'Rechazada'}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary rounded-circle shadow-sm d-flex align-items-center justify-content-center" 
                    style={{ width: '45px', height: '45px', flexShrink: 0 }}
                    disabled={!nuevoMensaje.trim() || chatTask.estado === 'Completada' || chatTask.estado === 'Completado' || chatTask.estado === 'Rechazada'}
                  >
                    <i className="bi bi-send-fill" style={{ marginLeft: '-2px' }}></i>
                  </button>
                </form>
                {(chatTask.estado === 'Completada' || chatTask.estado === 'Completado' || chatTask.estado === 'Rechazada') && (
                  <p className="text-center mt-2 mb-0 small text-danger fw-bold"><i className="bi bi-lock-fill me-1"></i> El chat se ha cerrado porque la tarea finalizó.</p>
                )}
              </div>

            </div>
          </div>
        </div>,
        document.body   
      )}
    </div>
  );
} 