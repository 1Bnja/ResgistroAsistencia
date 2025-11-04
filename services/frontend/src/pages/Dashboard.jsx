import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import websocketService from '../services/websocket';
import { marcajesAPI } from '../services/api';
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
} from 'react-icons/fa';

const Dashboard = () => {
  const { user } = useAuth();
  const [marcajes, setMarcajes] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadData();

    // Conectar WebSocket
    websocketService.connect();

    // Escuchar nuevos marcajes en tiempo real
    const unsubscribeNuevoMarcaje = websocketService.on('nuevo-marcaje', (data) => {
      console.log('Nuevo marcaje recibido:', data);
      setMarcajes((prev) => [data, ...prev]);
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
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [marcajesRes, estadisticasRes] = await Promise.all([
        marcajesAPI.getHoy(),
        marcajesAPI.getEstadisticas({ periodo: 'hoy' }),
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
        <h1>Dashboard de Asistencia</h1>
        <p className="text-muted">
          Bienvenido, {user?.nombre} {user?.apellido}
        </p>
        <div className="websocket-status">
          <FaCircle className={websocketService.isConnected() ? 'text-success' : 'text-danger'} />
          <span>{websocketService.isConnected() ? 'Conectado' : 'Desconectado'}</span>
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
      <Card title="Marcajes de Hoy (Tiempo Real)">
        {marcajes.length === 0 ? (
          <p className="text-center text-muted">No hay marcajes registrados hoy</p>
        ) : (
          <div className="marcajes-list">
            <table className="table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Usuario</th>
                  <th>RUT</th>
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
