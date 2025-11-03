import React, { useState, useEffect } from 'react';
import { usuariosAPI } from '../services/api';
import Card from '../components/Card';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import Alert from '../components/Alert';
import { FaPlus, FaEdit, FaTrash, FaCamera, FaUser } from 'react-icons/fa';

const AdminUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    rut: '',
    email: '',
    password: '',
    rol: 'usuario',
    horarioId: '',
  });

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const response = await usuariosAPI.getAll();
      setUsuarios(response.data.usuarios || []);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
      setError('Error al cargar los usuarios');
    } finally {
      setLoading(false);
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
        password: '',
        rol: user.rol,
        horarioId: user.horario?._id || '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        nombre: '',
        apellido: '',
        rut: '',
        email: '',
        password: '',
        rol: 'usuario',
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
        await usuariosAPI.create(dataToSend);
        setSuccess('Usuario creado correctamente');
      }

      handleCloseModal();
      loadUsuarios();
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

  if (loading) {
    return <Loader message="Cargando usuarios..." />;
  }

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
                    <td>{usuario.horario?.nombre || 'Sin asignar'}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => handleOpenModal(usuario)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(usuario._id)}
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
                <option value="usuario">Usuario</option>
                <option value="admin">Administrador</option>
                <option value="superadmin">Super Administrador</option>
              </select>
            </div>
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
    </div>
  );
};

export default AdminUsuarios;
