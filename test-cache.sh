#!/bin/sh
echo "=== TEST DE CACHE REDIS ==="
echo ""

# 1. Login
echo "1. Login..."
TOKEN=$(wget -qO- --header='Content-Type: application/json' --post-data='{"email":"admin@asistencia.cl","password":"admin123"}' http://localhost:3000/api/v1/usuarios/login | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token obtenido: ${TOKEN:0:20}..."
echo ""

# 2. Primera llamada GET (CACHE MISS)
echo "2. Primera llamada GET /usuarios (esperado: CACHE MISS)..."
wget -qO- --header="Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/usuarios | grep -o '"success":[^,]*' 
echo ""

# 3. Segunda llamada GET (CACHE HIT)
echo "3. Segunda llamada GET /usuarios (esperado: CACHE HIT)..."
wget -qO- --header="Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/usuarios | grep -o '"cached":[^,]*'
echo ""

# 4. Crear usuario (invalida cache)
echo "4. POST /usuarios (invalida cache)..."
wget -qO- --header="Authorization: Bearer $TOKEN" --header='Content-Type: application/json' --post-data='{"rut":"11111111-1","nombre":"Test","email":"test@test.cl","rol":"funcionario","establecimientoId":"673e17a34c17f30b5819d0b8"}' http://localhost:3000/api/v1/usuarios | grep -o '"success":[^,]*'
echo ""

# 5. Tercera llamada GET (CACHE MISS después de invalidación)
echo "5. Tercera llamada GET /usuarios (esperado: CACHE MISS - cache invalidado)..."
wget -qO- --header="Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/usuarios | grep -o '"cached":[^,]*'
echo ""

echo "=== FIN DEL TEST ==="
