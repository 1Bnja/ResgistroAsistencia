import React from 'react';

const Loader = ({ message = 'Cargando...' }) => {
  return (
    <div className="loader-container">
      <div className="loader"></div>
      <p>{message}</p>
    </div>
  );
};

export default Loader;
