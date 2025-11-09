# ResgistroAsistencia

Antes de ejecutar aplicar 
npm install 




Ejecutar script para ver los nodos y el estado replica de mongodb atlas

docker run --rm mongo:7 mongosh "mongodb+srv://benjaminanc7_db_user:MM0RBewpUtHwru4g@cluster0.v7a5bj5.mongodb.net/asistencia_db" --quiet --eval "db.serverStatus().repl" 2>$null