# 🧪 Guía Completa de Pruebas - Sistema de Registro de Asistencia

## 📋 Índice
1. [Pre-requisitos](#pre-requisitos)
2. [Iniciar el Sistema](#iniciar-el-sistema)
3. [Prueba 1: Crear Horarios](#prueba-1-crear-horarios)
4. [Prueba 2: Crear Usuarios](#prueba-2-crear-usuarios)
5. [Prueba 3: Entrenar Reconocimiento Facial](#prueba-3-entrenar-reconocimiento-facial)
6. [Prueba 4: Marcaje con Reconocimiento Facial (IA)](#prueba-4-marcaje-con-reconocimiento-facial-ia)
7. [Prueba 5: Marcaje Manual (Fallback)](#prueba-5-marcaje-manual-fallback)
8. [Prueba 6: Verificar Dashboard en Tiempo Real](#prueba-6-verificar-dashboard-en-tiempo-real)
9. [Solución de Problemas](#solución-de-problemas)

---

## Pre-requisitos

### Software Necesario
- ✅ Docker Desktop instalado y funcionando
- ✅ Git (para ver el código)
- ✅ Navegador web moderno (Chrome, Firefox, Edge)
- ✅ Webcam (para reconocimiento facial)

### Puertos Necesarios (asegúrate que estén libres)
- `3000` - API Backend
- `5000` - Servicio de IA
- `3002` - WebSocket Service
- `5174` - Terminal de Marcaje
- `8080` - API Gateway (Frontend Dashboard)
- `27017` - MongoDB

---

## Iniciar el Sistema

### Paso 1: Abrir Terminal en la carpeta del proyecto
```bash
cd C:\Users\benja\Desktop\ResgistroAsistencia
```

### Paso 2: Construir e iniciar todos los servicios
```bash
docker-compose up --build
```

**⏱️ Tiempo estimado:** 3-5 minutos (primera vez)

### Paso 3: Verificar que todos los servicios estén corriendo
Abre tu navegador y verifica:

- ✅ **API Backend**: http://localhost:3000/health
  - Deberías ver: `{"status":"OK"}`

- ✅ **Servicio IA**: http://localhost:5000/health
  - Deberías ver: `{"status":"healthy"}`

- ✅ **WebSocket**: http://localhost:3002/health
  - Deberías ver: `{"status":"OK"}`

- ✅ **Dashboard Admin**: http://localhost:8080
  - Deberías ver la página de login/dashboard

- ✅ **Terminal Marcaje**: http://localhost:5174
  - Deberías ver el terminal de marcaje

### Paso 4: Verificar logs (opcional)
En otra terminal, puedes ver los logs de servicios específicos:
```bash
# Ver logs del backend
docker logs api-backend-dev -f

# Ver logs del servicio IA
docker logs ai-service -f

# Ver todos los logs
docker-compose logs -f
```

---

## Prueba 1: Crear Horarios

### Objetivo
Crear horarios de trabajo para asignar a los empleados.

### Pasos:

1. **Abrir Dashboard Admin**
   - URL: http://localhost:8080
   - Si pide login, usa credenciales de admin (si hay autenticación)

2. **Ir a "Gestión de Horarios"**
   - Click en el menú lateral "Horarios" o "Admin Horarios"

3. **Crear un nuevo horario**
   - Click botón "Nuevo Horario" (o similar)
   - Llenar el formulario:
     - **Nombre:** "Horario Mañana"
     - **Hora Entrada:** 08:00
     - **Hora Salida:** 17:00
     - **Tolerancia (minutos):** 15
     - **Días de semana:** Lunes a Viernes
   - Click "Guardar"

4. **Crear segundo horario (opcional)**
   - **Nombre:** "Horario Tarde"
   - **Hora Entrada:** 14:00
   - **Hora Salida:** 22:00
   - **Tolerancia:** 10 minutos
   - **Días:** Lunes a Viernes

### ✅ Resultado Esperado
- Deberías ver los horarios listados en la tabla
- El sistema muestra: "Horario creado exitosamente"

---

## Prueba 2: Crear Usuarios

### Objetivo
Registrar usuarios que usarán el sistema de marcaje.

### Pasos:

1. **Ir a "Gestión de Usuarios"**
   - Click en el menú "Usuarios"

2. **Crear Usuario de Prueba #1**
   - Click botón "+ Nuevo Usuario"
   - Llenar formulario:
     - **Nombre:** Juan
     - **Apellido:** Pérez
     - **RUT:** 12345678-9
     - **Email:** juan.perez@empresa.cl
     - **Contraseña:** juan123 (importante para login manual)
     - **Rol:** Usuario
     - **Horario:** Seleccionar "Horario Mañana"
   - Click "Crear"

3. **Crear Usuario de Prueba #2**
   - **Nombre:** María
   - **Apellido:** González
   - **RUT:** 98765432-1
   - **Email:** maria.gonzalez@empresa.cl
   - **Contraseña:** maria123
     - **Rol:** Usuario
   - **Horario:** Seleccionar "Horario Mañana"
   - Click "Crear"

4. **Verificar en la tabla**
   - Deberías ver ambos usuarios listados
   - Columna "Horario" debe mostrar "Horario Mañana"
   - Columna "Reconocimiento" debe mostrar "❌ Inactivo"

### ✅ Resultado Esperado
- 2 usuarios creados exitosamente
- Cada uno tiene horario asignado
- Reconocimiento facial está INACTIVO (aún no entrenado)

---

## Prueba 3: Entrenar Reconocimiento Facial

### Objetivo
Entrenar la IA para reconocer las caras de los usuarios.

### Pasos:

1. **Preparar la webcam**
   - Asegúrate de tener buena iluminación
   - Posiciónate frente a la cámara

2. **Entrenar Usuario Juan Pérez**
   - En la tabla de usuarios, buscar "Juan Pérez"
   - Click en el botón de **cámara** 📷
   - Se abrirá el modal "Entrenamiento de Reconocimiento Facial"

3. **Capturar fotos**
   - Permite el acceso a la cámara cuando el navegador lo pida
   - Verás la vista previa de la cámara
   - **Captura 5-10 fotos** con diferentes ángulos:
     - Foto de frente
     - Ligeramente a la izquierda
     - Ligeramente a la derecha
     - Sonriendo
     - Serio
   - Click "Capturar" para cada foto
   - Las fotos aparecerán en una cuadrícula abajo

4. **Eliminar fotos malas (opcional)**
   - Si alguna foto salió borrosa o mal, click en "X" para eliminarla

5. **Enviar entrenamiento**
   - Una vez tengas 5-10 fotos buenas
   - Click "Entrenar Reconocimiento Facial"
   - Verás mensaje: "Entrenando modelo..."
   - **⏱️ Espera 5-15 segundos**

6. **Verificar éxito**
   - Deberías ver: "✅ Reconocimiento facial entrenado: 5 foto(s) procesada(s)"
   - El modal se cierra
   - En la tabla, Juan Pérez ahora muestra: "✅ Activo"

7. **Repetir para María González** (opcional)
   - Si tienes otra persona disponible, repite los pasos
   - O usa las mismas fotos para probar (funcionará como Juan)

### ✅ Resultado Esperado
- Estado cambió de "❌ Inactivo" a "✅ Activo"
- El archivo `rostros_conocidos.dat` se creó en el servicio IA
- Mensaje de éxito visible

### ⚠️ Nota Importante
Si el entrenamiento falla:
- Verifica que el servicio IA esté corriendo: http://localhost:5000/health
- Revisa los logs: `docker logs ai-service -f`
- Las fotos deben ser claras y mostrar el rostro completo

---

## Prueba 4: Marcaje con Reconocimiento Facial (IA)

### Objetivo
Probar el marcaje automático usando reconocimiento facial.

### Pasos:

1. **Abrir Terminal de Marcaje**
   - URL: http://localhost:5174
   - Deberías ver la pantalla de bienvenida con:
     - Reloj en tiempo real
     - Fecha actual
     - Botones "Entrada" y "Salida"

2. **Iniciar marcaje de ENTRADA**
   - Click en botón **"Entrada"** (verde)
   - Se abrirá la cámara automáticamente

3. **Posicionarse frente a la cámara**
   - Permite acceso a la cámara
   - Verás tu imagen en tiempo real
   - Asegúrate de que tu rostro esté bien iluminado y centrado

4. **Capturar foto**
   - Click botón "Capturar"
   - Verás mensaje: "Procesando marcaje..."
   - **⏱️ Espera 2-5 segundos**

### ✅ Resultado Esperado (Reconocimiento Exitoso)

**Pantalla muestra:**
```
✅ Marcaje Registrado

Juan Pérez
Entrada - 08:15:32
Estado: Puntual
Confianza IA: 87%

Método: Automático (Reconocimiento Facial)
```

- Después de 5 segundos, vuelve a la pantalla de bienvenida automáticamente

**En el Dashboard Admin (http://localhost:8080):**
- Ve a la sección "Dashboard" o "Marcajes de Hoy"
- Deberías ver aparecer EN TIEMPO REAL:
  - Juan Pérez - Entrada - 08:15:32 - Puntual - IA (87%)
- Notificación emergente: "Nuevo marcaje: Juan Pérez"

### 🔄 Probar marcaje de SALIDA
- Repite los pasos pero click en botón **"Salida"** (naranja)
- Debería reconocerte igual y registrar la salida

---

## Prueba 5: Marcaje Manual (Fallback)

### Objetivo
Probar el sistema de login manual cuando la IA falla o tiene baja confianza.

### Escenario A: Simular que IA no reconoce (persona no registrada)

1. **Abrir Terminal de Marcaje**
   - URL: http://localhost:5174

2. **Iniciar marcaje de ENTRADA**
   - Click "Entrada"

3. **Capturar foto de alguien NO registrado**
   - Usa una foto de otra persona
   - O tapa parcialmente tu cara
   - Click "Capturar"

### ✅ Resultado Esperado (IA Falla)

**Pantalla muestra formulario de login manual:**
```
⚠️ Verificación Manual Requerida

No se pudo reconocer ningún rostro. Use login manual.

Por favor ingrese sus credenciales para continuar

Email: [___________________]
Contraseña: [___________________]

[Cancelar]  [Marcar Entrada]
```

4. **Ingresar credenciales**
   - Email: `juan.perez@empresa.cl`
   - Contraseña: `juan123`
   - Click "Marcar Entrada"

### ✅ Resultado Esperado (Login Manual Exitoso)

**Pantalla muestra:**
```
✅ Marcaje Registrado

Juan Pérez
Entrada - 08:20:45
Estado: Puntual

Método: Manual (Credenciales)
```

**En el Dashboard:**
- Aparece: Juan Pérez - Entrada - 08:20:45 - Puntual - Manual
- Se distingue que fue marcaje manual (sin porcentaje de confianza IA)

### Escenario B: Simular IA caída

1. **Detener servicio IA temporalmente**
   ```bash
   docker stop ai-service
   ```

2. **Intentar marcar asistencia**
   - Debería mostrar inmediatamente el formulario de login manual
   - Mensaje: "Servicio de reconocimiento facial no disponible"

3. **Marcar con credenciales**
   - Funciona normal

4. **Reiniciar servicio IA**
   ```bash
   docker start ai-service
   ```

---

## Prueba 6: Verificar Dashboard en Tiempo Real

### Objetivo
Confirmar que el dashboard se actualiza en tiempo real vía WebSocket.

### Pasos:

1. **Abrir 2 ventanas del navegador**
   - Ventana 1: Dashboard Admin (http://localhost:8080)
     - Ve a "Dashboard" o "Marcajes de Hoy"
   - Ventana 2: Terminal de Marcaje (http://localhost:5174)

2. **Posicionar ventanas lado a lado**
   - Para poder ver ambas al mismo tiempo

3. **Hacer un marcaje en el Terminal**
   - En ventana 2, marca entrada o salida

4. **Observar Dashboard (ventana 1)**
   - **SIN REFRESCAR LA PÁGINA**
   - Deberías ver aparecer el marcaje INMEDIATAMENTE
   - Animación de notificación emergente
   - Contador de estadísticas se actualiza

### ✅ Resultado Esperado
- Marcaje aparece en menos de 1 segundo
- No es necesario refrescar la página
- Notificación tipo "toast" aparece brevemente
- Estadísticas actualizadas (Total, Puntuales, Atrasos)

### 🔍 Verificar WebSocket
Abre la consola del navegador (F12) en el Dashboard:
- Deberías ver mensajes como:
  ```
  WebSocket conectado
  Nuevo marcaje recibido: {usuario: "Juan Pérez", ...}
  ```

---

## Prueba 7: Probar Estados de Marcaje

### Objetivo
Verificar que el sistema detecta atrasos y marcajes puntuales correctamente.

### Escenario: Marcaje Puntual

**Horario de Juan: Entrada 08:00, Tolerancia 15 minutos**

- Si marcas entre 07:45 y 08:15 → **Puntual** ✅

1. **Asegurarte que la hora actual esté en ese rango**
   - Revisa el reloj en el terminal

2. **Marcar entrada**
   - Debería mostrar: "Estado: Puntual"
   - Dashboard muestra badge verde

### Escenario: Marcaje con Atraso

**Si marcas después de 08:15 → **Atraso** ⚠️**

1. **Si necesitas simular un atraso:**
   - Opción 1: Espera hasta después de 08:15
   - Opción 2: Edita el horario en el dashboard para que sea antes

2. **Marcar entrada**
   - Debería mostrar:
     ```
     Estado: Atraso
     Minutos de atraso: 12
     ```
   - Dashboard muestra badge rojo
   - Se envía notificación de atraso (si email está configurado)

### Escenario: Marcaje Anticipado

**Si marcas más de 15 minutos antes (antes 07:45) → Anticipado**

- Dashboard muestra badge azul

---

## Solución de Problemas

### ❌ "Error al cargar horarios"
**Problema:** No hay horarios creados
**Solución:**
1. Ve a "Gestión de Horarios"
2. Crea al menos un horario
3. Vuelve a crear el usuario

### ❌ "No se pudo reconocer ningún rostro"
**Posibles causas:**
1. **Usuario no entrenado** → Entrena el reconocimiento facial
2. **Mala iluminación** → Mejora la luz de tu entorno
3. **Servicio IA caído** → Verifica: http://localhost:5000/health
4. **Rostro no visible** → Asegúrate de estar frente a la cámara

**Solución temporal:** Usa login manual con email y contraseña

### ❌ "Credenciales inválidas" (Login Manual)
**Verifica:**
- Email correcto (debe ser el registrado)
- Contraseña correcta (la que pusiste al crear usuario)
- Usuario está activo en el sistema

### ❌ "Servicio de reconocimiento facial no disponible"
**Problema:** Servicio IA no responde

**Solución:**
```bash
# Ver estado
docker ps | grep ai-service

# Ver logs
docker logs ai-service -f

# Reiniciar servicio
docker restart ai-service

# Si hay error de dependencias Python:
docker-compose up --build ai-service
```

### ❌ Dashboard no se actualiza en tiempo real
**Problema:** WebSocket no conectado

**Solución:**
1. Verifica servicio WebSocket: http://localhost:3002/health
2. Abre consola del navegador (F12)
3. Busca errores de WebSocket
4. Verifica que el puerto 3002 no esté bloqueado por firewall

```bash
# Reiniciar WebSocket Service
docker restart websocket-service
```

### ❌ Error "Cannot connect to MongoDB"
**Solución:**
```bash
# Verificar MongoDB
docker ps | grep mongodb

# Ver logs
docker logs mongodb -f

# Reiniciar MongoDB
docker restart mongodb

# Si no existe, recrear todo
docker-compose down
docker-compose up --build
```

### 🔧 Comandos Útiles

```bash
# Ver todos los contenedores
docker ps

# Ver logs de un servicio específico
docker logs <container-name> -f

# Reiniciar un servicio
docker restart <container-name>

# Reiniciar todo
docker-compose restart

# Detener todo
docker-compose down

# Limpiar y reiniciar desde cero
docker-compose down -v
docker-compose up --build

# Acceder a MongoDB
docker exec -it mongodb mongosh
> use asistencia_db
> db.usuarios.find()
```

---

## 📊 Checklist de Pruebas Completadas

Marca cada prueba que completes:

- [ ] ✅ Todos los servicios iniciados correctamente
- [ ] ✅ Horario creado y visible
- [ ] ✅ Usuario creado con email y contraseña
- [ ] ✅ Reconocimiento facial entrenado (estado "Activo")
- [ ] ✅ Marcaje con IA exitoso (confianza >60%)
- [ ] ✅ Marcaje manual con credenciales exitoso
- [ ] ✅ Dashboard actualizado en tiempo real
- [ ] ✅ Marcaje puntual detectado correctamente
- [ ] ✅ Marcaje con atraso detectado correctamente
- [ ] ✅ Terminal vuelve automáticamente a pantalla inicial

---

## 🎯 Próximos Pasos

Una vez completadas todas las pruebas:

1. **Producción:**
   - Cambiar contraseñas de prueba
   - Configurar email (SMTP) para notificaciones
   - Ajustar horarios reales de la empresa
   - Entrenar IA con empleados reales

2. **Mejoras opcionales:**
   - Agregar más usuarios
   - Configurar múltiples horarios (turnos)
   - Personalizar ubicaciones de marcaje
   - Agregar reportes y estadísticas avanzadas

---

## 📞 Contacto y Soporte

Si encuentras problemas no listados aquí:
1. Revisa los logs de Docker
2. Verifica que todos los puertos estén libres
3. Consulta la documentación de cada servicio

**Archivos de configuración importantes:**
- `docker-compose.yml` - Orquestación de servicios
- `services/api-backend/.env` - Variables de entorno del backend
- `services/terminal-marcaje/.env` - Variables del terminal
- `services/frontend/.env` - Variables del dashboard

---

¡Buena suerte con las pruebas! 🚀
