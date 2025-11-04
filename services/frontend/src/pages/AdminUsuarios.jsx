import React, { useState, useEffect } from 'react';
import { usuariosAPI, horariosAPI } from '../services/api';
import Card from '../components/Card';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import Alert from '../components/Alert';
import FacialTraining from '../components/FacialTraining';
import { FaPlus, FaEdit, FaTrash, FaCamera, FaUser, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const AdminUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [facialModalOpen, setFacialModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [trainingUser, setTrainingUser] = useState(null);
  const [trainingLoading, setTrainingLoading] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    rut: '',
    email: '',
    cargo: '',
    departamento: '',
    password: '',
    rol: 'funcionario',
    horarioId: '',
  });

  useEffect(() => {
    loadUsuarios();
    loadHorarios();
  }, []);

  useEffect(() => {
    console.log('🔄 Estado de usuarios cambió:', usuarios);
  }, [usuarios]);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const response = await usuariosAPI.getAll();
      console.log('Respuesta completa:', response);
      console.log('Usuarios recibidos:', response.data.data);
      console.log('Cantidad de usuarios:', response.data.data?.length || 0);
      setUsuarios(response.data.data || []);
      console.log('Estado actualizado con usuarios');
    } catch (err) {
      console.error('Error cargando usuarios:', err);
      setError('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const loadHorarios = async () => {
    try {
      const response = await horariosAPI.getAll();
      setHorarios(response.data.data || []);
    } catch (err) {
      console.error('Error cargando horarios:', err);
      // No mostramos error si falla la carga de horarios
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nombre: user.nombre,
        apellido: user.apellido,
        rut: user.rut,
        email: user.email,
        cargo: user.cargo || '',
        departamento: user.departamento || '',
        password: '',
        rol: user.rol,
        horarioId: user.horarioId?._id || user.horarioId || '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        nombre: '',
        apellido: '',
        rut: '',
        email: '',
        cargo: '',
        departamento: '',
        password: '',
        rol: 'funcionario',
        horarioId: '',
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingUser(null);
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
      const dataToSend = { ...formData };
      if (editingUser && !dataToSend.password) {
        delete dataToSend.password;
      }

      if (editingUser) {
        await usuariosAPI.update(editingUser._id, dataToSend);
        setSuccess('Usuario actualizado correctamente');
      } else {
        const createResponse = await usuariosAPI.create(dataToSend);
        console.log('Usuario creado, respuesta:', createResponse);
        setSuccess('Usuario creado correctamente');
      }

      // Recargar ANTES de cerrar el modal para asegurar que se ejecuta
      console.log('Recargando lista de usuarios...');
      await loadUsuarios();
      
      handleCloseModal();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error guardando usuario:', err);
      setError(err.response?.data?.mensaje || 'Error al guardar el usuario');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) {
      return;
    }

    try {
      await usuariosAPI.delete(id);
      setSuccess('Usuario eliminado correctamente');
      loadUsuarios();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error eliminando usuario:', err);
      setError('Error al eliminar el usuario');
    }
  };

  const handleOpenFacialTraining = (usuario) => {
    setTrainingUser(usuario);
    setFacialModalOpen(true);
  };

  const handleCloseFacialTraining = () => {
    setFacialModalOpen(false);
    setTrainingUser(null);
    setError('');
  };

  const handleCompleteFacialTraining = async (imagenes) => {
    if (!trainingUser) return;

    try {
      setTrainingLoading(true);
      setError('');

      const response = await usuariosAPI.entrenarFacial(trainingUser._id, imagenes);

      if (response.data.success) {
        setSuccess(
          `Reconocimiento facial entrenado: ${response.data.data.encodings_guardados} foto(s) procesada(s)`
        );
        handleCloseFacialTraining();
        loadUsuarios();
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err) {
      console.error('Error entrenando reconocimiento facial:', err);
      setError(err.response?.data?.message || 'Error al entrenar el reconocimiento facial');
    } finally {
      setTrainingLoading(false);
    }
  };

  if (loading) {
    return <Loader message="Cargando usuarios..." />;
  }

  console.log('RENDER - Usuarios actuales:', usuarios);
  console.log('RENDER - Cantidad:', usuarios.length);

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Gestión de Usuarios</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <FaPlus /> Nuevo Usuario
        </button>
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* DEBUG INFO */}
      <div style={{ padding: '10px', background: '#f0f0f0', marginBottom: '10px', borderRadius: '4px', fontSize: '12px' }}>
        <strong>🐛 Debug:</strong> Total usuarios en estado: {usuarios.length} | 
        Loading: {loading ? 'Sí' : 'No'} | 
        IDs: {usuarios.map(u => u._id).join(', ') || 'ninguno'}
      </div>

      <Card>
        {usuarios.length === 0 ? (
          <p className="text-center text-muted">No hay usuarios registrados</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>RUT</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Horario</th>
                  <th>Reconocimiento</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario._id}>
                    <td>
                      <div className="user-info">
                        <FaUser className="user-icon" />
                        {usuario.nombre} {usuario.apellido}
                      </div>
                    </td>
                    <td>{usuario.rut}</td>
                    <td>{usuario.email}</td>
                    <td>
                      <span className={`badge badge-${usuario.rol === 'admin' ? 'primary' : 'secondary'}`}>
                        {usuario.rol}
                      </span>
                    </td>
                    <td>{usuario.horarioId?.nombre || 'Sin asignar'}</td>
                    <td>
                      {usuario.reconocimientoFacialActivo ? (
                        <span className="facial-status active" title="Reconocimiento facial activo">
                          <FaCheckCircle /> Activo
                        </span>
                      ) : (
                        <span className="facial-status inactive" title="Reconocimiento facial no configurado">
                          <FaTimesCircle /> Inactivo
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleOpenFacialTraining(usuario)}
                          title="Entrenar reconocimiento facial"
                        >
                          <FaCamera />
                        </button>
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => handleOpenModal(usuario)}
                          title="Editar usuario"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(usuario._id)}
                          title="Eliminar usuario"
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
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
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
                required
              />
            </div>
            <div className="form-group">
              <label>Apellido *</label>
              <input
                type="text"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>RUT *</label>
              <input
                type="text"
                name="rut"
                value={formData.rut}
                onChange={handleChange}
                placeholder="12345678-9"
                required
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cargo *</label>
              <input
                type="text"
                name="cargo"
                value={formData.cargo}
                onChange={handleChange}
                placeholder="Ej: Desarrollador"
                required
              />
            </div>
            <div className="form-group">
              <label>Departamento *</label>
              <input
                type="text"
                name="departamento"
                value={formData.departamento}
                onChange={handleChange}
                placeholder="Ej: TI"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Contraseña {!editingUser && '*'}</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={editingUser ? 'Dejar vacío para no cambiar' : ''}
                required={!editingUser}
              />
            </div>
            <div className="form-group">
              <label>Rol *</label>
              <select name="rol" value={formData.rol} onChange={handleChange} required>
                <option value="funcionario">Funcionario</option>
                <option value="admin">Administrador</option>
                <option value="superadmin">Super Administrador</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Horario *</label>
            <select name="horarioId" value={formData.horarioId} onChange={handleChange} required>
              <option value="">Seleccionar horario</option>
              {horarios.map((horario) => (
                <option key={horario._id} value={horario._id}>
                  {horario.nombre} ({horario.horaEntrada} - {horario.horaSalida})
                </option>
              ))}
            </select>
            {horarios.length === 0 && (
              <small style={{ color: '#dc2626', display: 'block', marginTop: '0.25rem' }}>
                No hay horarios disponibles. Por favor, cree un horario primero.
              </small>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editingUser ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={facialModalOpen}
        onClose={handleCloseFacialTraining}
        title="Entrenamiento de Reconocimiento Facial"
        size="large"
      >
        {trainingLoading ? (
          <div className="training-loading">
            <Loader message="Entrenando modelo de reconocimiento facial..." />
            <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
              Este proceso puede tomar algunos segundos...
            </p>
          </div>
        ) : trainingUser ? (
          <FacialTraining
            usuarioId={trainingUser._id}
            nombreUsuario={`${trainingUser.nombre} ${trainingUser.apellido}`}
            onComplete={handleCompleteFacialTraining}
            onCancel={handleCloseFacialTraining}
          />
        ) : null}
      </Modal>
    </div>
  );
};

export default AdminUsuarios;
