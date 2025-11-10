const excelService = require('../services/excelService');
const logger = require('../utils/logger');

class ExportController {
  
  /**
   * Exportar todos los marcajes a Excel
   * GET /api/export/marcajes/excel?fechaInicio=2024-01-01&fechaFin=2024-12-31&establecimientoId=123
   */
  async exportarMarcajes(req, res) {
    try {
      logger.info('Solicitud de exportación de marcajes recibida', {
        query: req.query,
        ip: req.ip
      });
      
      const { fechaInicio, fechaFin, usuarioId, establecimientoId } = req.query;
      
      const filtros = {};
      if (fechaInicio) filtros.fechaInicio = fechaInicio;
      if (fechaFin) filtros.fechaFin = fechaFin;
      if (usuarioId) filtros.usuarioId = usuarioId;
      if (establecimientoId) filtros.establecimientoId = establecimientoId;
      
      // Generar Excel
      const buffer = await excelService.generarReporteMarcajes(filtros);
      
      // Nombre del archivo
      const fecha = new Date().toISOString().split('T')[0];
      const filename = `reporte_asistencia_${fecha}.xlsx`;
      
      // Configurar headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      
      logger.info('Archivo Excel generado exitosamente', {
        filename,
        size: buffer.length,
        filtros
      });
      
      res.send(buffer);
      
    } catch (error) {
      logger.error('Error al exportar marcajes', {
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        success: false,
        message: 'Error al generar el archivo Excel',
        error: error.message
      });
    }
  }
  
  /**
   * Exportar asistencia de un usuario específico
   * GET /api/export/usuario/:usuarioId/excel?fechaInicio=2024-01-01&fechaFin=2024-12-31
   */
  async exportarPorUsuario(req, res) {
    try {
      const { usuarioId } = req.params;
      const { fechaInicio, fechaFin } = req.query;
      
      logger.info('Solicitud de exportación por usuario', {
        usuarioId,
        fechaInicio,
        fechaFin
      });
      
      // Generar Excel
      const buffer = await excelService.generarReportePorUsuario(
        usuarioId,
        fechaInicio,
        fechaFin
      );
      
      const fecha = new Date().toISOString().split('T')[0];
      const filename = `asistencia_usuario_${usuarioId}_${fecha}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      
      logger.info('Reporte individual generado exitosamente', {
        usuarioId,
        filename,
        size: buffer.length
      });
      
      res.send(buffer);
      
    } catch (error) {
      logger.error('Error al exportar asistencia individual', {
        usuarioId: req.params.usuarioId,
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        success: false,
        message: 'Error al generar el reporte individual',
        error: error.message
      });
    }
  }
  
  /**
   * Endpoint de prueba para verificar que el servicio funciona
   * GET /api/export/health
   */
  async health(req, res) {
    res.json({
      success: true,
      message: 'Servicio de exportación funcionando correctamente',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new ExportController();
