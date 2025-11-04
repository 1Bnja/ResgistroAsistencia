import { useState, useRef, useEffect } from 'react';
import Alert from './Alert';
import Loader from './Loader';

const AI_URL = '/ai';  // Through API Gateway
const MIN_PHOTOS = 3;
const MAX_PHOTOS = 10;

export default function FacialTraining({ usuarioId, nombreUsuario, onComplete, onCancel }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [progress, setProgress] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    console.log('🎬 FacialTraining loaded - BUILD: 2025-11-04-05:00');
    startCamera();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    // Cuando cameraActive cambia a true, conectar stream al video
    if (cameraActive && streamRef.current && videoRef.current) {
      console.log('🔄 Effect: Connecting stream to video');
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play()
        .then(() => console.log('✅ Effect: Video playing'))
        .catch(err => console.error('❌ Effect play error:', err));
    }
  }, [cameraActive]);

  const startCamera = async () => {
    console.log('📹 Starting camera...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: false
      });

      console.log('✅ Stream obtained:', stream.active);
      streamRef.current = stream;
      setCameraActive(true);

      // Timeout backup para conectar el stream
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          console.log('📺 Timeout: Setting srcObject');
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play()
            .then(() => console.log('▶️ Timeout: Playing'))
            .catch(err => console.error('❌ Timeout play error:', err));
        }
      }, 100);
    } catch (error) {
      console.error('❌ Camera error:', error);
      setAlert({ type: 'error', message: 'No se pudo acceder a la cámara' });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (photos.length >= MAX_PHOTOS) {
      setAlert({ type: 'warning', message: `Máximo ${MAX_PHOTOS} fotos` });
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Reducir resolución para optimizar tamaño
    canvas.width = 640;  // Reducido de 1280
    canvas.height = 480; // Reducido de 720
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Calidad reducida de 0.95 a 0.7 para menor tamaño
    const photoData = canvas.toDataURL('image/jpeg', 0.7);
    setPhotos([...photos, photoData]);
    console.log(`📸 Photo ${photos.length + 1} captured (${Math.round(photoData.length/1024)}KB)`);
  };

  const deletePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const trainModel = async () => {
    if (photos.length < MIN_PHOTOS) {
      setAlert({ type: 'warning', message: `Capture al menos ${MIN_PHOTOS} fotos` });
      return;
    }

    setLoading(true);
    setAlert(null);
    setProgress('Enviando fotos al servicio de IA...');

    try {
      console.log(`🤖 Training with ${photos.length} photos`);
      
      const response = await fetch(`${AI_URL}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuarioId,
          nombre: nombreUsuario,
          imagenes: photos
        })
      });

      const data = await response.json();
      console.log('📥 Training response:', data);

      if (!response.ok || !data.success) {
        setAlert({ type: 'error', message: data.message || 'Error en entrenamiento' });
        setProgress('');
        return;
      }

      setAlert({
        type: 'success',
        message: `¡Entrenamiento exitoso! ${data.rostros_procesados} fotos procesadas`
      });
      
      setTimeout(() => {
        stopCamera();
        if (onComplete) onComplete(data);
      }, 2000);

    } catch (error) {
      console.error('❌ Training error:', error);
      setAlert({ type: 'error', message: 'Error: ' + error.message });
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  const canTrain = photos.length >= MIN_PHOTOS && photos.length <= MAX_PHOTOS;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Entrenamiento Facial</h2>
        <p className="text-gray-600">Usuario: {nombreUsuario}</p>
        <p className="text-sm text-gray-500 mt-1">
          Fotos capturadas: {photos.length} / {MAX_PHOTOS} (mínimo: {MIN_PHOTOS})
        </p>
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {progress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-blue-800">{progress}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Video de la cámara */}
        <div>
          <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ minHeight: '360px' }}>
            {!cameraActive ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="text-4xl mb-2">📷</div>
                  <p>Cámara desactivada</p>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ minHeight: '360px' }}
                />
                {loading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <Loader />
                  </div>
                )}
              </>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div className="mt-4 flex gap-2">
            <button
              onClick={capturePhoto}
              disabled={loading || !cameraActive || photos.length >= MAX_PHOTOS}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              📸 Capturar Foto
            </button>
            {photos.length > 0 && (
              <button
                onClick={() => setPhotos([])}
                disabled={loading}
                className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
              >
                🗑️ Borrar Todas
              </button>
            )}
          </div>
        </div>

        {/* Galería de fotos capturadas */}
        <div>
          <h3 className="font-semibold mb-3">Fotos Capturadas</h3>
          <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <img
                  src={photo}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <button
                  onClick={() => deletePhoto(index)}
                  disabled={loading}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
                <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
            {photos.length === 0 && (
              <div className="col-span-3 text-center text-gray-500 py-8">
                No hay fotos capturadas
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">📋 Instrucciones</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Capture entre {MIN_PHOTOS} y {MAX_PHOTOS} fotos desde diferentes ángulos</li>
          <li>• Varíe ligeramente la posición de su cabeza entre fotos</li>
          <li>• Mantenga buena iluminación y mire a la cámara</li>
          <li>• Evite obstrucciones en el rostro</li>
        </ul>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-4">
        <button
          onClick={trainModel}
          disabled={!canTrain || loading}
          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold"
        >
          {loading ? 'Entrenando...' : '✅ Entrenar Modelo'}
        </button>
        <button
          onClick={() => {
            stopCamera();
            if (onCancel) onCancel();
          }}
          disabled={loading}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}