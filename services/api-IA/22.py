import face_recognition
import cv2
import numpy as np
import pickle
import os
import base64
from flask import Flask, Response, request, render_template_string, jsonify

# --- 1. Configuración Inicial y Carga de Datos ---

# Nombre del archivo donde guardaremos los rostros conocidos
DATOS_ROSTROS = "rostros_conocidos.dat"

print("Cargando rostros conocidos...")

try:
    with open(DATOS_ROSTROS, "rb") as f:
        datos_guardados = pickle.load(f)
        nombres_conocidos = datos_guardados['nombres']
        encodings_conocidos = datos_guardados['encodings']
    print(f"Se cargaron {len(nombres_conocidos)} rostros conocidos.")
except (FileNotFoundError, EOFError):
    print("No se encontró archivo de datos o está vacío. Empezando desde cero.")
    nombres_conocidos = []
    encodings_conocidos = []

# Variable global para guardar temporalmente el último rostro desconocido
ultimo_encoding_desconocido = None

# Función para guardar los rostros en el disco
def guardar_rostros():
    """Guarda la lista de nombres y encodings en un archivo."""
    global nombres_conocidos, encodings_conocidos
    
    if not nombres_conocidos:
        print("No hay datos que guardar.")
        return

    print(f"Guardando {len(nombres_conocidos)} rostros en {DATOS_ROSTROS}...")
    try:
        with open(DATOS_ROSTROS, "wb") as f:
            datos_para_guardar = {'nombres': nombres_conocidos, 'encodings': encodings_conocidos}
            pickle.dump(datos_para_guardar, f)
        print("¡Datos guardados exitosamente!")
    except Exception as e:
        print(f"Error al guardar los datos: {e}")

# --- 2. Inicializar la Cámara (opcional) ---
# Por defecto no intentamos acceder a la cámara del host. Si quieres usarla,
# establece la variable de entorno USE_HOST_CAMERA=1 al iniciar el contenedor.
USE_HOST_CAMERA = os.environ.get('USE_HOST_CAMERA', '0') in ('1', 'true', 'True')
video_capture = None
if USE_HOST_CAMERA:
    video_capture = cv2.VideoCapture(0)
    if not video_capture.isOpened():
        print("ERROR: ¡No se puede abrir la cámara del host! Asegúrate de que Docker tenga acceso o desactiva USE_HOST_CAMERA.")
        video_capture = None


# --- 3. Inicializar el Servidor Web (Flask) ---
app = Flask(__name__)


# --- 4. Lógica de Generación de Frames ---

def generate_frames():
    """Generador que captura video, procesa rostros y devuelve frames como JPEG."""
    global ultimo_encoding_desconocido

    if video_capture is None:
        # No hay cámara local disponible
        return

    while True:
        # Capturamos un solo fotograma de video
        ret, frame = video_capture.read()
        if not ret:
            print("Error al capturar frame de la cámara.")
            break

        # Convertimos y re-escalamos (¡más rápido!)
        rgb_small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = cv2.cvtColor(rgb_small_frame, cv2.COLOR_BGR2RGB)

        # Encontrar rostros y encodings
        face_locations = face_recognition.face_locations(rgb_small_frame, model="cnn")
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        nombres_en_frame = []
        
        for i, face_encoding in enumerate(face_encodings):
            matches = face_recognition.compare_faces(encodings_conocidos, face_encoding, tolerance=0.6)
            nombre = "Desconocido"

            face_distances = face_recognition.face_distance(encodings_conocidos, face_encoding)
            
            if len(face_distances) > 0:
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    nombre = nombres_conocidos[best_match_index]
            
            if nombre == "Desconocido":
                # Guardamos el encoding del primer desconocido que veamos
                # para que la ruta /guardar pueda usarlo.
                if ultimo_encoding_desconocido is None:
                     ultimo_encoding_desconocido = face_encoding
                     print("Capturado un rostro 'Desconocido' listo para guardar.")

            nombres_en_frame.append(nombre)

           
            top, right, bottom, left = face_locations[i]
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4

            cv2.rectangle(frame, (left, top), (right, bottom), (0, 0, 255), 2)
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 0, 255), cv2.FILLED)
            font = cv2.FONT_HERSHEY_DUPLEX
            cv2.putText(frame, nombre, (left + 6, bottom - 6), font, 1.0, (255, 255, 255), 1)

        
        (flag, encodedImage) = cv2.imencode(".jpg", frame)
        if not flag:
            continue

        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + bytearray(encodedImage) + b'\r\n')


@app.route('/')
def index():
    """Sirve la página HTML principal que mostrará el video."""
    # Usamos render_template_string para no necesitar un archivo HTML separado
    html_page = """
    <html>
    <head>
        <title>Reconocimiento Facial (Browser Webcam)</title>
        <style>
            body { font-family: Arial, sans-serif; background: #f0f0f0; }
            h1 { text-align: center; }
            #video-container { 
                width: 640px; 
                margin: 20px auto; 
                border: 10px solid #333; 
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
                background: #000;
                position: relative;
            }
            #instructions {
                width: 640px;
                margin: 20px auto;
                background: #fff;
                padding: 15px;
                border-radius: 8px;
            }
            code { background: #eee; padding: 3px; border-radius: 3px; }
            #overlay { position: absolute; left: 0; top: 0; }
        </style>
    </head>
    <body>
        <h1>Cámara de Reconocimiento Facial (browser webcam → Docker)</h1>
        <div id="video-container">
            <video id="video" width="640" height="480" autoplay muted playsinline></video>
            <canvas id="overlay" width="640" height="480"></canvas>
        </div>
        <div id="instructions">
            <h2>Cómo usar</h2>
        
            <p id="status">Estado: inicializando...</p>
        </div>

        <script>
        const video = document.getElementById('video');
        const overlay = document.getElementById('overlay');
        const ctx = overlay.getContext('2d');
        const status = document.getElementById('status');

        // Pedir cámara
        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                video.srcObject = stream;
                status.textContent = 'Estado: cámara activa. Enviando frames...';
                startSending();
            } catch (err) {
                status.textContent = 'Error al acceder a la cámara: ' + err.message;
            }
        }

        let sending = false;
        function startSending() {
            if (sending) return;
            sending = true;
            const sendInterval = 500; // ms
            setInterval(async () => {
                if (video.readyState < 2) return;
                // Dibujar video en canvas temporal
                const tmp = document.createElement('canvas');
                tmp.width = video.videoWidth || 640;
                tmp.height = video.videoHeight || 480;
                const tctx = tmp.getContext('2d');
                tctx.drawImage(video, 0, 0, tmp.width, tmp.height);
                const dataURL = tmp.toDataURL('image/jpeg', 0.7);
                try {
                    const res = await fetch('/upload_frame', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image: dataURL })
                    });
                    if (!res.ok) {
                        const text = await res.text();
                        status.textContent = 'Servidor: ' + res.status + ' - ' + text;
                        return;
                    }
                    const data = await res.json();
                    // Dibujar rectángulos y nombres
                    ctx.clearRect(0,0,overlay.width, overlay.height);
                    if (data.boxes) {
                        data.boxes.forEach((b, i) => {
                            ctx.strokeStyle = b.color || 'red';
                            ctx.lineWidth = 2;
                            ctx.strokeRect(b.left, b.top, b.width, b.height);
                            ctx.fillStyle = b.color || 'red';
                            ctx.fillRect(b.left, b.top + b.height - 20, Math.max(80, b.width), 20);
                            ctx.fillStyle = 'white';
                            ctx.font = '16px Arial';
                            ctx.fillText(data.names[i] || 'Desconocido', b.left + 6, b.top + b.height - 6);
                        });
                    }
                    status.textContent = 'Última respuesta: ' + (data.names.join(', ') || 'sin rostros');
                } catch (err) {
                    status.textContent = 'Error enviando frame: ' + err.message;
                }
            }, sendInterval);
        }

        startCamera();
        </script>
    </body>
    </html>
    """
    return render_template_string(html_page)


@app.route('/video_feed')
def video_feed():
    """Esta es la ruta que sirve el stream de video."""
    if video_capture is None:
        return ("Local camera is not enabled in this container. Use the browser webcam UI at / to stream frames.", 503)
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/guardar')
def guardar_nuevo_rostro():
    """Esta ruta guarda el último rostro 'Desconocido' que se detectó."""
    global ultimo_encoding_desconocido, nombres_conocidos, encodings_conocidos

    # Obtener el nombre de la URL (ej: ?nombre=Carlos)
    nombre_nuevo = request.args.get('nombre')

    if nombre_nuevo is None or nombre_nuevo.strip() == "":
        return "Error: No se proporcionó un nombre. Usa ?nombre=TUNOMBRE", 400
    
    if ultimo_encoding_desconocido is None:
        return "Error: No hay ningún rostro 'Desconocido' capturado recientemente. Inténtalo de nuevo.", 404

    # Añadir el nuevo rostro a nuestras listas
    nombres_conocidos.append(nombre_nuevo)
    encodings_conocidos.append(ultimo_encoding_desconocido)
    
    # Guardar en el disco
    guardar_rostros()

    print(f"¡Rostro guardado exitosamente como: {nombre_nuevo}!")
    
    # Resetear el encoding desconocido para que no se guarde dos veces
    ultimo_encoding_desconocido = None
    
    return f"¡Éxito! Se guardó el rostro de {nombre_nuevo}. Puedes cerrar esta pestaña.", 200


# New endpoint to receive frames from the browser (works when app runs in Docker)
@app.route('/upload_frame', methods=['POST'])
def upload_frame():
    """Recibe un JSON con { image: dataURL } desde el navegador, procesa el frame y devuelve nombres y cajas."""
    global ultimo_encoding_desconocido, nombres_conocidos, encodings_conocidos

    data = request.get_json()
    if not data or 'image' not in data:
        return 'Falta campo image en JSON', 400

    img_data = data['image']
    # data:image/jpeg;base64,...
    if ',' in img_data:
        header, img_base64 = img_data.split(',', 1)
    else:
        img_base64 = img_data

    try:
        img_bytes = base64.b64decode(img_base64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return 'No se pudo decodificar la imagen', 400
    except Exception as e:
        return f'Error decodificando imagen: {e}', 400

    # Convert to RGB and resize as in generate_frames
    rgb_small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
    rgb_small_frame = cv2.cvtColor(rgb_small_frame, cv2.COLOR_BGR2RGB)

    face_locations = face_recognition.face_locations(rgb_small_frame, model="cnn")
    face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

    names_in_frame = []
    boxes = []

    for i, face_encoding in enumerate(face_encodings):
        matches = face_recognition.compare_faces(encodings_conocidos, face_encoding, tolerance=0.6)
        nombre = 'Desconocido'

        if encodings_conocidos:
            face_distances = face_recognition.face_distance(encodings_conocidos, face_encoding)
            best_match_index = np.argmin(face_distances)
            if matches[best_match_index]:
                nombre = nombres_conocidos[best_match_index]

        # If unknown, store the encoding so /guardar can use it
        if nombre == 'Desconocido' and ultimo_encoding_desconocido is None:
            ultimo_encoding_desconocido = face_encoding

        names_in_frame.append(nombre)

        # Scale face_locations back to original frame size
        top, right, bottom, left = face_locations[i]
        top *= 4
        right *= 4
        bottom *= 4
        left *= 4
        width = right - left
        height = bottom - top

        boxes.append({
            'left': int(left), 'top': int(top), 'width': int(width), 'height': int(height),
            'color': "#0004ff"
        })

    return jsonify({'names': names_in_frame, 'boxes': boxes})


# --- 6. Iniciar el Servidor ---

if __name__ == '__main__':
    print("Iniciando servidor Flask en http://0.0.0.0:5000")
    # threaded=True permite que el servidor maneje múltiples peticiones (el stream y el guardado) a la vez
    # host='0.0.0.0' es crucial para que sea accesible desde fuera del contenedor Docker
    app.run(host='0.0.0.0', port=5000, threaded=True)