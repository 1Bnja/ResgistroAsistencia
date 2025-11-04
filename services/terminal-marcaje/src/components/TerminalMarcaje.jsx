import { useState, useRef, useEffect } from 'react'
import { marcajeService, faceRecognitionService } from '../services/api'
import websocketService from '../services/websocket'
import CameraCapture from './CameraCapture'
import MarcajeSuccess from './MarcajeSuccess'
import ManualLogin from './ManualLogin'
import './TerminalMarcaje.css'

function TerminalMarcaje() {
  const [step, setStep] = useState('welcome') // welcome, capture, processing, success, error, manual-login
  const [tipoMarcaje, setTipoMarcaje] = useState(null) // entrada | salida
  const [capturedImage, setCapturedImage] = useState(null)
  const [marcajeResult, setMarcajeResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fallbackReason, setFallbackReason] = useState(null) // Razón para mostrar login manual
  const [reconocimientoFallidoInfo, setReconocimientoFallidoInfo] = useState(null)

  const handleSelectTipo = (tipo) => {
    setTipoMarcaje(tipo)
    setStep('capture')
    setError(null)
  }

  const handleImageCaptured = async (imageData) => {
    setCapturedImage(imageData)
    setStep('processing')
    setLoading(true)
    setError(null)

    try {
      // Intentar reconocimiento facial con IA
      const response = await faceRecognitionService.recognizeAndMark(
        imageData,
        tipoMarcaje,
        'Terminal de Entrada Principal'
      )

      // Si el reconocimiento fue exitoso
      if (response.success) {
        setMarcajeResult(response.data)

        // Enviar notificación por WebSocket
        websocketService.send('nuevo-marcaje', {
          marcaje: response.data.marcaje,
          usuario: response.data.usuario,
          tipo: tipoMarcaje,
          estado: response.data.estado,
          metodoMarcaje: 'automatico',
          confianza: response.confianza
        })

        setStep('success')

        // Auto-reset después de 5 segundos
        setTimeout(() => {
          resetTerminal()
        }, 5000)
      } else {
        // Si falla el reconocimiento, verificar si requiere fallback manual
        if (response.fallbackRequired || response.statusCode === 503 || response.statusCode === 404 || response.statusCode === 400) {
          // Mostrar formulario de login manual
          setFallbackReason(response.error || 'No se pudo reconocer el rostro')
          setReconocimientoFallidoInfo({
            mensaje: response.error,
            confianza: response.confianza,
            codigoEstado: response.statusCode
          })
          setStep('manual-login')
        } else {
          throw new Error(response.error || 'Error al registrar marcaje')
        }
      }
    } catch (err) {
      console.error('Error al procesar marcaje:', err)

      // Si es un error de red o del servidor, ofrecer login manual
      if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK' || !navigator.onLine) {
        setFallbackReason('Servicio de reconocimiento facial no disponible')
        setStep('manual-login')
      } else {
        setError(err.response?.data?.message || err.message || 'Error al procesar el marcaje')
        setStep('error')

        setTimeout(() => {
          resetTerminal()
        }, 4000)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRetake = () => {
    setStep('capture')
    setCapturedImage(null)
    setError(null)
  }

  const handleManualLogin = async (email, password) => {
    setLoading(true)
    setError(null)

    try {
      // Registrar marcaje con credenciales
      const response = await marcajeService.registrarMarcajeConCredenciales({
        email,
        password,
        tipo: tipoMarcaje,
        ubicacion: 'Terminal de Entrada Principal - Login Manual',
        imagenFacial: capturedImage
      })

      if (response.success) {
        setMarcajeResult(response.data)

        // Enviar notificación por WebSocket
        websocketService.send('nuevo-marcaje', {
          marcaje: response.data.marcaje,
          usuario: response.data.usuario,
          tipo: tipoMarcaje,
          estado: response.data.estado,
          metodoMarcaje: 'manual'
        })

        setStep('success')

        // Auto-reset después de 5 segundos
        setTimeout(() => {
          resetTerminal()
        }, 5000)
      } else {
        throw new Error(response.message || 'Error al registrar marcaje')
      }
    } catch (err) {
      console.error('Error en login manual:', err)
      throw err // Dejar que el componente ManualLogin maneje el error
    } finally {
      setLoading(false)
    }
  }

  const handleCancelManualLogin = () => {
    setStep('capture')
    setFallbackReason(null)
    setReconocimientoFallidoInfo(null)
  }

  const resetTerminal = () => {
    setStep('welcome')
    setTipoMarcaje(null)
    setCapturedImage(null)
    setMarcajeResult(null)
    setError(null)
    setLoading(false)
    setFallbackReason(null)
    setReconocimientoFallidoInfo(null)
  }

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const [currentTime, setCurrentTime] = useState(getCurrentTime())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="terminal-container">
      <div className="terminal-card">
        {/* Header */}
        <div className="terminal-header">
          <h1>Control de Asistencia</h1>
          <div className="date-time">
            <div className="time">{currentTime}</div>
            <div className="date">{getCurrentDate()}</div>
          </div>
        </div>

        {/* Content */}
        <div className="terminal-content">
          {step === 'welcome' && (
            <div className="welcome-screen">
              <div className="welcome-icon">
                <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <h2>Bienvenido</h2>
              <p>Selecciona el tipo de marcaje</p>

              <div className="marcaje-buttons">
                <button
                  className="btn-marcaje btn-entrada"
                  onClick={() => handleSelectTipo('entrada')}
                >
                  <span className="btn-icon">→</span>
                  <span>Entrada</span>
                </button>
                <button
                  className="btn-marcaje btn-salida"
                  onClick={() => handleSelectTipo('salida')}
                >
                  <span className="btn-icon">←</span>
                  <span>Salida</span>
                </button>
              </div>
            </div>
          )}

          {step === 'capture' && (
            <CameraCapture
              onCapture={handleImageCaptured}
              onCancel={resetTerminal}
              tipo={tipoMarcaje}
            />
          )}

          {step === 'processing' && (
            <div className="processing-screen">
              <div className="spinner-large"></div>
              <h2>Procesando marcaje...</h2>
              <p>Por favor espera un momento</p>
            </div>
          )}

          {step === 'success' && marcajeResult && (
            <MarcajeSuccess
              data={marcajeResult}
              tipo={tipoMarcaje}
            />
          )}

          {step === 'manual-login' && (
            <ManualLogin
              tipo={tipoMarcaje}
              fallbackReason={fallbackReason}
              onLogin={handleManualLogin}
              onCancel={handleCancelManualLogin}
              loading={loading}
            />
          )}

          {step === 'error' && (
            <div className="error-screen">
              <div className="error-icon">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </div>
              <h2>Error al procesar marcaje</h2>
              <p>{error}</p>
              <button className="btn-retry" onClick={resetTerminal}>
                Intentar nuevamente
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="terminal-footer">
          <p>Sistema de Control de Asistencia v1.0</p>
        </div>
      </div>
    </div>
  )
}

export default TerminalMarcaje
