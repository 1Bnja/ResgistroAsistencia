const ExcelJS = require('exceljs');
const Marcaje = require('../models/Marcaje');
const Usuario = require('../models/Usuario');
const Horario = require('../models/Horario');
const Establecimiento = require('../models/Establecimiento');

class ExcelService {
  
  /**
   * Genera un archivo Excel con todos los marcajes
   * @param {Object} filtros - Filtros opcionales (fechaInicio, fechaFin, usuarioId)
   * @returns {Promise<Buffer>} - Buffer del archivo Excel
   */
  async generarReporteMarcajes(filtros = {}) {
    const workbook = new ExcelJS.Workbook();
    
    // Configurar propiedades del documento
    workbook.creator = 'Sistema de Asistencia UTalca';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Crear hoja de marcajes
    const sheet = workbook.addWorksheet('Marcajes de Asistencia', {
      properties: { tabColor: { argb: 'FF4CAF50' } }
    });
    
    // Definir columnas con estilos
    sheet.columns = [
      { header: 'RUT', key: 'rut', width: 15 },
      { header: 'Nombre Completo', key: 'nombreCompleto', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Establecimiento', key: 'establecimiento', width: 25 },
      { header: 'Cargo', key: 'cargo', width: 20 },
      { header: 'Departamento', key: 'departamento', width: 20 },
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Hora', key: 'hora', width: 10 },
      { header: 'Tipo', key: 'tipo', width: 10 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Min. Atraso', key: 'minutosAtraso', width: 12 },
      { header: 'Ubicación', key: 'ubicacion', width: 20 },
      { header: 'Observaciones', key: 'observaciones', width: 30 }
    ];
    
    // Estilizar encabezados
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2196F3' }
    };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 25;
    
    // Construir query con filtros
    const query = {};
    if (filtros.fechaInicio || filtros.fechaFin) {
      query.fecha = {};
      if (filtros.fechaInicio) {
        query.fecha.$gte = new Date(filtros.fechaInicio);
      }
      if (filtros.fechaFin) {
        query.fecha.$lte = new Date(filtros.fechaFin);
      }
    }
    if (filtros.usuarioId) {
      query.usuarioId = filtros.usuarioId;
    }
    
    // Obtener marcajes con información del usuario y establecimiento
    const marcajes = await Marcaje.find(query)
      .populate({
        path: 'usuarioId',
        populate: {
          path: 'establecimientoId',
          select: 'nombre codigo'
        }
      })
      .sort({ fecha: -1, hora: -1 })
      .lean();
    
    // Si hay filtro por establecimiento, filtrar después del populate
    let marcajesFiltrados = marcajes;
    if (filtros.establecimientoId) {
      marcajesFiltrados = marcajes.filter(m => 
        m.usuarioId?.establecimientoId?._id?.toString() === filtros.establecimientoId
      );
    }
    
    // Agregar datos
    marcajesFiltrados.forEach(marcaje => {
      const usuario = marcaje.usuarioId || {};
      const establecimiento = usuario.establecimientoId || {};
      const row = sheet.addRow({
        rut: usuario.rut || 'N/A',
        nombreCompleto: `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'N/A',
        email: usuario.email || 'N/A',
        establecimiento: establecimiento.nombre || 'N/A',
        cargo: usuario.cargo || 'N/A',
        departamento: usuario.departamento || 'N/A',
        fecha: marcaje.fecha ? new Date(marcaje.fecha).toLocaleDateString('es-CL') : 'N/A',
        hora: marcaje.hora || 'N/A',
        tipo: marcaje.tipo ? marcaje.tipo.toUpperCase() : 'N/A',
        estado: marcaje.estado ? marcaje.estado.toUpperCase() : 'PUNTUAL',
        minutosAtraso: marcaje.minutosAtraso || 0,
        ubicacion: marcaje.ubicacion || 'Terminal Principal',
        observaciones: marcaje.observaciones || ''
      });
      
      // Colorear filas según estado
      const estadoColor = this.getEstadoColor(marcaje.estado);
      if (estadoColor) {
        row.eachCell((cell, colNumber) => {
          if (colNumber === 10) { // Columna de Estado (ahora es la 10 por el nuevo campo)
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: estadoColor }
            };
            cell.font = { bold: true };
          }
        });
      }
    });
    
    // Agregar filtros automáticos
    sheet.autoFilter = {
      from: 'A1',
      to: 'M1'  // Actualizado de L1 a M1 por la nueva columna
    };
    
    // Crear hoja de resumen
    await this.agregarHojaResumen(workbook, marcajesFiltrados);
    
    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
  
  /**
   * Genera reporte de asistencia por usuario
   */
  async generarReportePorUsuario(usuarioId, fechaInicio, fechaFin) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Asistencia UTalca';
    
    // Obtener información del usuario
    const usuario = await Usuario.findById(usuarioId)
      .populate('horarioId')
      .populate('establecimientoId')
      .lean();
    
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }
    
    // Crear hoja principal
    const sheet = workbook.addWorksheet(`Asistencia - ${usuario.nombre}`, {
      properties: { tabColor: { argb: 'FF4CAF50' } }
    });
    
    // Información del usuario (primeras filas)
    sheet.mergeCells('A1:D1');
    const titleRow = sheet.getCell('A1');
    titleRow.value = 'REPORTE DE ASISTENCIA INDIVIDUAL';
    titleRow.font = { size: 16, bold: true, color: { argb: 'FF2196F3' } };
    titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;
    
    sheet.getCell('A3').value = 'RUT:';
    sheet.getCell('B3').value = usuario.rut;
    sheet.getCell('A4').value = 'Nombre:';
    sheet.getCell('B4').value = `${usuario.nombre} ${usuario.apellido}`;
    sheet.getCell('A5').value = 'Email:';
    sheet.getCell('B5').value = usuario.email;
    sheet.getCell('A6').value = 'Cargo:';
    sheet.getCell('B6').value = usuario.cargo;
    
    sheet.getCell('C3').value = 'Departamento:';
    sheet.getCell('D3').value = usuario.departamento;
    sheet.getCell('C4').value = 'Horario:';
    sheet.getCell('D4').value = usuario.horarioId?.nombre || 'N/A';
    sheet.getCell('C5').value = 'Hora Entrada:';
    sheet.getCell('D5').value = usuario.horarioId?.horaEntrada || 'N/A';
    
    // Estilizar información del usuario
    ['A3', 'A4', 'A5', 'A6', 'C3', 'C4', 'C5'].forEach(cell => {
      sheet.getCell(cell).font = { bold: true };
    });
    
    // Espacio
    sheet.getRow(7).height = 5;
    
    // Tabla de marcajes
    sheet.getCell('A8').value = 'REGISTRO DE MARCAJES';
    sheet.mergeCells('A8:F8');
    sheet.getCell('A8').font = { size: 14, bold: true };
    sheet.getCell('A8').alignment = { horizontal: 'center' };
    
    const headerRow = sheet.getRow(9);
    headerRow.values = ['Fecha', 'Hora', 'Tipo', 'Estado', 'Min. Atraso', 'Ubicación'];
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2196F3' }
    };
    headerRow.alignment = { horizontal: 'center' };
    
    // Obtener marcajes
    const query = { usuarioId };
    if (fechaInicio || fechaFin) {
      query.fecha = {};
      if (fechaInicio) query.fecha.$gte = new Date(fechaInicio);
      if (fechaFin) query.fecha.$lte = new Date(fechaFin);
    }
    
    const marcajes = await Marcaje.find(query)
      .sort({ fecha: -1, hora: -1 })
      .lean();
    
    let rowNum = 10;
    marcajes.forEach(marcaje => {
      const row = sheet.getRow(rowNum++);
      row.values = [
        new Date(marcaje.fecha).toLocaleDateString('es-CL'),
        marcaje.hora,
        marcaje.tipo.toUpperCase(),
        marcaje.estado.toUpperCase(),
        marcaje.minutosAtraso || 0,
        marcaje.ubicacion || 'Terminal Principal'
      ];
      
      // Colorear estado
      const estadoColor = this.getEstadoColor(marcaje.estado);
      if (estadoColor) {
        row.getCell(4).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: estadoColor }
        };
      }
    });
    
    // Ajustar anchos
    sheet.getColumn(1).width = 15;
    sheet.getColumn(2).width = 10;
    sheet.getColumn(3).width = 10;
    sheet.getColumn(4).width = 12;
    sheet.getColumn(5).width = 12;
    sheet.getColumn(6).width = 20;
    
    // Estadísticas
    const totalMarcajes = marcajes.length;
    const totalAtrasos = marcajes.filter(m => m.estado === 'atraso').length;
    const totalAusencias = marcajes.filter(m => m.estado === 'ausente').length;
    const totalPuntual = marcajes.filter(m => m.estado === 'puntual').length;
    
    const statsRow = rowNum + 2;
    sheet.getCell(`A${statsRow}`).value = 'RESUMEN ESTADÍSTICO';
    sheet.mergeCells(`A${statsRow}:F${statsRow}`);
    sheet.getCell(`A${statsRow}`).font = { size: 12, bold: true };
    sheet.getCell(`A${statsRow}`).alignment = { horizontal: 'center' };
    
    sheet.getCell(`A${statsRow + 1}`).value = 'Total Marcajes:';
    sheet.getCell(`B${statsRow + 1}`).value = totalMarcajes;
    sheet.getCell(`A${statsRow + 2}`).value = 'Puntuales:';
    sheet.getCell(`B${statsRow + 2}`).value = totalPuntual;
    sheet.getCell(`A${statsRow + 3}`).value = 'Atrasos:';
    sheet.getCell(`B${statsRow + 3}`).value = totalAtrasos;
    sheet.getCell(`A${statsRow + 4}`).value = 'Ausencias:';
    sheet.getCell(`B${statsRow + 4}`).value = totalAusencias;
    
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
  
  /**
   * Agrega hoja de resumen con estadísticas
   */
  async agregarHojaResumen(workbook, marcajes) {
    const sheet = workbook.addWorksheet('Resumen', {
      properties: { tabColor: { argb: 'FFFF9800' } }
    });
    
    // Título
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'RESUMEN DE ASISTENCIA';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2196F3' }
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;
    
    // Estadísticas generales
    const totalMarcajes = marcajes.length;
    const totalPuntual = marcajes.filter(m => m.estado === 'puntual').length;
    const totalAtrasos = marcajes.filter(m => m.estado === 'atraso').length;
    const totalAusencias = marcajes.filter(m => m.estado === 'ausente').length;
    
    sheet.getCell('A3').value = 'ESTADÍSTICAS GENERALES';
    sheet.mergeCells('A3:B3');
    sheet.getCell('A3').font = { bold: true, size: 12 };
    
    const stats = [
      ['Total de Marcajes:', totalMarcajes],
      ['Marcajes Puntuales:', totalPuntual],
      ['Marcajes con Atraso:', totalAtrasos],
      ['Ausencias:', totalAusencias],
      ['Porcentaje Puntualidad:', totalMarcajes > 0 ? `${((totalPuntual / totalMarcajes) * 100).toFixed(1)}%` : '0%']
    ];
    
    let row = 4;
    stats.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`A${row}`).font = { bold: true };
      sheet.getCell(`B${row}`).value = value;
      row++;
    });
    
    // Ajustar anchos
    sheet.getColumn(1).width = 30;
    sheet.getColumn(2).width = 20;
    
    return sheet;
  }
  
  /**
   * Obtiene color según estado
   */
  getEstadoColor(estado) {
    const colores = {
      'puntual': 'FF4CAF50',      // Verde
      'atraso': 'FFFF9800',        // Naranja
      'ausente': 'FFF44336',       // Rojo
      'anticipado': 'FF2196F3'     // Azul
    };
    return colores[estado] || null;
  }
}

module.exports = new ExcelService();
