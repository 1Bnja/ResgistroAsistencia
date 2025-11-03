import React, { useState, useRef, useEffect } from 'react';
import { FaCamera, FaCheckCircle, FaRedo, FaTrash } from 'react-icons/fa';
import Alert from './Alert';

const FacialTraining = ({ onComplete, onCancel, usuarioNombre }) => {
  const [capturing, setCapturing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const MIN_PHOTOS = 3;
  const MAX_PHOTOS = 10;

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCapturing(true);
        setError('');
      }
    } catch (err) {
      console.error('Error accediendo a la cámara:', err);
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCapturing(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (capturedPhotos.length >= MAX_PHOTOS) {
      setError(`Máximo ${MAX_PHOTOS} fotos permitidas`);
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photoDataURL = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhotos([...capturedPhotos, photoDataURL]);
    setError('');
  };

  const removePhoto = (index) => {
    setCapturedPhotos(capturedPhotos.filter((_, i) => i !== index));
  };

  const handleComplete = () => {
    if (capturedPhotos.length < MIN_PHOTOS) {
      setError(`Se requieren al menos ${MIN_PHOTOS} fotos diferentes del rostro`);
      return;
    }

    stopCamera();
    onComplete(capturedPhotos);
  };

  const handleCancel = () => {
    stopCamera();
    setCapturedPhotos([]);
    onCancel();
  };

  return (
    <div className="facial-training-container">
      <div className="training-header">
        <h3>Entrenamiento de Reconocimiento Facial</h3>
        <p>Usuario: <strong>{usuarioNombre}</strong></p>
        <p className="training-instructions">
          Captura entre {MIN_PHOTOS} y {MAX_PHOTOS} fotos del rostro desde diferentes ángulos
          para mejorar la precisión del reconocimiento.
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="training-content">
        <div className="camera-section">
          {!capturing ? (
            <div className="camera-placeholder">
              <FaCamera className="camera-icon-large" />
              <button className="btn btn-primary" onClick={startCamera}>
                <FaCamera /> Iniciar Cámara
              </button>
            </div>
          ) : (
            <div className="camera-active">
              <video ref={videoRef} autoPlay playsInline className="camera-preview" />
              <div className="camera-controls">
                <button 
                  className="btn btn-success" 
                  onClick={capturePhoto}
                  disabled={capturedPhotos.length >= MAX_PHOTOS}
                >
                  <FaCamera /> Capturar Foto ({capturedPhotos.length}/{MAX_PHOTOS})
                </button>
                <button className="btn btn-secondary" onClick={stopCamera}>
                  Pausar Cámara
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="photos-section">
          <h4>Fotos Capturadas ({capturedPhotos.length})</h4>
          {capturedPhotos.length === 0 ? (
            <p className="text-muted">No hay fotos capturadas aún</p>
          ) : (
            <div className="photos-grid">
              {capturedPhotos.map((photo, index) => (
                <div key={index} className="photo-item">
                  <img src={photo} alt={`Foto ${index + 1}`} />
                  <button 
                    className="btn-remove" 
                    onClick={() => removePhoto(index)}
                    title="Eliminar foto"
                  >
                    <FaTrash />
                  </button>
                  <span className="photo-number">#{index + 1}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="training-footer">
        <div className="status-info">
          {capturedPhotos.length < MIN_PHOTOS && (
            <span className="status-warning">
              ⚠️ Necesitas al menos {MIN_PHOTOS - capturedPhotos.length} foto(s) más
            </span>
          )}
          {capturedPhotos.length >= MIN_PHOTOS && (
            <span className="status-success">
              ✓ Listo para entrenar el modelo
            </span>
          )}
        </div>
        
        <div className="training-actions">
          <button className="btn btn-secondary" onClick={handleCancel}>
            Cancelar
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleComplete}
            disabled={capturedPhotos.length < MIN_PHOTOS}
          >
            <FaCheckCircle /> Entrenar Reconocimiento
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <style jsx>{`
        .facial-training-container {
          padding: 20px;
        }

        .training-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .training-header h3 {
          color: #333;
          margin-bottom: 10px;
        }

        .training-instructions {
          color: #666;
          font-size: 14px;
          margin-top: 10px;
        }

        .training-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        @media (max-width: 768px) {
          .training-content {
            grid-template-columns: 1fr;
          }
        }

        .camera-section {
          border: 2px dashed #ddd;
          border-radius: 8px;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }

        .camera-placeholder {
          text-align: center;
        }

        .camera-icon-large {
          font-size: 64px;
          color: #ccc;
          margin-bottom: 20px;
        }

        .camera-active {
          width: 100%;
        }

        .camera-preview {
          width: 100%;
          border-radius: 8px;
          margin-bottom: 10px;
        }

        .camera-controls {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .photos-section h4 {
          margin-bottom: 15px;
          color: #333;
        }

        .photos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 10px;
        }

        .photo-item {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #e0e0e0;
          aspect-ratio: 1;
        }

        .photo-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .btn-remove {
          position: absolute;
          top: 5px;
          right: 5px;
          background: rgba(220, 53, 69, 0.9);
          color: white;
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .photo-item:hover .btn-remove {
          opacity: 1;
        }

        .btn-remove:hover {
          background: rgba(200, 35, 51, 1);
        }

        .photo-number {
          position: absolute;
          bottom: 5px;
          left: 5px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .training-footer {
          border-top: 1px solid #e0e0e0;
          padding-top: 20px;
        }

        .status-info {
          text-align: center;
          margin-bottom: 15px;
          font-size: 14px;
        }

        .status-warning {
          color: #ff9800;
        }

        .status-success {
          color: #4caf50;
          font-weight: 600;
        }

        .training-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
        }
      `}</style>
    </div>
  );
};

export default FacialTraining;
