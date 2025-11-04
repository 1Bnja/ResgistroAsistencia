import { useState, useRef, useEffect } from 'react';
import Card from '../components/Card';
import Alert from '../components/Alert';
import Loader from '../components/Loader';

const AI_URL = '/ai';  // Through API Gateway

export default function TerminalMarcaje() {
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [lastMarcaje, setLastMarcaje] = useState(null);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    console.log('🎬 Terminal Marcaje loaded - BUILD: 2025-11-04-05:00');
    return () => stopCamera();
  }, []);

  useEffect(() => {
    // Cuando cameraActive cambia a true y tenemos un stream, conectar al video
    if (cameraActive && streamRef.current && videoRef.current) {
      console.log('🔄 Effect: Connecting stream to video element');
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

      console.log('✅ Stream obtained:', stream.active, 'tracks:', stream.getTracks().length);
      streamRef.current = stream;
      setCameraActive(true);

      // Esperar a que React renderice el video element
      setTimeout(() => {
        if (videoRef.current) {
          console.log('📺 Setting srcObject to video element');
          videoRef.current.srcObject = stream;
          videoRef.current.play()
            .then(() => console.log('▶️ Video playing successfully'))
            .catch(err => console.error('❌ Play error:', err));
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

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setLoading(true);
    setAlert(null);

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Resolución optimizada
      canvas.width = 640;
      canvas.height = 480;
      canvas.getContext('2d').drawImage(video, 0, 0, 640, 480);
      
      // Calidad 0.8 para balance
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
      console.log('📸 Image captured:', Math.round(imageBase64.length/1024), 'KB');

      const response = await fetch(`${AI_URL}/recognize-and-mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64, tipo: 'entrada' })
      });

      const data = await response.json();
      console.log('📥 Response:', data);

      if (!response.ok || !data.success) {
        setAlert({ type: 'error', message: data.message || 'Error en reconocimiento' });
        return;
      }

      setLastMarcaje({
        usuario: data.rostro?.nombre || 'Usuario',
        confianza: (data.rostro?.confianza * 100).toFixed(1),
        hora: new Date().toLocaleTimeString('es-CL'),
        tipo: 'entrada'
      });

      setAlert({
        type: 'success',
        message: `¡Marcaje registrado! Confianza: ${(data.rostro?.confianza * 100).toFixed(1)}%`
      });

      setTimeout(() => stopCamera(), 2000);

    } catch (error) {
      console.error('❌ Error:', error);
      setAlert({ type: 'error', message: 'Error: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card>
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">Terminal de Marcaje</h1>
          <p className="text-gray-600">Reconocimiento facial</p>
          <p className="text-xs text-gray-400 mt-2">BUILD: 2025-11-04-05:00</p>
        </div>

        {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

        <div className="space-y-6">
          <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ minHeight: '480px' }}>
            {!cameraActive ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">📷</div>
                  <p className="text-white mb-4">Cámara desactivada</p>
                  <button
                    onClick={startCamera}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Activar Cámara
                  </button>
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
                  style={{ minHeight: '480px' }}
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

          <div className="flex gap-4 justify-center">
            {cameraActive ? (
              <>
                <button
                  onClick={captureAndRecognize}
                  disabled={loading}
                  className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-lg font-semibold"
                >
                  {loading ? 'Procesando...' : '📸 Marcar Asistencia'}
                </button>
                <button
                  onClick={stopCamera}
                  disabled={loading}
                  className="px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                >
                  Detener
                </button>
              </>
            ) : (
              <button
                onClick={startCamera}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold"
              >
                Iniciar Cámara
              </button>
            )}
          </div>

          {lastMarcaje && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">✅ Último Marcaje</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Usuario:</span>
                  <p className="font-semibold">{lastMarcaje.usuario}</p>
                </div>
                <div>
                  <span className="text-gray-600">Hora:</span>
                  <p className="font-semibold">{lastMarcaje.hora}</p>
                </div>
                <div>
                  <span className="text-gray-600">Confianza:</span>
                  <p className="font-semibold">{lastMarcaje.confianza}%</p>
                </div>
                <div>
                  <span className="text-gray-600">Tipo:</span>
                  <p className="font-semibold capitalize">{lastMarcaje.tipo}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Instrucciones</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Active la cámara</li>
              <li>• Posicione su rostro frente a la cámara</li>
              <li>• Presione "Marcar Asistencia"</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}