import React, { useState, useRef, useEffect } from 'react';
import { marcajesAPI, facialAPI } from '../services/api';
import Card from '../components/Card';
import Alert from '../components/Alert';
import { FaCamera, FaCheckCircle, FaTimesCircle, FaRedo } from 'react-icons/fa';

const TerminalMarcaje = () => {
  const [capturing, setCapturing] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

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

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photoDataURL = canvas.toDataURL('image/jpeg');
    setPhoto(photoDataURL);
    stopCamera();
  };

  const processMarcaje = async () => {
    if (!photo) return;

    try {
      setLoading(true);
      setError('');
      setResult(null);

      // Convertir data URL a blob
      const blob = await fetch(photo).then((r) => r.blob());
      const formData = new FormData();
      formData.append('image', blob, 'photo.jpg');

      // Reconocimiento facial
      const recognitionRes = await facialAPI.recognize(formData);
      const { usuarioId, confianza } = recognitionRes.data;

      if (!usuarioId) {
        setError('No se pudo reconocer el rostro. Intenta nuevamente.');
        return;
      }

      // Registrar marcaje
      const marcajeRes = await marcajesAPI.registrar({
        usuarioId,
        confianza,
      });

      setResult({
        success: true,
        marcaje: marcajeRes.data.marcaje,
        usuario: marcajeRes.data.usuario,
      });
    } catch (err) {
      console.error('Error procesando marcaje:', err);
      setError(err.response?.data?.mensaje || 'Error al procesar el marcaje');
      setResult({ success: false });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPhoto(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="terminal-container">
      <Card title="Terminal de Marcaje - Reconocimiento Facial">
        <div className="terminal-content">
          {!capturing && !photo && !result && (
            <div className="terminal-start">
              <FaCamera className="terminal-icon" />
              <h2>Marca tu asistencia</h2>
              <p>Presiona el botón para iniciar el reconocimiento facial</p>
              <button className="btn btn-primary btn-lg" onClick={startCamera}>
                <FaCamera /> Iniciar Cámara
              </button>
            </div>
          )}

          {capturing && (
            <div className="terminal-camera">
              <video ref={videoRef} autoPlay playsInline className="camera-preview" />
              <div className="camera-controls">
                <button className="btn btn-success btn-lg" onClick={capturePhoto}>
                  <FaCamera /> Capturar Foto
                </button>
                <button className="btn btn-secondary" onClick={stopCamera}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {photo && !result && (
            <div className="terminal-preview">
              <img src={photo} alt="Foto capturada" className="photo-preview" />
              <div className="preview-controls">
                {loading ? (
                  <div className="loading-overlay">
                    <div className="loader"></div>
                    <p>Procesando reconocimiento facial...</p>
                  </div>
                ) : (
                  <>
                    <button className="btn btn-primary btn-lg" onClick={processMarcaje}>
                      <FaCheckCircle /> Confirmar y Marcar
                    </button>
                    <button className="btn btn-secondary" onClick={reset}>
                      <FaRedo /> Tomar Otra Foto
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="terminal-result">
              {result.success ? (
                <div className="result-success">
                  <FaCheckCircle className="result-icon success" />
                  <h2>Marcaje Exitoso</h2>
                  <div className="result-details">
                    <p>
                      <strong>Usuario:</strong> {result.usuario?.nombre}{' '}
                      {result.usuario?.apellido}
                    </p>
                    <p>
                      <strong>RUT:</strong> {result.usuario?.rut}
                    </p>
                    <p>
                      <strong>Hora:</strong>{' '}
                      {new Date(result.marcaje?.fecha).toLocaleTimeString('es-CL')}
                    </p>
                    <p>
                      <strong>Estado:</strong>{' '}
                      <span
                        className={`badge ${
                          result.marcaje?.estado === 'puntual'
                            ? 'badge-success'
                            : 'badge-warning'
                        }`}
                      >
                        {result.marcaje?.estado}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="result-error">
                  <FaTimesCircle className="result-icon error" />
                  <h2>Marcaje Fallido</h2>
                  <p>No se pudo reconocer el rostro o registrar la asistencia.</p>
                </div>
              )}
              <button className="btn btn-primary btn-lg" onClick={reset}>
                <FaRedo /> Realizar Otro Marcaje
              </button>
            </div>
          )}

          {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        </div>
      </Card>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default TerminalMarcaje;
