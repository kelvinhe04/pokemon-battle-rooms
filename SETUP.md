# Pokémon Battle Rooms - Guía de Instalación y Ejecución

## ⚠️ IMPORTANTE: El problema previo está SOLUCIONADO

El problema era que el `package.json` tenía overrides conflictivos que forzaban versiones de TanStack que **no existen**. Esto ya fue arreglado.

---

## 🚀 Pasos para levantar el proyecto (CADA VEZ que quieras ejecutarlo)

### Opción A: Docker Compose (RECOMENDADA)

```bash
# 1. Asegúrate de estar en el directorio raíz del proyecto
cd "D:\Programacion\Soft 9\Proyectos\Pokémon Battle Rooms"

# 2. Levanta los contenedores (SIN --build, para evitar error de Docker)
docker compose up --no-build

# 3. En otra terminal, ejecuta el seed UNA SOLA VEZ (solo la primera vez):
docker compose exec backend bun src/seed/pokeapi.ts

# 4. Abre dos navegadores en http://localhost:3000
```

**Puertos:**
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- MongoDB: `mongodb://localhost:27017`

---

### Opción B: Local (Desarrollo)

```bash
# 1. Instala dependencias (NUNCA npm, siempre pnpm)
pnpm install

# 2. Levanta MongoDB en Docker
docker run -d -p 27017:27017 --name pbr-mongo mongo:7

# 3. Siembra la BD (solo primera vez)
pnpm seed

# 4. En una terminal, levanta el backend
pnpm backend:dev

# 5. En otra terminal, levanta el frontend
pnpm frontend:dev
```

---

## ⚠️ Troubleshooting

### Si `docker compose up` falla con error gRPC:
```bash
# Usa --no-build en lugar de --build
docker compose up --no-build
```

### Si algo no funciona, haz una limpieza completa:
```bash
# Detén y elimina TODO
docker compose down -v

# Elimina node_modules y lock (SIN tocar package.json)
rm -r node_modules pnpm-lock.yaml

# Reinstala
pnpm install

# Levanta de nuevo
docker compose up --no-build
```

### El seed solo se ejecuta UNA VEZ
Después de ejecutar el seed, la BD persiste. No necesitas repetirlo.

---

## ✅ Verificación

Para confirmar que todo funciona:

```bash
# Ver estado de contenedores
docker compose ps

# Ver logs del backend
docker compose logs backend

# Ver logs del frontend
docker compose logs frontend

# Probar el API
curl http://localhost:3001/api/pokemon?limit=5
```

---

## 📝 Notas importantes

1. **Nunca uses npm**, siempre **pnpm**
2. **Nunca modifiques los overrides** en `package.json` (está correcto ahora)
3. **El seed tarda 2-3 minutos**, es normal
4. **Docker Desktop debe estar corriendo** antes de ejecutar `docker compose`
