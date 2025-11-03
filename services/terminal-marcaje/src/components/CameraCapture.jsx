import { useState, useRef, useEffect } from 'react'
import './CameraCapture.css'

function CameraCapture({ onCapture, onCancel, tipo }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [countdown, setCountdown] = useState(null)
  const [cameraError, setCameraError] = useState(null)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
      }
    } catch (error) {
      console.error('Error al acceder a la cámara:', error)
      setCameraError('No se pudo acceder a la cámara. Verifica los permisos.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const handleCapture = () => {
    // Iniciar cuenta regresiva
    setCountdown(3)
    const countInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(countInterval)
          captureImage()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const captureImage = () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (video && canvas) {
      const context = canvas.getContext('2d')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Dibujar el frame del video en el canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convertir a base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8)

      stopCamera()
      onCapture(imageData)
    }
  }

  const handleCancelClick = () => {
    stopCamera()
    onCancel()
  }

  if (cameraError) {
    return (
      <div className="camera-error">
        <div className="error-icon">⚠️</div>
        <h3>Error de cámara</h3>
        <p>{cameraError}</p>
        <button className="btn-cancel" onClick={handleCancelClick}>
          Volver
        </button>
      </div>
    )
  }

  return (
    <div className="camera-capture">
      <div className="camera-header">
        <h3>Marcaje de {tipo}</h3>
        <p>Posiciona tu rostro en el centro de la cámara</p>
      </div>

      <div className="camera-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-video"
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Overlay del rostro */}
        <div className="face-overlay">
          <div className="face-guide"></div>
        </div>

        {/* Cuenta regresiva */}
        {countdown && (
          <div className="countdown-overlay">
            <div className="countdown-number">{countdown}</div>
          </div>
        )}
      </div>

      <div className="camera-controls">
        <button
          className="btn-cancel"
          onClick={handleCancelClick}
          disabled={countdown !== null}
        >
          Cancelar
        </button>
        <button
          className="btn-capture"
          onClick={handleCapture}
          disabled={countdown !== null}
        >
          {countdown ? 'Capturando...' : 'Capturar'}
        </button>
      </div>
    </div>
  )
}

export default CameraCapture
