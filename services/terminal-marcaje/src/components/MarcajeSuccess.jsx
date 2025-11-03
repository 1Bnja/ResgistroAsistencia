import './MarcajeSuccess.css'

function MarcajeSuccess({ data, tipo }) {
  const { usuario, estado, minutosAtraso, marcaje } = data

  const getStatusColor = () => {
    switch (estado) {
      case 'puntual':
        return '#10b981'
      case 'anticipado':
        return '#3b82f6'
      case 'atraso':
        return '#f59e0b'
      default:
        return '#6c757d'
    }
  }

  const getStatusIcon = () => {
    switch (estado) {
      case 'puntual':
        return '✓'
      case 'anticipado':
        return '⏰'
      case 'atraso':
        return '⚠'
      default:
        return '•'
    }
  }

  const getStatusMessage = () => {
    switch (estado) {
      case 'puntual':
        return 'Llegada puntual'
      case 'anticipado':
        return 'Llegada anticipada'
      case 'atraso':
        return `Atraso de ${minutosAtraso} minutos`
      default:
        return 'Marcaje registrado'
    }
  }

  return (
    <div className="marcaje-success">
      <div className="success-icon" style={{ color: getStatusColor() }}>
        <div className="icon-circle">
          {getStatusIcon()}
        </div>
      </div>

      <h2>Marcaje de {tipo} registrado</h2>

      <div className="user-info">
        <div className="user-avatar">
          {usuario.nombre.charAt(0)}{usuario.apellido.charAt(0)}
        </div>
        <div className="user-details">
          <h3>{usuario.nombre} {usuario.apellido}</h3>
          <p>{usuario.cargo || 'Empleado'}</p>
        </div>
      </div>

      <div className="marcaje-details">
        <div className="detail-item">
          <span className="label">Hora:</span>
          <span className="value">{marcaje.hora}</span>
        </div>
        <div className="detail-item">
          <span className="label">Fecha:</span>
          <span className="value">
            {new Date(marcaje.fecha).toLocaleDateString('es-CL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
          </span>
        </div>
        <div className="detail-item">
          <span className="label">Estado:</span>
          <span className="value" style={{ color: getStatusColor(), fontWeight: 'bold' }}>
            {getStatusMessage()}
          </span>
        </div>
      </div>

      {estado === 'atraso' && (
        <div className="atraso-warning">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <p>Se ha enviado una notificación al administrador</p>
        </div>
      )}

      <div className="success-message">
        <p>¡Que tengas un excelente día!</p>
      </div>
    </div>
  )
}

export default MarcajeSuccess
