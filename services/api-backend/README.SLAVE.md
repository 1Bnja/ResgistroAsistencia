# API Backend — Slave usage

This document explains how to run the API as a read-only slave instance.

## Purpose
The slave instance serves read-only traffic. It uses the same codebase as the master but starts with `ROLE=slave` and should point to a read-replica MongoDB when available.

## Important environment variables
- ROLE: `slave` to enable read-only mode (the `slaveGuard` middleware will block POST/PUT/PATCH/DELETE).
- MONGODB_READ_URI: connection string for the read-replica (recommended).
- MONGODB_WRITE_URI: connection string for the write/master DB (used by master role).
- MONGODB_URI: fallback connection string (used if specific read/write URIs aren't provided).
- MONGODB_DB_NAME: optional, ensures the driver uses the specified DB name.

## Example (docker-compose-test.yml)
The repository uses `docker-compose-test.yml` to start both master and slave. The slave service is configured to build the same image and start with `ROLE=slave` mapping port `3001:3000`.

## Behavior
- Read requests (GET, HEAD, OPTIONS) are allowed.
- Write requests (POST, PUT, PATCH, DELETE) return HTTP 405 with JSON `{ "success": false, "error": "Service is read-only (slave mode). Writes are disabled." }`.
- If `ROLE=slave` and `MONGODB_READ_URI` is not set, the service will log a warning and use `MONGODB_URI` as fallback (not a true replica).

## Run locally (example)
1. Define env variables (PowerShell):

```powershell
$env:MONGODB_URI = 'mongodb+srv://user:pass@cluster0...'
$env:MONGODB_DB_NAME = 'Admin-Redes'
$env:MONGODB_READ_URI = 'mongodb://replica-host:27017/mydb' # optional
```

2. Start the compose setup (from repo root):

```powershell
docker-compose -f .\docker-compose-test.yml up --build
```

3. Test:
- Slave health: `http://localhost:3001/health`
- Slave read: `GET http://localhost:3001/api/v1/usuarios`
- Slave write (should 405): `POST http://localhost:3001/api/v1/usuarios`

## Notes
- Do not commit credentials. Use secrets for production.
- Consider monitoring replication lag if you rely on near-real-time reads.

*** End of README ***
