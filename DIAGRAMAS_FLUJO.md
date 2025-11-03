# 🎨 Flujo Visual - Sistema de Reconocimiento Facial

## 📋 Flujo Completo de Entrenamiento

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMINISTRADOR                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 1: Crear Usuario                                          │
│  ─────────────────────────────────────────────────────────      │
│  • Accede a "Gestión de Usuarios"                               │
│  • Click en "+ Nuevo Usuario"                                   │
│  • Completa formulario:                                         │
│    - Nombre: Juan                                               │
│    - Apellido: Pérez                                            │
│    - RUT: 12345678-9                                            │
│    - Email: juan@empresa.cl                                     │
│    - Rol: Usuario                                               │
│    - Horario: Horario Mañana (08:00-17:00)                      │
│  • Click en "Crear"                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 2: Entrenar Reconocimiento Facial                         │
│  ─────────────────────────────────────────────────────────      │
│  • En la tabla, localiza a "Juan Pérez"                         │
│  • Click en botón 🎥 (amarillo)                                 │
│  • Se abre modal "Entrenamiento de Reconocimiento Facial"       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 3: Captura de Fotos                                       │
│  ─────────────────────────────────────────────────────────      │
│  • Click "Iniciar Cámara"                                       │
│  • Permite acceso a cámara                                      │
│                                                                 │
│  Captura múltiples fotos:                                       │
│                                                                 │
│  📸 Foto 1: Frontal ────────────────┐                           │
│                                     │                           │
│  📸 Foto 2: 15° izquierda ──────────┤                           │
│                                     │                           │
│  📸 Foto 3: 15° derecha ────────────┤──▶ 3-10 fotos            │
│                                     │                           │
│  📸 Foto 4: Con gafas (opcional) ───┤                           │
│                                     │                           │
│  📸 Foto 5: Sonriendo ──────────────┘                           │
│                                                                 │
│  • Revisa fotos en la cuadrícula                                │
│  • Elimina fotos malas (botón 🗑️)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 4: Entrenar Modelo                                        │
│  ─────────────────────────────────────────────────────────      │
│  • Click "✓ Entrenar Reconocimiento"                            │
│  • Sistema procesa imágenes (10-30 seg)                         │
│                                                                 │
│  Proceso interno:                                               │
│  ┌────────────┐    ┌──────────┐    ┌────────────┐             │
│  │  Frontend  │───▶│ Backend  │───▶│   API-IA   │             │
│  └────────────┘    └──────────┘    └────────────┘             │
│                                            │                    │
│                                            ▼                    │
│                                     Detección facial            │
│                                     Extracción features         │
│                                     Generación encodings        │
│                                     Almacenamiento              │
│                                                                 │
│  • ✅ Mensaje: "3 foto(s) procesada(s)"                         │
│  • Estado cambia a "✓ Activo"                                   │
└─────────────────────────────────────────────────────────────────┘

```

## 🎭 Flujo de Marcaje de Asistencia

```
┌─────────────────────────────────────────────────────────────────┐
│                    USUARIO (Juan Pérez)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 1: Acceder al Terminal                                    │
│  ─────────────────────────────────────────────────────────      │
│  • Accede a http://localhost:8080                               │
│  • Click en "Terminal de Marcaje"                               │
│  • Interface limpia y simple                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 2: Capturar Foto                                          │
│  ─────────────────────────────────────────────────────────      │
│  • Click "Iniciar Cámara"                                       │
│  • Posiciona tu rostro (centrado, iluminado)                    │
│  • Click "Capturar Foto"                                        │
│  • Revisa la foto                                               │
│  • Click "✓ Confirmar y Marcar"                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASO 3: Procesamiento Automático                               │
│  ─────────────────────────────────────────────────────────      │
│                                                                 │
│  1️⃣ Frontend envía imagen base64                                │
│              │                                                  │
│              ▼                                                  │
│  2️⃣ API-IA recibe y analiza                                     │
│      • Detecta rostro                                           │
│      • Extrae características faciales                          │
│      • Compara con encodings almacenados                        │
│      • Calcula confianza (0-100%)                               │
│              │                                                  │
│              ▼                                                  │
│  3️⃣ Si confianza > 85%:                                         │
│      • API-IA llama a Backend                                   │
│      • Backend registra marcaje                                 │
│      • Verifica horario                                         │
│      • Calcula si hay atraso                                    │
│      • Envía email si aplica                                    │
│              │                                                  │
│              ▼                                                  │
│  4️⃣ Respuesta al usuario                                        │
│      ✅ "Marcaje Exitoso"                                        │
│      Usuario: Juan Pérez                                        │
│      RUT: 12345678-9                                            │
│      Hora: 08:05                                                │
│      Estado: Puntual ✓                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Diagrama de Arquitectura Técnica

```
                    ┌──────────────────────┐
                    │   Usuario (Browser)  │
                    │  📱 localhost:8080   │
                    └──────────┬───────────┘
                               │
                               │ HTTPS
                               ▼
                    ┌──────────────────────┐
                    │    API Gateway       │
                    │    (HAProxy)         │
                    │    Port 8080         │
                    └──────────┬───────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   Frontend   │  │   Backend    │  │    API-IA    │
    │   (React)    │  │   (Node.js)  │  │   (Python)   │
    │   Nginx      │  │   Express    │  │    Flask     │
    │   Port 80    │  │   Port 3000  │  │   Port 5000  │
    └──────────────┘  └──────┬───────┘  └──────┬───────┘
                             │                  │
                             │                  │
                             ▼                  ▼
                    ┌──────────────────────────────┐
                    │       MongoDB Atlas          │
                    │   Usuarios, Marcajes, etc    │
                    │   + Face Encodings           │
                    └──────────────────────────────┘
```

## 🎯 Flujo de Datos - Entrenamiento

```
Frontend (AdminUsuarios.jsx)
    │
    │ handleCompleteFacialTraining(imagenes)
    ├─▶ usuariosAPI.entrenarFacial(userId, imagenes)
    │
    ▼
Backend (usuarioController.js)
    │
    │ POST /api/v1/usuarios/:id/entrenar-facial
    ├─▶ axios.post(AI_SERVICE_URL/train, {
    │       usuario_id: userId,
    │       nombre: "Juan Pérez",
    │       imagenes: [img1, img2, img3...]
    │   })
    │
    ▼
API-IA (reconocimiento.py)
    │
    │ @app.route('/train', methods=['POST'])
    ├─▶ Para cada imagen:
    │   ├─▶ Convertir base64 → numpy array
    │   ├─▶ face_recognition.face_locations(img)
    │   ├─▶ face_recognition.face_encodings(img)
    │   └─▶ Almacenar encoding
    │
    ├─▶ guardar_rostros() → encodings.pkl
    │
    ▼
Respuesta
    │
    └─▶ {
          success: true,
          rostros_procesados: 5,
          encodings_guardados: 5
        }
```

## 🎯 Flujo de Datos - Reconocimiento

```
Frontend (TerminalMarcaje.jsx)
    │
    │ processMarcaje()
    ├─▶ facialAPI.recognize(photoBase64)
    │
    ▼
API-IA (reconocimiento.py)
    │
    │ POST /recognize-and-mark
    ├─▶ imagen_base64_a_array(image)
    ├─▶ face_recognition.face_locations(frame)
    ├─▶ face_recognition.face_encodings(frame)
    │
    ├─▶ Para cada encoding conocido:
    │   ├─▶ face_recognition.compare_faces()
    │   ├─▶ face_recognition.face_distance()
    │   └─▶ Calcular % confianza
    │
    ├─▶ Si confianza > 85%:
    │   │
    │   └─▶ registrar_marcaje_backend(usuario_id, confianza)
    │       │
    │       └─▶ Backend: POST /api/v1/marcajes/reconocimiento
    │           │
    │           ├─▶ Usuario.findById(usuarioId)
    │           ├─▶ Horario.findById(horarioId)
    │           ├─▶ Calcular atraso
    │           ├─▶ Marcaje.create({...})
    │           └─▶ emailService.send() si hay atraso
    │
    ▼
Respuesta
    │
    └─▶ {
          success: true,
          reconocido: true,
          rostro: {
            usuario_id: "...",
            nombre: "Juan Pérez",
            confianza: 0.95
          },
          marcaje: {
            usuario: {...},
            fecha: "...",
            estado: "puntual"
          }
        }
```

## 💾 Estructura de Datos

### Usuario (MongoDB)
```javascript
{
  _id: ObjectId("..."),
  nombre: "Juan",
  apellido: "Pérez",
  rut: "12345678-9",
  email: "juan@empresa.cl",
  rol: "usuario",
  horarioId: ObjectId("..."),
  reconocimientoFacialActivo: true,  // ← Nuevo campo
  activo: true,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### Face Encoding (Archivo PKL)
```python
# encodings.pkl
{
  'nombres': ['userId1', 'userId1', 'userId2', 'userId3', ...],
  'encodings': [
    [128 números float],  # Encoding 1 de userId1
    [128 números float],  # Encoding 2 de userId1
    [128 números float],  # Encoding de userId2
    ...
  ]
}
```

### Marcaje (MongoDB)
```javascript
{
  _id: ObjectId("..."),
  usuarioId: ObjectId("..."),
  tipo: "entrada",
  fecha: ISODate("..."),
  horaRegistro: "08:05:23",
  estado: "puntual",
  minutosAtraso: 0,
  confianzaIA: 0.95,  // ← Nuevo campo
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

---

## 🎓 Conceptos Técnicos

### Face Encoding
Un "encoding" facial es un vector de 128 números que representa matemáticamente las características únicas de un rostro:
- Distancia entre ojos
- Forma de nariz
- Contorno facial
- Proporciones faciales
- etc.

### Algoritmo de Comparación
```python
# 1. Calcular distancia euclidiana entre encodings
distance = np.linalg.norm(encoding1 - encoding2)

# 2. Convertir a porcentaje de similitud
confianza = max(0, (1 - distance) * 100)

# 3. Umbral de decisión
if confianza > 85:
    return "RECONOCIDO"
else:
    return "NO_RECONOCIDO"
```

### Por qué múltiples fotos mejoran la precisión
- Cada foto captura el rostro desde diferente ángulo
- Variaciones de iluminación
- Diferentes expresiones faciales
- Aumenta el rango de reconocimiento
- Reduce falsos negativos

---

**Este diagrama te ayudará a entender cómo funciona el sistema completo** 🎨
