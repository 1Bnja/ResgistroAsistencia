// Script para verificar el estado del Replica Set de MongoDB Atlas

print('\n================================================');
print('  ESTADO DEL REPLICA SET DE MONGODB ATLAS');
print('================================================\n');

// 1. REPLICACIÓN AUTOMÁTICA - 3 Nodos
print('1. REPLICACION AUTOMATICA - 3 Nodos:');
print('   (Estado PRIMARY/SECONDARY)\n');

var status = rs.status();
print('Replica Set: ' + status.set);
print('Fecha: ' + status.date);
print('\nNODOS:');
status.members.forEach(function(member) {
    print('  - ' + member.name);
    print('    Estado: ' + member.stateStr + (member.stateStr === 'PRIMARY' ? ' (PRIMARIO)' : ''));
    print('    Salud: ' + (member.health === 1 ? 'OK' : 'FALLO'));
    var dias = Math.floor(member.uptime / 86400);
    var horas = Math.floor((member.uptime % 86400) / 3600);
    print('    Uptime: ' + dias + ' dias, ' + horas + ' horas');
    print('');
});

print('\n------------------------------------------------\n');

// 2. ALTA DISPONIBILIDAD
print('2. ALTA DISPONIBILIDAD:');
print('   (Failover automatico)\n');

print('Votos necesarios para mayoria: ' + status.majorityVoteCount + ' de ' + status.votingMembersCount);
print('Escrituras requieren mayoria: ' + status.writeMajorityCount + ' nodos');
print('Intervalo de heartbeat: ' + status.heartbeatIntervalMillis + ' ms');

if (status.electionCandidateMetrics) {
    print('\nUltima eleccion de PRIMARY:');
    print('  Razon: ' + status.electionCandidateMetrics.lastElectionReason);
    print('  Fecha: ' + status.electionCandidateMetrics.lastElectionDate);
    print('  Nodo anterior: ID ' + status.electionCandidateMetrics.priorPrimaryMemberId);
}

print('\n------------------------------------------------\n');

// 3. CONFIGURACIÓN SIN MANTENIMIENTO
print('3. CONFIGURACION SIN MANTENIMIENTO:');
print('   (Cluster administrado por Atlas)\n');

var repl = db.serverStatus().repl;
if (repl.tags) {
    print('Proveedor Cloud: ' + repl.tags.provider);
    print('Region: ' + repl.tags.region);
    print('Zona de disponibilidad: ' + repl.tags.availabilityZone);
    print('Tipo de nodo: ' + repl.tags.nodeType);
    print('Estado del disco: ' + repl.tags.diskState);
    print('Tipo de carga: ' + repl.tags.workloadType);
}

print('\n------------------------------------------------\n');

// 4. BASES DE DATOS Y COLECCIONES
print('4. BASES DE DATOS Y COLECCIONES:');
print('   (Tu aplicacion)\n');

var dbs = db.adminCommand('listDatabases');
print('Total de bases de datos: ' + dbs.databases.length);

print('\nBase de datos: asistencia_db');
db = db.getSiblingDB('asistencia_db');
var collections = db.getCollectionNames();
print('Colecciones encontradas: ' + collections.length);

if (collections.length > 0) {
    collections.forEach(function(col) {
        try {
            var count = db[col].countDocuments();
            print('  - ' + col + ': ' + count + ' documentos');
        } catch(e) {
            print('  - ' + col + ': (error al contar)');
        }
    });
} else {
    print('  (No hay colecciones aun - DB vacia)');
}

print('\n------------------------------------------------\n');

// 5. ACTIVIDAD RECIENTE
print('5. ACTIVIDAD RECIENTE:');
print('   (Ultimas escrituras)\n');

if (repl.lastWrite) {
    print('Ultima escritura: ' + repl.lastWrite.lastWriteDate);
    print('OpTime: ' + repl.lastWrite.opTime.t);
    print('Ultima mayoria: ' + repl.lastWrite.majorityWriteDate);
}

print('\n================================================');
print('  VERIFICACION COMPLETADA');
print('================================================\n');

print('\nNOTA SOBRE BACKUPS AUTOMATICOS:');
print('Los backups se configuran desde la consola web:');
print('https://cloud.mongodb.com/');
print('Ir a: Cluster > Backup > Configure\n');
