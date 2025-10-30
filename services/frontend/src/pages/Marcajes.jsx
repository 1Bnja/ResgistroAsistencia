import React, { useState, useEffect } from 'react';
import { marcajesAPI } from '../services/api';
import Card from '../components/Card';
import Loader from '../components/Loader';
import Alert from '../components/Alert';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FaFilter,
  FaDownload,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSearch,
} from 'react-icons/fa';

const Marcajes = () => {
  const [marcajes, setMarcajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    fechaInicio: '',
    fechaFin: '',
    estado: '',
    search: '',
  });

  useEffect(() => {
    loadMarcajes();
  }, []);

  const loadMarcajes = async (customFilters = {}) => {
    try {
      setLoading(true);
      const params = { ...filters, ...customFilters };

      // Limpiar parámetros vacíos
      Object.keys(params).forEach((key) => {
        if (!params[key]) delete params[key];
      });

      const response = await marcajesAPI.getAll(params);
      setMarcajes(response.data.marcajes || []);
    } catch (err) {
      console.error('Error cargando marcajes:', err);
      setError('Error al cargar los marcajes');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  const handleApplyFilters = () => {
    loadMarcajes();
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      fechaInicio: '',
      fechaFin: '',
      estado: '',
      search: '',
    };
    setFilters(clearedFilters);
    loadMarcajes(clearedFilters);
  };

  const handleExport = () => {
    // Implementar exportación a CSV o Excel
    alert('Función de exportación en desarrollo');
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
        return <FaCheckCircle />;
      case 'atraso':
        return <FaExclamationTriangle />;
      default:
        return null;
    }
  };

  const filteredMarcajes = marcajes.filter((marcaje) => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      marcaje.usuario?.nombre?.toLowerCase().includes(searchLower) ||
      marcaje.usuario?.apellido?.toLowerCase().includes(searchLower) ||
      marcaje.usuario?.rut?.toLowerCase().includes(searchLower)
    );
  });

  if (loading && marcajes.length === 0) {
    return <Loader message="Cargando marcajes..." />;
  }

  return (
    <div className="marcajes-container">
      <div className="marcajes-header">
        <h1>Registro de Marcajes</h1>
        <button className="btn btn-success" onClick={handleExport}>
          <FaDownload /> Exportar
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <Card>
        <div className="filters-section">
          <h3>
            <FaFilter /> Filtros
          </h3>
          <div className="filters-grid">
            <div className="form-group">
              <label>Buscar</label>
              <div className="search-input">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Nombre, apellido o RUT"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Fecha Inicio</label>
              <input
                type="date"
                name="fechaInicio"
                value={filters.fechaInicio}
                onChange={handleFilterChange}
              />
            </div>

            <div className="form-group">
              <label>Fecha Fin</label>
              <input
                type="date"
                name="fechaFin"
                value={filters.fechaFin}
                onChange={handleFilterChange}
              />
            </div>

            <div className="form-group">
              <label>Estado</label>
              <select name="estado" value={filters.estado} onChange={handleFilterChange}>
                <option value="">Todos</option>
                <option value="puntual">Puntual</option>
                <option value="atraso">Atraso</option>
                <option value="ausente">Ausente</option>
              </select>
            </div>
          </div>

          <div className="filter-actions">
            <button className="btn btn-primary" onClick={handleApplyFilters}>
              Aplicar Filtros
            </button>
            <button className="btn btn-secondary" onClick={handleClearFilters}>
              Limpiar
            </button>
          </div>
        </div>
      </Card>

      <Card title={`Marcajes Encontrados (${filteredMarcajes.length})`}>
        {filteredMarcajes.length === 0 ? (
          <p className="text-center text-muted">No se encontraron marcajes</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Usuario</th>
                  <th>RUT</th>
                  <th>Horario Asignado</th>
                  <th>Estado</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMarcajes.map((marcaje) => (
                  <tr key={marcaje._id}>
                    <td className="font-bold">
                      {format(new Date(marcaje.fecha), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                    </td>
                    <td>
                      {marcaje.usuario?.nombre} {marcaje.usuario?.apellido}
                    </td>
                    <td>{marcaje.usuario?.rut}</td>
                    <td>
                      {marcaje.horario?.nombre} (
                      {marcaje.horario?.horaEntrada
                        ? format(
                            new Date(`2000-01-01T${marcaje.horario.horaEntrada}`),
                            'HH:mm'
                          )
                        : 'N/A'}
                      )
                    </td>
                    <td>
                      <span className={`badge ${getStatusColor(marcaje.estado)}`}>
                        {getStatusIcon(marcaje.estado)}
                        {marcaje.estado}
                      </span>
                    </td>
                    <td className="text-muted">
                      {marcaje.observaciones || '-'}
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

export default Marcajes;
