"""
API de Reconoc  imiento Facial - Sistema de Asistencia
Servicio Flask que procesa imagenes, reconoce rostros y se comunica con el backend
"""

import os
import pickle
import base64
import cv2
import numpy as np
import face_recognition
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

# ==========================================
# CONFIGURACION
# ==========================================

app = Flask(__name__)
CORS(app)

# URLs de servicios
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://api-backend:3000/api/v1')

# Archivo para almacenar encodings
DATOS_ROSTROS = "rostros_conocidos.dat"

# Cargar rostros conocidos al iniciar
nombres_conocidos = []
encodings_conocidos = []

print("Cargando rostros conocidos...")
try:
    with open(DATOS_ROSTROS, "rb") as f:
        datos_guardados = pickle.load(f)
        nombres_conocidos = datos_guardados['nombres']
        encodings_conocidos = datos_guardados['encodings']
    print(f"Se cargaron {len(nombres_conocidos)} rostros conocidos.")
except (FileNotFoundError, EOFError):
    print("No se encontro archivo de datos. Empezando desde cero.")


# ==========================================
# FUNCIONES AUXILIARES
# ==========================================

def guardar_rostros():
    """Guarda la lista de nombres y encodings en un archivo."""
    if not nombres_conocidos:
        print("No hay datos que guardar.")
        return
    
    print(f"Guardando {len(nombres_conocidos)} rostros...")
    try:
        with open(DATOS_ROSTROS, "wb") as f:
            pickle.dump({
                'nombres': nombres_conocidos,
                'encodings': encodings_conocidos
            }, f)
        print("Datos guardados exitosamente!")
    except Exception as e:
        print(f"Error al guardar los datos: {e}")


def obtener_usuarios_backend():
    """Obtiene la lista de usuarios activos desde el backend."""
    try:
        url = f"{BACKEND_URL}/sync-encodings"
        print(f"🌐 Obteniendo usuarios de: {url}", flush=True)
        response = requests.get(url, timeout=5)
        print(f"📡 Status: {response.status_code}", flush=True)
        
        if response.status_code == 200:
            data = response.json()
            print(f"📦 Data keys: {list(data.keys())}", flush=True)
            usuarios = data.get('data', [])
            print(f"👥 Usuarios en response: {len(usuarios)}", flush=True)
            return usuarios
        else:
            print(f"❌ Error al obtener usuarios: {response.status_code}", flush=True)
            return []
    except Exception as e:
        print(f"❌ Error conectando con backend: {e}", flush=True)
        import traceback
        traceback.print_exc()
        return []


def sincronizar_encodings():
    """
    Sincroniza los encodings locales con los usuarios del backend.
    Obtiene usuarios que tienen encodingFacial y los carga en memoria.
    """
    global nombres_conocidos, encodings_conocidos
    
    print("Sincronizando encodings con backend...", flush=True)
    usuarios = obtener_usuarios_backend()
    print(f"Usuarios obtenidos: {len(usuarios)}", flush=True)
    
    nombres_nuevos = []
    encodings_nuevos = []
    
    for usuario in usuarios:
        if usuario.get('encodingFacial'):
            try:
                # Decodificar encoding desde string (base64 o pickle)
                encoding_str = usuario['encodingFacial']
                encoding_bytes = base64.b64decode(encoding_str)
                encoding = pickle.loads(encoding_bytes)
                
                # Usar el ID del usuario como identificador unico
                usuario_id = str(usuario['_id'])
                nombres_nuevos.append(usuario_id)
                encodings_nuevos.append(encoding)
                print(f"✅ Encoding cargado: {usuario.get('nombre')}", flush=True)
            except Exception as e:
                print(f"❌ Error procesando encoding de {usuario.get('nombre')}: {e}", flush=True)
    
    nombres_conocidos = nombres_nuevos
    encodings_conocidos = encodings_nuevos
    
    # Guardar en archivo local
    guardar_rostros()
    print(f"✅ Sincronizados {len(nombres_conocidos)} encodings", flush=True)


def registrar_marcaje_backend(usuario_id, confianza, tipo='entrada'):
    """Registra un marcaje en el backend."""
    try:
        response = requests.post(
            f"{BACKEND_URL}/marcajes/reconocimiento",
            json={
                "usuarioId": usuario_id,
                "confianza": float(confianza),
                "tipo": tipo
            },
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            return response.json()
        else:
            print(f"Error al registrar marcaje: {response.status_code}")
            return {"success": False, "message": "Error en backend"}
    except Exception as e:
        print(f"Error registrando marcaje: {e}")
        return {"success": False, "message": str(e)}


def imagen_base64_a_array(imagen_base64):
    """Convierte una imagen base64 a array numpy para OpenCV."""
    try:
        # Eliminar prefijo data:image si existe
        if ',' in imagen_base64:
            imagen_base64 = imagen_base64.split(',')[1]
        
        # Decodificar base64
        img_bytes = base64.b64decode(imagen_base64)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        
        # Decodificar imagen
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise ValueError("No se pudo decodificar la imagen")
        
        return frame
    except Exception as e:
        raise ValueError(f"Error decodificando imagen: {e}")


def procesar_frame_reconocimiento(frame):
    """
    Procesa un frame y reconoce rostros.
    Retorna lista de rostros detectados con sus datos.
    """
    # Redimensionar para acelerar procesamiento
    rgb_small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
    rgb_small_frame = cv2.cvtColor(rgb_small_frame, cv2.COLOR_BGR2RGB)
    
    # Detectar rostros
    face_locations = face_recognition.face_locations(rgb_small_frame, model="cnn")
    face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
    
    rostros_detectados = []
    
    for i, face_encoding in enumerate(face_encodings):
        # Coordenadas del rostro (escaladas de vuelta)
        top, right, bottom, left = face_locations[i]
        top *= 4
        right *= 4
        bottom *= 4
        left *= 4
        
        # Intentar reconocer
        usuario_id = None
        confianza = 0.0
        nombre = "Desconocido"
        
        if len(encodings_conocidos) > 0:
            # Comparar con rostros conocidos
            distancias = face_recognition.face_distance(encodings_conocidos, face_encoding)
            mejor_indice = np.argmin(distancias)
            mejor_distancia = distancias[mejor_indice]
            
            # Umbral de confianza (0.6 = estricto, 0.7 = moderado)
            if mejor_distancia < 0.6:
                usuario_id = nombres_conocidos[mejor_indice]
                confianza = 1.0 - mejor_distancia
                nombre = f"Usuario {usuario_id[:8]}"  # Mostrar primeros 8 chars del ID
        
        rostros_detectados.append({
            'usuario_id': usuario_id,
            'nombre': nombre,
            'confianza': round(confianza, 3),
            'reconocido': usuario_id is not None,
            'bbox': {
                'left': int(left),
                'top': int(top),
                'width': int(right - left),
                'height': int(bottom - top)
            }
        })
    
    return rostros_detectados


# ==========================================
# RUTAS DE LA API
# ==========================================

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'service': 'api-ia-reconocimiento',
        'rostros_cargados': len(nombres_conocidos)
    }), 200


@app.route('/recognize', methods=['POST'])
def recognize():
    """
    Procesa una imagen y reconoce rostros.
    
    Body (JSON):
    {
        "image": "data:image/jpeg;base64,..." o base64 directo
    }
    
    Respuesta:
    {
        "success": true,
        "rostros": [
            {
                "usuario_id": "507f1f77bcf86cd799439011",
                "nombre": "Usuario 507f1f77",
                "confianza": 0.952,
                "reconocido": true,
                "bbox": { "left": 100, "top": 50, "width": 200, "height": 250 }
            }
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'message': 'No se proporciono imagen'
            }), 400
        
        # Convertir imagen base64 a array
        frame = imagen_base64_a_array(data['image'])
        
        # Procesar reconocimiento
        rostros = procesar_frame_reconocimiento(frame)
        
        return jsonify({
            'success': True,
            'rostros': rostros,
            'total_detectados': len(rostros)
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400
    except Exception as e:
        print(f"Error en /recognize: {e}")
        return jsonify({
            'success': False,
            'message': 'Error procesando imagen'
        }), 500


@app.route('/recognize-and-mark', methods=['POST'])
def recognize_and_mark():
    """
    Reconoce rostro y registra marcaje automaticamente en el backend.
    
    Body (JSON):
    {
        "image": "data:image/jpeg;base64,...",
        "tipo": "entrada" | "salida"  (opcional, default: "entrada")
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'message': 'No se proporciono imagen'
            }), 400
        
        tipo_marcaje = data.get('tipo', 'entrada')
        frame = imagen_base64_a_array(data['image'])
        rostros = procesar_frame_reconocimiento(frame)
        
        if not rostros:
            return jsonify({
                'success': False,
                'message': 'No se detectaron rostros en la imagen'
            }), 400
        
        rostro_principal = max(rostros, key=lambda r: r['confianza'])
        
        if not rostro_principal['reconocido']:
            return jsonify({
                'success': False,
                'message': 'Rostro no reconocido',
                'rostro': rostro_principal
            }), 404
        
        resultado_marcaje = registrar_marcaje_backend(
            rostro_principal['usuario_id'],
            rostro_principal['confianza'],
            tipo_marcaje
        )
        
        if resultado_marcaje.get('success'):
            return jsonify({
                'success': True,
                'reconocido': True,
                'rostro': rostro_principal,
                'marcaje': resultado_marcaje.get('data', {})
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': resultado_marcaje.get('message', 'Error registrando marcaje'),
                'rostro': rostro_principal
            }), 500
        
    except ValueError as e:
        print(f"ValueError en /recognize-and-mark: {e}", flush=True)
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400
    except Exception as e:
        print(f"❌ Error en /recognize-and-mark: {e}", flush=True)
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Error procesando solicitud',
            'error': str(e)
        }), 500


@app.route('/train', methods=['POST'])
def train():
    """
    Registra uno o múltiples rostros de un usuario en el sistema.
    
    Body (JSON):
    {
        "usuario_id": "507f1f77bcf86cd799439011",
        "nombre": "Juan Pérez",
        "imagenes": ["data:image/jpeg;base64,...", "data:image/jpeg;base64,..."]
    }
    
    O formato antiguo (compatibilidad):
    {
        "usuario_id": "507f1f77bcf86cd799439011",
        "image": "data:image/jpeg;base64,..."
    }
    """
    try:
        data = request.get_json()
        print(f"=== TRAIN REQUEST ===")
        print(f"Data keys: {data.keys() if data else 'None'}")
        
        if not data or 'usuario_id' not in data:
            print(f"ERROR: Missing usuario_id. Data: {data}")
            return jsonify({
                'success': False,
                'message': 'Se requiere usuario_id'
            }), 400
        
        usuario_id = data['usuario_id']
        nombre = data.get('nombre', usuario_id)
        
        # Soportar formato antiguo (single image) y nuevo (multiple imagenes)
        imagenes = []
        if 'imagenes' in data and isinstance(data['imagenes'], list):
            imagenes = data['imagenes']
        elif 'image' in data:
            imagenes = [data['image']]
        else:
            return jsonify({
                'success': False,
                'message': 'Se requiere al menos una imagen (image o imagenes[])'
            }), 400
        
        # Procesar todas las imágenes
        nuevos_encodings = []
        rostros_procesados = 0
        errores = []
        
        for idx, imagen_b64 in enumerate(imagenes):
            try:
                frame = imagen_base64_a_array(imagen_b64)
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Asegurar tamaño mínimo para detección CNN
                h, w = rgb_frame.shape[:2]
                print(f"Imagen {idx + 1}: {w}x{h}", flush=True)
                
                # Si la imagen es pequeña, aumentar su tamaño
                if w < 800 or h < 600:
                    scale_factor = max(800/w, 600/h)
                    new_w = int(w * scale_factor)
                    new_h = int(h * scale_factor)
                    rgb_frame = cv2.resize(rgb_frame, (new_w, new_h))
                    print(f"Imagen redimensionada a: {new_w}x{new_h}", flush=True)
                
                # Usar modelo HOG (más rápido y funciona mejor con imágenes pequeñas)
                face_locations = face_recognition.face_locations(rgb_frame, model="hog")
                print(f"Face locations encontradas: {len(face_locations)}", flush=True)
                
                if not face_locations:
                    errores.append(f"Imagen {idx + 1}: No se detectó ningún rostro")
                    print(f"Imagen {idx + 1}: No se detectó rostro", flush=True)
                    continue
                
                if len(face_locations) > 1:
                    errores.append(f"Imagen {idx + 1}: Se detectaron múltiples rostros")
                    print(f"Imagen {idx + 1}: Múltiples rostros detectados: {len(face_locations)}", flush=True)
                    continue
                
                face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
                if face_encodings:
                    nuevos_encodings.append(face_encodings[0])
                    rostros_procesados += 1
                    print(f"Imagen {idx + 1}: Encoding generado exitosamente", flush=True)
                    
            except Exception as e:
                print(f"Imagen {idx + 1}: EXCEPCIÓN - {str(e)}", flush=True)
                errores.append(f"Imagen {idx + 1}: Error - {str(e)}")
                continue
        
        if not nuevos_encodings:
            return jsonify({
                'success': False,
                'message': 'No se pudo procesar ninguna imagen válida',
                'errores': errores
            }), 400
        
        # Actualizar o agregar encodings
        # Si ya existe el usuario, reemplazamos todos sus encodings con los nuevos
        # Si es nuevo, agregamos todos
        if usuario_id in nombres_conocidos:
            # Eliminar encodings antiguos
            indices_a_eliminar = [i for i, nombre in enumerate(nombres_conocidos) if nombre == usuario_id]
            for indice in reversed(indices_a_eliminar):
                del nombres_conocidos[indice]
                del encodings_conocidos[indice]
            print(f"Encodings antiguos eliminados para usuario {usuario_id}")
        
        # Agregar nuevos encodings
        for encoding in nuevos_encodings:
            nombres_conocidos.append(usuario_id)
            encodings_conocidos.append(encoding)
        
        print(f"{len(nuevos_encodings)} encodings agregados para usuario {usuario_id} ({nombre})")
        
        guardar_rostros()
        
        # Serializar el primer encoding para enviarlo al backend
        encoding_base64 = None
        if nuevos_encodings:
            try:
                # Tomar el primer encoding (el más representativo)
                encoding_bytes = pickle.dumps(nuevos_encodings[0])
                encoding_base64 = base64.b64encode(encoding_bytes).decode('utf-8')
            except Exception as e:
                print(f"Error serializando encoding: {e}", flush=True)
        
        return jsonify({
            'success': True,
            'message': 'Rostro(s) registrado(s) exitosamente',
            'rostros_procesados': rostros_procesados,
            'encodings_guardados': len(nuevos_encodings),
            'encoding_base64': encoding_base64,
            'total_rostros_sistema': len(set(nombres_conocidos)),
            'errores': errores if errores else None
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400
    except Exception as e:
        print(f"Error en /train: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Error procesando entrenamiento',
            'error': str(e)
        }), 500


@app.route('/sync', methods=['POST'])
def sync():
    """Sincroniza encodings desde el backend."""
    try:
        sincronizar_encodings()
        
        return jsonify({
            'success': True,
            'message': 'Encodings sincronizados exitosamente',
            'total_rostros': len(nombres_conocidos)
        }), 200
        
    except Exception as e:
        print(f"Error en /sync: {e}")
        return jsonify({
            'success': False,
            'message': 'Error sincronizando encodings'
        }), 500


# ==========================================
# INICIAR SERVIDOR
# ==========================================

if __name__ == '__main__':
    print("\n" + "="*50)
    print("API de Reconocimiento Facial")
    print("="*50)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Rostros cargados: {len(nombres_conocidos)}")
    print("="*50 + "\n")
    
    try:
        sincronizar_encodings()
    except Exception as e:
        print(f"No se pudo sincronizar al inicio: {e}")
    
    app.run(
        host='0.0.0.0',
        port=5000,
        threaded=True,
        debug=os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    )
