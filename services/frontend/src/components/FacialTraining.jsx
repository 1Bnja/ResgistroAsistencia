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
    <div className="facial-training-container">
      {/* Header moderno */}
      <div className="facial-training-header">
        <div className="header-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/>
            <path d="M12 14c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z"/>
          </svg>
        </div>
        <h2>Entrenamiento de Reconocimiento Facial</h2>
        <p className="subtitle">{nombreUsuario}</p>
        <div className="progress-badge">
          <span className="photo-count">{photos.length}</span>
          <span className="separator">/</span>
          <span className="photo-max">{MAX_PHOTOS}</span>
          <span className="label">fotos</span>
        </div>
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {progress && (
        <div className="progress-banner">
          <div className="spinner"></div>
          <p>{progress}</p>
        </div>
      )}

      <div className="training-grid">
        {/* Vista previa de cámara mejorada */}
        <div className="camera-section">
          <div className="camera-preview">
            {!cameraActive ? (
              <div className="camera-placeholder">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <p>Cámara desactivada</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-video"
                />
                <div className="camera-overlay">
                  <div className="face-guide"></div>
                </div>
                {loading && (
                  <div className="processing-overlay">
                    <Loader />
                  </div>
                )}
              </>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div className="camera-controls">
            <button
              onClick={capturePhoto}
              disabled={loading || !cameraActive || photos.length >= MAX_PHOTOS}
              className="btn btn-capture btn-primary"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Capturar Foto
            </button>
            {photos.length > 0 && (
              <button
                onClick={() => setPhotos([])}
                disabled={loading}
                className="btn btn-clear btn-secondary"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>
                </svg>
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Galería de fotos mejorada */}
        <div className="gallery-section">
          <div className="gallery-header">
            <h3>Galería de Fotos</h3>
            <span className="photo-indicator">
              {photos.length >= MIN_PHOTOS ? '✓' : photos.length} / {MIN_PHOTOS} mínimo
            </span>
          </div>
          
          <div className="photo-gallery">
            {photos.map((photo, index) => (
              <div key={index} className="photo-item">
                <img src={photo} alt={`Foto ${index + 1}`} />
                <button
                  onClick={() => deletePhoto(index)}
                  disabled={loading}
                  className="delete-photo-btn"
                  title="Eliminar foto"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
                <div className="photo-number">{index + 1}</div>
              </div>
            ))}
            {photos.length === 0 && (
              <div className="gallery-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
                <p>No hay fotos capturadas</p>
                <span>Captura al menos {MIN_PHOTOS} fotos para continuar</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instrucciones con diseño card */}
      <div className="instructions-card">
        <div className="instructions-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
        </div>
        <div className="instructions-content">
          <h3>Recomendaciones para mejores resultados</h3>
          <ul>
            <li>Capture entre {MIN_PHOTOS} y {MAX_PHOTOS} fotos desde diferentes ángulos</li>
            <li>Varíe ligeramente la posición de su rostro entre capturas</li>
            <li>Asegure buena iluminación frontal y mire directamente a la cámara</li>
            <li>Evite obstrucciones como lentes oscuros, gorros o mascarillas</li>
          </ul>
        </div>
      </div>

      {/* Botones de acción con diseño mejorado */}
      <div className="action-buttons">
        <button
          onClick={trainModel}
          disabled={!canTrain || loading}
          className="btn btn-train btn-success"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {loading ? 'Entrenando IA...' : 'Iniciar Entrenamiento'}
        </button>
        <button
          onClick={() => {
            stopCamera();
            if (onCancel) onCancel();
          }}
          disabled={loading}
          className="btn btn-cancel"
        >
          Cancelar
        </button>
      </div>

      <style jsx>{`
        .facial-training-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .facial-training-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .header-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          color: white;
          margin-bottom: 1rem;
          box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
        }

        .facial-training-header h2 {
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: 0.5rem;
        }

        .subtitle {
          font-size: 1.125rem;
          color: var(--gray-600);
          margin-bottom: 1rem;
        }

        .progress-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-secondary);
          padding: 0.5rem 1.5rem;
          border-radius: var(--radius-full);
          font-weight: 600;
          border: 2px solid var(--gray-200);
        }

        .photo-count {
          font-size: 1.5rem;
          color: var(--primary-color);
        }

        .separator {
          color: var(--gray-400);
        }

        .photo-max {
          color: var(--gray-600);
        }

        .label {
          font-size: 0.875rem;
          color: var(--gray-500);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .progress-banner {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 2rem;
          box-shadow: var(--shadow-lg);
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .training-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 968px) {
          .training-grid {
            grid-template-columns: 1fr;
          }
        }

        .camera-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .camera-preview {
          position: relative;
          background: var(--gray-900);
          border-radius: var(--radius-lg);
          overflow: hidden;
          aspect-ratio: 4/3;
          box-shadow: var(--shadow-xl);
        }

        .camera-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--gray-400);
        }

        .camera-placeholder svg {
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .camera-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .camera-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .face-guide {
          width: 60%;
          height: 80%;
          border: 3px solid rgba(102, 126, 234, 0.6);
          border-radius: 50%;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
        }

        .processing-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .camera-controls {
          display: flex;
          gap: 0.75rem;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: var(--transition-base);
          white-space: nowrap;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-capture {
          flex: 1;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
        }

        .btn-secondary {
          background: var(--gray-600);
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--gray-700);
        }

        .gallery-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .gallery-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .gallery-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        .photo-indicator {
          font-size: 0.875rem;
          color: var(--gray-600);
          background: var(--bg-secondary);
          padding: 0.375rem 0.875rem;
          border-radius: var(--radius-full);
          font-weight: 500;
        }

        .photo-gallery {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          max-height: 450px;
          overflow-y: auto;
          padding: 0.5rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
        }

        .photo-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: var(--gray-200);
          box-shadow: var(--shadow-sm);
          transition: var(--transition-base);
        }

        .photo-item:hover {
          transform: scale(1.05);
          box-shadow: var(--shadow-md);
        }

        .photo-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .delete-photo-btn {
          position: absolute;
          top: 0.375rem;
          right: 0.375rem;
          width: 28px;
          height: 28px;
          background: rgba(239, 68, 68, 0.95);
          border: none;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: var(--transition-fast);
        }

        .photo-item:hover .delete-photo-btn {
          opacity: 1;
        }

        .delete-photo-btn:hover {
          background: #dc2626;
          transform: scale(1.1);
        }

        .photo-number {
          position: absolute;
          bottom: 0.375rem;
          left: 0.375rem;
          background: rgba(0, 0, 0, 0.75);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .gallery-empty {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          color: var(--gray-400);
          text-align: center;
        }

        .gallery-empty svg {
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .gallery-empty span {
          font-size: 0.875rem;
          margin-top: 0.5rem;
        }

        .instructions-card {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border: 1px solid #fcd34d;
        }

        .instructions-icon {
          flex-shrink: 0;
          color: #d97706;
        }

        .instructions-content h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #92400e;
          margin-bottom: 0.75rem;
        }

        .instructions-content ul {
          list-style: none;
          padding: 0;
          margin: 0;
          color: #78350f;
        }

        .instructions-content li {
          padding-left: 1.5rem;
          position: relative;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .instructions-content li:before {
          content: "→";
          position: absolute;
          left: 0;
          color: #d97706;
          font-weight: bold;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
        }

        .btn-train {
          flex: 1;
        }

        .btn-success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        .btn-success:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.5);
        }

        .btn-cancel {
          background: white;
          color: var(--gray-700);
          border: 2px solid var(--gray-300);
        }

        .btn-cancel:hover:not(:disabled) {
          background: var(--gray-50);
          border-color: var(--gray-400);
        }
      `}</style>
    </div>
  );
}