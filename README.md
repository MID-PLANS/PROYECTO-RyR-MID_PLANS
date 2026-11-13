# 🚀 Sistema PLANS-GESTOR (MIP PLANS - RyR 0.3 Fn)

**PLANS-GESTOR** es una plataforma web full-stack de nivel empresarial diseñada para la gestión eficiente de solicitudes internas en RyR. Representa la evolución completa desde un entorno monolítico (Google Apps Script) hacia una arquitectura moderna, reactiva, desacoplada y altamente escalable.

---

## ⚙️ Stack Tecnológico

El sistema combina tecnologías modernas para garantizar rendimiento, escalabilidad y una excelente experiencia de usuario:

* ⚛️ **Frontend:** React + Vite + Caché Inteligente
* ⚙️ **Backend:** Node.js + Express
* 🐘 **Base de Datos:** PostgreSQL
* 🔥 **Autenticación:** Firebase Auth

---

## 🧱 Arquitectura del Ecosistema

```
📦 proyecto-root/
 ┣ 📂 ryr-frontend/    → SPA en React + Vite + TanStack Query
 ┗ 📂 ryr-backend/     → API REST con Node.js + Express + Multer
    ┗ 📂 uploads/      → Almacenamiento local de evidencias (Imágenes/PDFs)
```

---

## 🔹 Frontend (ryr-frontend)

* React + Vite ⚡
* TanStack React Query (manejo avanzado de caché)
* SweetAlert2 (alertas modernas)
* Bootstrap 5 + Glassmorphism UI ✨
* CSS Grid responsive 📱
* Firebase Auth 🔐

---

## 🔹 Backend (ryr-backend)

* Node.js + Express 🚀
* CORS habilitado
* PostgreSQL con `pg`
* Multer (subida de archivos multipart/form-data)
* API RESTful modular

---

## ✨ Características Clave

### 👤 1. Portal de Usuario (UserView)

* 📊 Barra de progreso (Stepper)
* 📎 Subida de evidencias (imágenes y documentos)
* 💬 Chat interactivo tipo mensajería
* ❌ Cancelación anticipada de solicitudes
* ⚡ Priorización automática (impacto + urgencia)

---

### 🛠️ 2. Panel Administrador (AdminView)

* 📈 Dashboard con KPIs en tiempo real
* 🧩 Tablero Kanban con Drag & Drop
* 🔍 Filtros avanzados y buscador global
* ✅ Acciones masivas (Bulk Actions)
* 🚀 Paginación inteligente (alto rendimiento)

---

### 🔐 3. Ciberseguridad

* 🛡️ Login con Google (Firebase Auth)
* ⏱️ Auto-logout por inactividad (15 minutos)
* 🚦 Control de acceso basado en roles (RBAC)

---

### ⚡ 4. Rendimiento y UX

* Skeleton Loaders (mejor percepción de velocidad)
* Parser de URLs (enlaces clicables automáticos)

---

## 📋 Requisitos Previos

* 🟢 Node.js >= 16
* 🐘 PostgreSQL + pgAdmin
* 🔧 Git
* 🔥 Cuenta en Firebase

---

## 🗄️ 1. Configuración de Base de Datos

Crear la base de datos:

```
ryr_mip_plans
```

Ejecutar el siguiente script SQL:

```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    area VARCHAR(100) NOT NULL,
    actividad TEXT NOT NULL,
    fecha_asignacion VARCHAR(20),
    prioridad VARCHAR(20) NOT NULL,
    encargado VARCHAR(100),
    estado VARCHAR(50) DEFAULT 'Programado',
    fecha_pactada VARCHAR(20),
    fecha_finalizacion VARCHAR(20),
    notas TEXT,
    solicitante VARCHAR(150) NOT NULL
);

CREATE TABLE history_tasks (
    id SERIAL PRIMARY KEY,
    area VARCHAR(100),
    actividad TEXT,
    fecha_asignacion VARCHAR(20),
    prioridad VARCHAR(20),
    encargado VARCHAR(100),
    estado VARCHAR(50),
    fecha_pactada VARCHAR(20),
    fecha_finalizacion VARCHAR(20),
    notas TEXT,
    solicitante VARCHAR(150),
    fecha_archivado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ⚙️ 2. Configuración del Entorno

### 🔧 Backend

```bash
cd ryr-backend
npm install express cors pg dotenv multer axios
```

⚠️ Crear manualmente la carpeta:

```
ryr-backend/uploads
```

Archivo `.env`:

```
PORT=3000
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ryr_mip_plans
```

---

### 🎨 Frontend

```bash
cd ryr-frontend
npm install firebase bootstrap bootstrap-icons sweetalert2 @tanstack/react-query
```

---

## 💻 3. Ejecución del Proyecto

### Terminal 1 - Backend

```bash
cd ryr-backend
node server.js
```

### Terminal 2 - Frontend

```bash
cd ryr-frontend
npm run dev
```

---

## 🌐 Acceso Local

* Aplicación: http://localhost:5173
* API REST: http://localhost:3000/api/tasks

---

## 🚀 Roadmap

* 🔄 WebSockets (Socket.io) para tiempo real
* 📊 Exportación de reportes (CSV / Excel)
* ☁️ Deploy:

  * DB: Supabase / Neon
  * Backend: Render / Railway
  * Frontend: Vercel

---

## 👨‍💻 Autor / Acerca del Proyecto
Sistema desarrollado internamente para optimizar y auditar el flujo de trabajo en RyR.

Arquitectura moderna, escalable y lista para producción. 🚀

* GitHub: [@SrAlucart](https://github.com/SrAlucart)
* Proyecto desarrollado durante etapa práctica para **RyR**.
