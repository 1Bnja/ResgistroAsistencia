import { useState, useEffect } from 'react'
import TerminalMarcaje from './components/TerminalMarcaje'
import websocketService from './services/websocket'
import './App.css'

function App() {
  const [wsConnected, setWsConnected] = useState(false)

  useEffect(() => {
    // Conectar WebSocket al montar
    websocketService.connect()

    const unsubscribe = websocketService.on('connect', () => {
      console.log('Terminal conectado a WebSocket')
      setWsConnected(true)
    })

    return () => {
      unsubscribe()
      websocketService.disconnect()
    }
  }, [])

  return (
    <div className="app-container">
      <div className="connection-status">
        <div className={`status-indicator ${wsConnected ? 'connected' : 'disconnected'}`}></div>
        <span>{wsConnected ? 'Conectado' : 'Desconectado'}</span>
      </div>

      <TerminalMarcaje />
    </div>
  )
}

export default App
