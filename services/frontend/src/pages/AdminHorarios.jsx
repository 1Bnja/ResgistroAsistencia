import React, { useState, useEffect } from 'react';
import { horariosAPI } from '../services/api';
import Card from '../components/Card';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import Alert from '../components/Alert';
import { FaPlus, FaEdit, FaTrash, FaClock } from 'react-icons/fa';

const AdminHorarios = () => {
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHorario, setEditingHorario] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    horaEntrada: '',
    horaSalida: '',
    toleranciaMinutos: 15,
    diasSemana: [1, 2, 3, 4, 5],
  });

  useEffect(() => {
    loadHorarios();
  }, []);

  const loadHorarios = async () => {
    try {
      setLoading(true);
      const response = await horariosAPI.getAll();
      setHorarios(response.data.horarios || []);
    } catch (err) {
      console.error('Error cargando horarios:', err);
      setError('Error al cargar los horarios');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (horario = null) => {
    if (horario) {
      setEditingHorario(horario);
      setFormData({
        nombre: horario.nombre,
        horaEntrada: horario.horaEntrada,
        horaSalida: horario.horaSalida,
        toleranciaMinutos: horario.toleranciaMinutos,
        diasSemana: horario.diasSemana || [1, 2, 3, 4, 5],
      });
    } else {
      setEditingHorario(null);
      setFormData({
        nombre: '',
        horaEntrada: '',
        horaSalida: '',
        toleranciaMinutos: 15,
        diasSemana: [1, 2, 3, 4, 5],
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingHorario(null);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'toleranciaMinutos' ? parseInt(value) : value,
    });
  };

  const handleDiasChange = (dia) => {
    const newDias = formData.diasSemana.includes(dia)
      ? formData.diasSemana.filter((d) => d !== dia)
      : [...formData.diasSemana, dia].sort();

    setFormData({
      ...formData,
      diasSemana: newDias,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingHorario) {
        await horariosAPI.update(editingHorario._id, formData);
        setSuccess('Horario actualizado correctamente');
      } else {
        await horariosAPI.create(formData);
        setSuccess('Horario creado correctamente');
      }

      handleCloseModal();
      loadHorarios();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error guardando horario:', err);
      setError(err.response?.data?.mensaje || 'Error al guardar el horario');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este horario?')) {
      return;
    }

    try {
      await horariosAPI.delete(id);
      setSuccess('Horario eliminado correctamente');
      loadHorarios();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error eliminando horario:', err);
      setError('Error al eliminar el horario');
    }
  };

  const diasSemanaLabels = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
    0: 'Domingo',
  };

  if (loading) {
    return <Loader message="Cargando horarios..." />;
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Gestión de Horarios</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <FaPlus /> Nuevo Horario
        </button>
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <Card>
        {horarios.length === 0 ? (
          <p className="text-center text-muted">No hay horarios configurados</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Hora Entrada</th>
                  <th>Hora Salida</th>
                  <th>Tolerancia</th>
                  <th>Días</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {horarios.map((horario) => (
                  <tr key={horario._id}>
                    <td>
                      <div className="horario-info">
                        <FaClock className="horario-icon" />
                        {horario.nombre}
                      </div>
                    </td>
                    <td className="font-bold">{horario.horaEntrada}</td>
                    <td className="font-bold">{horario.horaSalida}</td>
                    <td>{horario.toleranciaMinutos} min</td>
                    <td>
                      <div className="dias-tags">
                        {horario.diasSemana?.map((dia) => (
                          <span key={dia} className="tag tag-sm">
                            {diasSemanaLabels[dia]?.substring(0, 3)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => handleOpenModal(horario)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(horario._id)}
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
        title={editingHorario ? 'Editar Horario' : 'Nuevo Horario'}
      >
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Nombre del Horario *</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Horario Oficina"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Hora de Entrada *</label>
              <input
                type="time"
                name="horaEntrada"
                value={formData.horaEntrada}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Hora de Salida *</label>
              <input
                type="time"
                name="horaSalida"
                value={formData.horaSalida}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Tolerancia (minutos) *</label>
            <input
              type="number"
              name="toleranciaMinutos"
              value={formData.toleranciaMinutos}
              onChange={handleChange}
              min="0"
              max="60"
              required
            />
          </div>

          <div className="form-group">
            <label>Días de la Semana *</label>
            <div className="checkbox-group">
              {Object.entries(diasSemanaLabels).map(([value, label]) => (
                <label key={value} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.diasSemana.includes(parseInt(value))}
                    onChange={() => handleDiasChange(parseInt(value))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editingHorario ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminHorarios;
