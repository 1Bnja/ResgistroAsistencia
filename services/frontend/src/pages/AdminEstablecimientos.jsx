import React, { useState, useEffect } from 'react';
import { establecimientosAPI } from '../services/api';
import Card from '../components/Card';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import Alert from '../components/Alert';
import { FaPlus, FaEdit, FaTrash, FaSchool, FaUsers, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const AdminEstablecimientos = () => {
  const [establecimientos, setEstablecimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEstablecimiento, setEditingEstablecimiento] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    direccion: '',
    comuna: '',
    region: '',
    telefono: '',
    email: '',
    director: '',
    tipo: 'basica',
  });

  useEffect(() => {
    loadEstablecimientos();
  }, []);

  const loadEstablecimientos = async () => {
    try {
      setLoading(true);
      const response = await establecimientosAPI.getAll();
      console.log('Establecimientos recibidos:', response.data.data);
      setEstablecimientos(response.data.data || []);
    } catch (err) {
      console.error('Error cargando establecimientos:', err);
      setError('Error al cargar los establecimientos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (establecimiento = null) => {
    if (establecimiento) {
      setEditingEstablecimiento(establecimiento);
      setFormData({
        nombre: establecimiento.nombre,
        codigo: establecimiento.codigo,
        direccion: establecimiento.direccion || '',
        comuna: establecimiento.comuna || '',
        region: establecimiento.region || '',
        telefono: establecimiento.telefono || '',
        email: establecimiento.email || '',
        director: establecimiento.director || '',
        tipo: establecimiento.tipo || 'basica',
      });
    } else {
      setEditingEstablecimiento(null);
      setFormData({
        nombre: '',
        codigo: '',
        direccion: '',
        comuna: '',
        region: '',
        telefono: '',
        email: '',
        director: '',
        tipo: 'basica',
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingEstablecimiento(null);
    setError('');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingEstablecimiento) {
        await establecimientosAPI.update(editingEstablecimiento._id, formData);
        setSuccess('Establecimiento actualizado correctamente');
      } else {
        await establecimientosAPI.create(formData);
        setSuccess('Establecimiento creado correctamente');
      }

      await loadEstablecimientos();
      handleCloseModal();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error guardando establecimiento:', err);
      setError(err.response?.data?.message || 'Error al guardar el establecimiento');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este establecimiento?')) {
      return;
    }

    try {
      await establecimientosAPI.delete(id);
      setSuccess('Establecimiento eliminado correctamente');
      loadEstablecimientos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error eliminando establecimiento:', err);
      const errorMsg = err.response?.data?.message || 'Error al eliminar el establecimiento';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    }
  };

  const getTipoLabel = (tipo) => {
    const tipos = {
      basica: 'Básica',
      media: 'Media',
      tecnico: 'Técnico',
      universitario: 'Universitario',
      instituto: 'Instituto',
      otro: 'Otro'
    };
    return tipos[tipo] || tipo;
  };

  if (loading) {
    return <Loader message="Cargando establecimientos..." />;
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Gestión de Establecimientos</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <FaPlus /> Nuevo Establecimiento
        </button>
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <Card>
        {establecimientos.length === 0 ? (
          <p className="text-center text-muted">No hay establecimientos registrados</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Comuna/Región</th>
                  <th>Director</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {establecimientos.map((establecimiento) => (
                  <tr key={establecimiento._id}>
                    <td>
                      <div className="user-info">
                        <FaSchool className="user-icon" />
                        <strong>{establecimiento.codigo}</strong>
                      </div>
                    </td>
                    <td>{establecimiento.nombre}</td>
                    <td>
                      <span className="badge badge-info">
                        {getTipoLabel(establecimiento.tipo)}
                      </span>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500 }}>{establecimiento.comuna}</div>
                        <small style={{ color: '#64748b' }}>{establecimiento.region}</small>
                      </div>
                    </td>
                    <td>{establecimiento.director || 'N/A'}</td>
                    <td>
                      {establecimiento.activo ? (
                        <span className="facial-status active">
                          <FaCheckCircle /> Activo
                        </span>
                      ) : (
                        <span className="facial-status inactive">
                          <FaTimesCircle /> Inactivo
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => handleOpenModal(establecimiento)}
                          title="Editar establecimiento"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(establecimiento._id)}
                          title="Eliminar establecimiento"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingEstablecimiento ? 'Editar Establecimiento' : 'Nuevo Establecimiento'}
      >
        <form onSubmit={handleSubmit} className="form">
          <div className="form-row">
            <div className="form-group">
              <label>Nombre *</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej: Liceo Manuel de Salas"
                required
              />
            </div>
            <div className="form-group">
              <label>Código *</label>
              <input
                type="text"
                name="codigo"
                value={formData.codigo}
                onChange={handleChange}
                placeholder="Ej: LMS001"
                required
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Dirección *</label>
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Ej: Av. Principal 123"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Comuna *</label>
              <input
                type="text"
                name="comuna"
                value={formData.comuna}
                onChange={handleChange}
                placeholder="Ej: Santiago"
                required
              />
            </div>
            <div className="form-group">
              <label>Región *</label>
              <input
                type="text"
                name="region"
                value={formData.region}
                onChange={handleChange}
                placeholder="Ej: Metropolitana"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="Ej: +56 2 2345 6789"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Ej: contacto@liceo.cl"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Director</label>
              <input
                type="text"
                name="director"
                value={formData.director}
                onChange={handleChange}
                placeholder="Ej: Juan Pérez González"
              />
            </div>
            <div className="form-group">
              <label>Tipo *</label>
              <select name="tipo" value={formData.tipo} onChange={handleChange} required>
                <option value="basica">Básica</option>
                <option value="media">Media</option>
                <option value="tecnico">Técnico</option>
                <option value="universitario">Universitario</option>
                <option value="instituto">Instituto</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editingEstablecimiento ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminEstablecimientos;
