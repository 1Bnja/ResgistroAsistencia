# 🚀 Quick Start - Reconocimiento Facial

## ⚡ Inicio Rápido (3 pasos)

### 1️⃣ Crear Usuario
```
Admin Panel → Gestión de Usuarios → + Nuevo Usuario
Completa: Nombre, RUT, Email, Horario
```

### 2️⃣ Entrenar Rostro
```
Tabla de Usuarios → Botón 🎥 Cámara (amarillo)
Captura 3-10 fotos → ✓ Entrenar Reconocimiento
```

### 3️⃣ Marcar Asistencia
```
Terminal de Marcaje → Iniciar Cámara
Capturar Foto → ✓ Confirmar y Marcar
```

---

## 📸 Tips Rápidos para Mejores Fotos

✅ **SÍ HACER:**
- Buena iluminación frontal
- Rostro centrado y visible
- Diferentes ángulos (frontal, izq, der)
- Fondo despejado

❌ **NO HACER:**
- Contra luz o sombras fuertes
- Múltiples personas en la foto
- Accesorios que oculten el rostro
- Fotos borrosas o pixeladas

---

## 🎯 Cantidad Recomendada de Fotos

| Escenario | Fotos Mínimas | Fotos Recomendadas |
|-----------|---------------|-------------------|
| Uso básico | 3 | 5 |
| Uso estándar | 5 | 8 |
| Alta precisión | 8 | 10 |

---

## 🔧 Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| No detecta rostro | Mejora iluminación, acerca más el rostro |
| Múltiples rostros | Asegura que solo tú estés en el encuadre |
| No reconoce | Re-entrena con más fotos de mejor calidad |
| Servicio no disponible | `docker-compose restart ai-service` |

---

## 🌐 URLs del Sistema

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:8080/api
- **AI Service**: http://localhost:8080/ai
- **Login Demo**: admin@asistencia.cl / admin123

---

## 📊 Estado del Reconocimiento

En la tabla de usuarios, verás:
- **✓ Activo** (verde) = Reconocimiento configurado
- **✗ Inactivo** (gris) = Necesita entrenamiento

---

## ⚙️ Comandos Útiles

```bash
# Ver estado de servicios
docker-compose ps

# Ver logs de IA
docker-compose logs -f ai-service

# Reiniciar todo
docker-compose restart

# Acceder al sistema
http://localhost:8080
```

---

**¡Listo! Sistema de Reconocimiento Facial Operativo 🎉**

Para más detalles, consulta: `GUIA_RECONOCIMIENTO_FACIAL.md`
