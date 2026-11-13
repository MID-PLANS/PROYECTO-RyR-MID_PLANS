import React, { useState, useEffect } from 'react';
import AdminView from './components/AdminView';
import UserView from './components/UserView';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './index.css';
import Swal from 'sweetalert2';

// IMPORTACIONES DE FIREBASE
import { auth, provider } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

function App() {
  const [user, setUser] = useState(null); 
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  // 1. EL SPLASH ARRANCA ENCENDIDO (Para que sea lo primero que se vea)
  const [showSplash, setShowSplash] = useState(true); 
  const [role, setRole] = useState('USER'); 

  const ADMIN_EMAILS = [
    'prti@textilesryr.com',
    'gerencia@textilesryr.com',
    'sistemas@textilesryr.com'
  ];

  // ==========================================
  // ESCUCHAR ESTADO DE SESIÓN
  // ==========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const isAdmin = ADMIN_EMAILS.includes(currentUser.email);
        setRole(isAdmin ? 'ADMIN' : 'USER');
        
        // Si inicia sesión, dejamos el cohete 1 segundos y luego lo quitamos
        setTimeout(() => setShowSplash(false), 1000);
      } else {
        setUser(null);
        // Si no hay sesión (pantalla de login), quitamos el cohete rápido (medio segundo)
        setTimeout(() => setShowSplash(false), 1000);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // ==========================================
  // CIERRE DE SESIÓN AUTOMÁTICO POR INACTIVIDAD
  // ==========================================
  useEffect(() => {
    let timeoutId;
    
    // Configura el tiempo permitido: 15 minutos (15 * 60 * 1000 milisegundos)
    // Puedes cambiar el 15 por los minutos que consideres necesarios en RyR.
    const TIEMPO_INACTIVIDAD = 15 * 60 * 1000; 

    // Función que reinicia el cronómetro a cero
    const resetTimer = () => {
      clearTimeout(timeoutId);
      
      // Solo iniciamos la cuenta regresiva si el usuario ya inició sesión
      if (user) {
        timeoutId = setTimeout(() => {
          // Cuando el tiempo se agota, mostramos un aviso y cerramos sesión
         Swal.fire({
  icon: 'warning',
  title: 'Sesión expirada',
  text: 'Por seguridad, tu sesión se ha cerrado tras 15 minutos de inactividad.',
  confirmButtonColor: '#7CB342'
});
          setShowSplash(true); // Encendemos el cohete de despedida
          setTimeout(() => signOut(auth), 1000); // Cerramos sesión en Firebase
        }, TIEMPO_INACTIVIDAD);
      }
    };

    // Lista de acciones que consideramos como "El usuario está vivo y trabajando"
    const eventosActividad = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];

    // Si hay un usuario logueado, encendemos los sensores
    if (user) {
      eventosActividad.forEach(evento => window.addEventListener(evento, resetTimer));
      resetTimer(); // Arrancamos el cronómetro por primera vez
    }

    // Limpieza de memoria (Para no saturar el navegador si el usuario sale manualmente)
    return () => {
      clearTimeout(timeoutId);
      eventosActividad.forEach(evento => window.removeEventListener(evento, resetTimer));
    };
  }, [user]); // Se vuelve a ejecutar si el estado del usuario cambia

  // ==========================================
  // FUNCIONES DE LOGIN Y LOGOUT
  // ==========================================
  const handleLogin = async () => {
    try {
      // MAGIA: Encendemos la pantalla de carga apenas el usuario da clic al botón
      setShowSplash(true); 
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      // Si el usuario cancela o hay error, quitamos la pantalla de carga
      setShowSplash(false); 
    }
  };

  const handleLogout = () => {
    // Encendemos la pantalla de carga para despedir al usuario suavemente
    setShowSplash(true);
    setTimeout(() => {
      signOut(auth);
    }, 1000);
  };

  // ==========================================
  // VARIABLES DE CONTROL
  // ==========================================
  const isAdmin = user ? ADMIN_EMAILS.includes(user.email) : false;

  return (
    <>
      {/* =========================================================
          CAPA UNIVERSAL: PANTALLA DE CARGA (SPLASH SCREEN)
          Al estar aquí afuera, puede cubrir el Login o el Sistema
          ========================================================= */}
      <div 
        id="splash-screen" 
        style={{ 
          opacity: showSplash ? 1 : 0, 
          visibility: showSplash ? 'visible' : 'hidden', 
          zIndex: 9999,
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0, // Fuerza a cubrir el 100% de la pantalla
          transition: 'opacity 0.6s ease-in-out, visibility 0.6s ease-in-out'
        }}
      >
    <div class="splash-logo"><i class="bi bi-rocket-takeoff-fill"></i></div>
    <div class="splash-title">¡Hola! Bienvenido a MIP PLANS</div>
    <div class="splash-subtitle">Un proyecto de RyR para ustedes</div>
    <div class="splash-subtitle">Estamos listos para recibir tu solicitud...</div>
    <div class="spinner-grow spinner-grow-custom" role="status"><span class="visually-hidden">Cargando...</span>
  </div>
      </div>

      {/* =========================================================
          CAPA INFERIOR: CONTENIDO DE LA APLICACIÓN
          (Se desvanece cuando el Splash Screen está activo)
          ========================================================= */}
      <div style={{ opacity: showSplash ? 0 : 1, transition: 'opacity 0.6s ease-in', minHeight: '100vh' }}>
        
        {loadingAuth ? (
          // Espacio vacío transparente mientras Firebase decide si hay sesión o no
          <div className="vh-100 bg-transparent"></div>
        ) : !user ? (
          
          /* -----------------------------
             VISTA 1: FORMULARIO DE LOGIN
             ----------------------------- */
          <div className="d-flex justify-content-center align-items-center vh-100 bg-transparent">
            <div className="card text-center p-5 shadow-lg border-0 rounded-4" style={{ backgroundColor: '#f2f3f5', maxWidth: '420px', width: '90%' }}>
              <div className="mx-auto mb-4 bg-white rounded-circle shadow-sm d-flex justify-content-center align-items-center" style={{ width: '80px', height: '80px' }}>
                <i className="bi bi-clipboard-check-fill fs-1" style={{ color: '#7CB342' }}></i>
              </div>
              
              <h3 className="fw-bold text-dark mb-1">
                Sistema <span style={{ color: '#7CB342' }}>MIP PLANS</span>
              </h3>
              <p className="text-muted mb-4 fs-6">Portal de Acceso</p>
              
              <button 
                className="btn btn-white fw-bold rounded-pill px-4 py-3 w-100 d-flex align-items-center justify-content-center gap-3 border shadow-sm mt-2 mb-4" 
                onClick={handleLogin}
                style={{ backgroundColor: '#ffffff', color: '#444', transition: 'all 0.2s' }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/google/google-original.svg" alt="Google" style={{ width: '22px' }} />
                Iniciar sesión con Google
              </button>

              <hr className="text-muted opacity-25 w-75 mx-auto" />
              <div className="mt-3 text-muted" style={{ fontSize: '0.75rem' }}>
                <p className="mb-0 fw-bold">©RyR S.A.S.</p>
                <p className="mb-0">Desarrollado por <span title="Marca registrada">®SrAlukart</span></p>
              </div>
            </div>
          </div>

        ) : (

          /* -----------------------------
             VISTA 2: APLICACIÓN PRINCIPAL
             ----------------------------- */
          <>
            <nav className="navbar navbar-light mb-5 p-2 sticky-top">
              <div className="container-fluid px-md-4 d-flex align-items-center justify-content-between">
                
                <div className="d-flex align-items-center gap-3">
                  <img src="/logo-secundario.png" alt="Logo PACCO" className="navbar-logo" style={{ height: '45px', width: 'auto', objectFit: 'contain' }} />
                  <img src="/logo-ryr.png" alt="Logo RyR" className="navbar-logo" style={{ height: '45px', width: 'auto', objectFit: 'contain' }} />
                  <div className="nav-divider mx-2 d-none d-sm-block"></div>
                  <span className="navbar-brand mb-0 h5 fw-bold d-none d-sm-block text-white">
                    Sistema <span style={{ color: '#7CB342' }}>MIP PLANS</span>
                  </span>
                </div>

                <div className="d-flex align-items-center gap-3">
                  {isAdmin && (
                    <div className="btn-group shadow-sm d-none d-md-flex">
                      <button className={`btn btn-sm ${role === 'ADMIN' ? 'btn-success' : 'btn-outline-light'}`} onClick={() => setRole('ADMIN')}>Vista Admin</button>
                      <button className={`btn btn-sm ${role === 'USER' ? 'btn-warning' : 'btn-outline-light'}`} onClick={() => setRole('USER')}>Vista Usuario</button>
                    </div>
                  )}
                  
                  <div className="d-flex align-items-center bg-dark bg-opacity-75 py-1 px-2 rounded-pill border border-light border-opacity-10 shadow-sm">
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt="Avatar" 
                        className="rounded-circle me-2" 
                        style={{ width: '25px', height: '25px', objectFit: 'cover' }}
                        onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${user.email}&background=7CB342&color=fff&rounded=true`; }}
                      />
                    ) : (
                      <i className="bi bi-person-circle fs-5 me-2 text-light"></i>
                    )}
                    <span className="text-light fs-6 me-3 d-none d-sm-block">{user.email}</span>
                    
                    <button className="btn btn-sm btn-outline-danger border-0 rounded-circle" onClick={handleLogout} title="Cerrar sesión">
                      <i className="bi bi-box-arrow-right"></i>
                    </button>
                  </div>
                </div>

              </div>
            </nav>

            <div className="container-fluid px-4 mb-5">
              {role === 'ADMIN' ? (
                <AdminView />
              ) : (
                <div className="row justify-content-center">
                  <div className="col-12 col-md-10 col-lg-9 col-xl-8">
                    <UserView userEmail={user.email} /> 
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default App;