import { useState, useRef, useEffect } from 'react'
import { marcajeService } from '../services/api'
import websocketService from '../services/websocket'
import CameraCapture from './CameraCapture'
import MarcajeSuccess from './MarcajeSuccess'
import './TerminalMarcaje.css'

function TerminalMarcaje() {
  const [step, setStep] = useState('welcome') // welcome, capture, processing, success, error
  const [tipoMarcaje, setTipoMarcaje] = useState(null) // entrada | salida
  const [capturedImage, setCapturedImage] = useState(null)
  const [marcajeResult, setMarcajeResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

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
      // Aquí llamarás al servicio de IA para reconocimiento facial
      // Por ahora simulamos con un usuarioId de prueba
      const usuarioId = '674717ed870a50f4f5e3dfb9' // Reemplazar con el ID del usuario reconocido

      // Registrar marcaje
      const response = await marcajeService.registrarMarcaje({
        usuarioId,
        tipo: tipoMarcaje,
        imagenFacial: imageData,
        ubicacion: 'Terminal de Entrada Principal'
      })

      if (response.success) {
        setMarcajeResult(response.data)

        // Enviar notificación por WebSocket
        websocketService.send('nuevo-marcaje', {
          marcaje: response.data.marcaje,
          usuario: response.data.usuario,
          tipo: tipoMarcaje,
          estado: response.data.estado
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
      console.error('Error al procesar marcaje:', err)
      setError(err.response?.data?.message || err.message || 'Error al procesar el marcaje')
      setStep('error')

      setTimeout(() => {
        resetTerminal()
      }, 4000)
    } finally {
      setLoading(false)
    }
  }

  const handleRetake = () => {
    setStep('capture')
    setCapturedImage(null)
    setError(null)
  }

  const resetTerminal = () => {
    setStep('welcome')
    setTipoMarcaje(null)
    setCapturedImage(null)
    setMarcajeResult(null)
    setError(null)
    setLoading(false)
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
