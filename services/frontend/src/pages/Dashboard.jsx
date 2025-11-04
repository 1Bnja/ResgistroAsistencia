import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import websocketService from '../services/websocket';
import { marcajesAPI, establecimientosAPI } from '../services/api';
import Card from '../components/Card';
import Loader from '../components/Loader';
import Alert from '../components/Alert';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FaClock,
  FaUsers,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCircle,
  FaFilter,
} from 'react-icons/fa';

const Dashboard = () => {
  const { user } = useAuth();
  const [marcajes, setMarcajes] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);
  const [establecimientos, setEstablecimientos] = useState([]);
  const [establecimientoSeleccionado, setEstablecimientoSeleccionado] = useState('');

  useEffect(() => {
    loadData();
    
    // Cargar establecimientos si es superadmin
    if (user?.rol === 'superadmin') {
      loadEstablecimientos();
    }

    // Conectar WebSocket
    websocketService.connect();

    // Escuchar nuevos marcajes en tiempo real
    const unsubscribeNuevoMarcaje = websocketService.on('nuevo-marcaje', (data) => {
      console.log('Nuevo marcaje recibido:', data);
      
      // Si hay filtro de establecimiento, solo agregar si coincide
      if (establecimientoSeleccionado) {
        if (data.usuario?.establecimientoId === establecimientoSeleccionado) {
          setMarcajes((prev) => [data, ...prev]);
        }
      } else {
        setMarcajes((prev) => [data, ...prev]);
      }
      
      setNotification({
        type: 'success',
        message: `Nuevo marcaje: ${data.usuario?.nombre} ${data.usuario?.apellido}`,
      });
      setTimeout(() => setNotification(null), 5000);
    });

    // Escuchar atrasos
    const unsubscribeAtraso = websocketService.on('atraso-detectado', (data) => {
      console.log('Atraso detectado:', data);
      setNotification({
        type: 'warning',
        message: `Atraso detectado: ${data.usuario?.nombre} ${data.usuario?.apellido}`,
      });
      setTimeout(() => setNotification(null), 5000);
    });

    return () => {
      unsubscribeNuevoMarcaje();
      unsubscribeAtraso();
    };
  }, [establecimientoSeleccionado]);

  useEffect(() => {
    loadData();
  }, [establecimientoSeleccionado]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const params = {};
      if (establecimientoSeleccionado) {
        params.establecimientoId = establecimientoSeleccionado;
      }
      
      const [marcajesRes, estadisticasRes] = await Promise.all([
        marcajesAPI.getHoy(params),
        marcajesAPI.getEstadisticas({ periodo: 'hoy', ...params }),
      ]);

      console.log('Marcajes recibidos:', marcajesRes.data);
      console.log('Estadísticas recibidas:', estadisticasRes.data);

      setMarcajes(marcajesRes.data.marcajes || []);
      setEstadisticas(estadisticasRes.data);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadEstablecimientos = async () => {
    try {
      const response = await establecimientosAPI.getAll({ activo: true });
      setEstablecimientos(response.data.data || []);
    } catch (err) {
      console.error('Error cargando establecimientos:', err);
    }
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'puntual':
        return 'status-success';
      case 'atraso':
        return 'status-warning';
      case 'ausente':
        return 'status-danger';
      default:
        return 'status-info';
    }
  };

  const getStatusIcon = (estado) => {
    switch (estado) {
      case 'puntual':
        return <FaCheckCircle className="text-success" />;
      case 'atraso':
        return <FaExclamationTriangle className="text-warning" />;
      default:
        return <FaClock className="text-info" />;
    }
  };

  if (loading) {
    return <Loader message="Cargando dashboard..." />;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard de Asistencia</h1>
          <p className="text-muted">
            Bienvenido, {user?.nombre} {user?.apellido}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {user?.rol === 'superadmin' && establecimientos.length > 0 && (
            <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaFilter />
              <select
                value={establecimientoSeleccionado}
                onChange={(e) => setEstablecimientoSeleccionado(e.target.value)}
                className="form-select"
                style={{ minWidth: '250px' }}
              >
                <option value="">Todos los establecimientos</option>
                {establecimientos.map((est) => (
                  <option key={est._id} value={est._id}>
                    {est.nombre} ({est.codigo})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="websocket-status">
            <FaCircle className={websocketService.isConnected() ? 'text-success' : 'text-danger'} />
            <span>{websocketService.isConnected() ? 'Conectado' : 'Desconectado'}</span>
          </div>
        </div>
      </div>

      {notification && (
        <Alert
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Estadísticas */}
      <div className="stats-grid">
        <Card className="stat-card">
          <div className="stat-content">
            <FaUsers className="stat-icon text-primary" />
            <div className="stat-info">
              <h3>{estadisticas?.totalHoy || 0}</h3>
              <p>Marcajes Hoy</p>
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-content">
            <FaCheckCircle className="stat-icon text-success" />
            <div className="stat-info">
              <h3>{estadisticas?.puntuales || 0}</h3>
              <p>Puntuales</p>
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-content">
            <FaExclamationTriangle className="stat-icon text-warning" />
            <div className="stat-info">
              <h3>{estadisticas?.atrasos || 0}</h3>
              <p>Atrasos</p>
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-content">
            <FaClock className="stat-icon text-info" />
            <div className="stat-info">
              <h3>{estadisticas?.horaPromedio || '--:--'}</h3>
              <p>Hora Promedio</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista de Marcajes en Tiempo Real */}
      <Card title={`Marcajes de Hoy (Tiempo Real)${establecimientoSeleccionado && establecimientos.length > 0 ? ` - ${establecimientos.find(e => e._id === establecimientoSeleccionado)?.nombre || ''}` : ''}`}>
        {marcajes.length === 0 ? (
          <div className="text-center text-muted" style={{ padding: '2rem' }}>
            <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              {establecimientoSeleccionado ? 
                '📊 No hay marcajes registrados para este establecimiento hoy' : 
                '📊 No hay marcajes registrados hoy'}
            </p>
            <small style={{ color: '#64748b' }}>
              Los marcajes aparecerán aquí en tiempo real cuando los usuarios registren su asistencia
            </small>
          </div>
        ) : (
          <div className="marcajes-list">
            <table className="table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Usuario</th>
                  <th>RUT</th>
                  {user?.rol === 'superadmin' && <th>Establecimiento</th>}
                  <th>Horario</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {marcajes.map((marcaje) => (
                  <tr key={marcaje._id}>
                    <td className="font-bold">
                      {marcaje.hora || format(new Date(marcaje.fecha), 'HH:mm:ss', { locale: es })}
                    </td>
                    <td>
                      {marcaje.usuarioId?.nombre || marcaje.usuario?.nombre} {marcaje.usuarioId?.apellido || marcaje.usuario?.apellido}
                    </td>
                    <td>{marcaje.usuarioId?.rut || marcaje.usuario?.rut || 'N/A'}</td>
                    {user?.rol === 'superadmin' && (
                      <td>
                        {marcaje.usuarioId?.establecimientoId?.nombre ? (
                          <span 
                            className="badge badge-info" 
                            title={`Código: ${marcaje.usuarioId.establecimientoId.codigo || 'N/A'}`}
                            style={{ cursor: 'help' }}
                          >
                            {marcaje.usuarioId.establecimientoId.nombre}
                          </span>
                        ) : (
                          <span className="badge badge-secondary">N/A</span>
                        )}
                      </td>
                    )}
                    <td>
                      {marcaje.usuarioId?.horarioId?.horaEntrada || marcaje.horario?.horaEntrada || 'N/A'}
                    </td>
                    <td>
                      <span className={`badge ${getStatusColor(marcaje.estado)}`}>
                        {getStatusIcon(marcaje.estado)}
                        {marcaje.estado}
                        {marcaje.minutosAtraso > 0 && ` (${marcaje.minutosAtraso} min)`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
