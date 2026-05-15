# Pokémon Battle Rooms

Aplicación web full-stack de combate **Pokémon 1v1 en tiempo real** mediante salas con código.
Datos en vivo desde **PokéAPI**, persistidos en **MongoDB**, motor de batalla server-side y UI animada estilo Pokémon Showdown.

> Proyecto académico — UTP / FISC — Curso "Desarrollo de Software" (Soft 9). Modalidad individual, 1 semana.

---

## 🎯 Stack

| Capa | Tecnología |
|---|---|
| Frontend | TanStack Start (React) + Framer Motion |
| Runtime | **Bun** |
| Backend | Hono (sobre Bun) + WebSockets |
| Base de datos | MongoDB |
| Gestor de paquetes | **pnpm** |
| Contenedores | Docker Compose |
| Datos externos | [PokéAPI v2](https://pokeapi.co) |

---

## 🚀 Cómo correr

### Primera vez (build de imágenes)

```bash
docker compose up --build -d
```

Luego sembrar la base de datos (solo una vez, tarda unos minutos):
```bash
docker compose exec backend bun src/seed/pokeapi.ts
```

### Arranque diario

Requisito: **Docker Desktop** corriendo.

Si tenés MongoDB instalado nativamente en Windows, detenerlo primero (en una terminal con permisos de administrador):
```
net stop MongoDB
```

Luego, desde la carpeta del proyecto:
```bash
docker compose up --no-build -d
```

Abrir `http://localhost:3000` en el navegador.

Para apagar:
```bash
docker compose down
```

### Hot-reload en desarrollo

Los volúmenes ya están configurados en `docker-compose.yml`. Los cambios en `apps/frontend/src/` y `apps/backend/src/` se reflejan automáticamente sin rebuild.

Solo necesitás hacer `docker compose build` si modificás `package.json`, `app.config.ts` o algún `Dockerfile`.

---

## 🌱 Proceso de seed (importación PokéAPI)

El script `apps/backend/src/seed/pokeapi.ts`:

1. Carga los **18 tipos** desde `/type/{name}/` con sus relaciones de daño completas (`double_damage_to`, `half_damage_to`, `no_damage_to`, etc.).
2. Pide **lista de Pokémon** con `limit=500` (sobre-fetch para descartar los que no califiquen).
3. Para cada Pokémon importa: id, nombre, tipos, stats base, sprites (incluyendo animados gen-5 cuando existan), y sus URLs de movimientos.
4. Consulta `/pokemon-species/{id}/` para marcar `isLegendary` y guardar `evolutionChainId`.
5. Importa todos los **movimientos referenciados** desde `/move/{id}/` (poder, precisión, prioridad, categoría físico/especial/estado, efectos derivados de `meta.ailment` y `stat_changes`).
6. **Auto-asigna 4 movimientos** por Pokémon: top-4 por `power`, desempate por `accuracy`, sin duplicados.
7. **Excluye** del catálogo los Pokémon con < 4 movimientos válidos. Se loggean en consola.
8. Persiste hasta cumplir `TARGET_COUNT = 300` Pokémon válidos.

> ⚠️ Si la BD ya tiene ≥ 300 Pokémon, el seed se salta. Para re-seed, dropea la colección `pokemons`.

---

## 🎮 Reglas implementadas (cumplimiento PDF)

### Datos
- ✅ 300+ Pokémon importados desde PokéAPI (no hardcodeados)
- ✅ Tipos y relaciones de daño desde `/type/`
- ✅ Movimientos completos desde `/move/`

### Pokémon en batalla
- ✅ Exactamente **4 movimientos**, sin duplicados
- ✅ Pokémon con menos de 4 moves válidos → excluidos del catálogo

### Salas
- ✅ Crear sala con código único (6 chars alfanuméricos)
- ✅ Otro jugador se une con el código
- ✅ Lobby de espera, sin login (nombres temporales)
- ✅ **Reconexión** (sesión guardada en localStorage por código)

### Batalla
- ✅ 1v1, hasta 6 Pokémon por equipo, 1 activo
- ✅ Acciones: **atacar** (1 de 4) o **cambiar** (no items, no run)
- ✅ Termina cuando los 6 Pokémon de un jugador están KO
- ✅ Validaciones server: jugador en sala, activo vivo, move pertenece, anti-doble-acción
- ✅ Frontend nunca calcula daño

### Orden de turno
- ✅ **Coin flip** en turno 1
- ✅ A partir de turno 2: **prioridad → velocidad → coin flip de desempate** (bonus)

### Daño y tipos
- ✅ Cálculo en backend con fórmula del PDF:
  ```
  baseDamage = floor(floor(floor((2*level)/5+2) * power * atk / def) / 50) + 2
  final = max(1, floor(baseDamage * randFactor * STAB * typeMult * crit * burn))
  ```
- ✅ Random factor 0.85–1.00, STAB 1.5, crítico 1/24 = 1.5
- ✅ Burn modifier 0.5 en moves físicos
- ✅ Tipos duales: multiplicadores **se combinan multiplicando** (ej. eléctrico vs Agua/Volador = ×4)
- ✅ Categorías: physical / special / status (con stats correspondientes)
- ✅ Precisión: `randInt(1,100) <= move.accuracy`
- ✅ Log indica: súper efectivo / poco efectivo / sin efecto / crítico / falló

### Estados temporales
- ✅ **Duran 3 turnos**
- ✅ Tipos: parálisis (½ velocidad), quemadura (5% maxHP/turno + ½ atk en físicos), veneno (5%/turno), bajadas de stat (-1, etc.)
- ✅ Visible en UI (badge sobre el Pokémon) + log
- ✅ Al **cambiar/retirar** el Pokémon, los estados y stages se eliminan

### Stats y nivel
- ✅ Nivel fijo 50, IVs aleatorios (0–31) generados al iniciar partida y guardados
- ✅ HP = `floor(((2*baseHp + ivHp)*50)/100) + 50 + 10`
- ✅ Stat = `floor(((2*baseStat + ivStat)*50)/100) + 5`
- ✅ Stages clamp [-6, +6] con multiplicador correcto

### UI / Animaciones
- ✅ Pantallas: home, lobby, ban, pick (Pokédex con filtros), coin flip, batalla, victoria
- ✅ Sprites animados gen-5 cuando disponibles (consistencia visual)
- ✅ **5 animaciones obligatorias**: atacar, recibir daño (flash + shake), cambiar (entrada/salida), barra HP (tween suave), KO (fade-down)
- ✅ Coin flip 3D, transiciones entre pantallas, log narrado

### Bonus implementados (+10 pts)
- ✅ **Baneo alternado** de 3 Pokémon por jugador (modo ranked)
- ✅ **Máximo 1 legendario** por equipo
- ✅ **IVs aleatorios** por partida
- ✅ **Prioridad + velocidad** efectiva
- ✅ **Filtros** por nombre y tipo en Pokédex
- ✅ **Reconexión** tras refresh
- ✅ **Temporizador** de selección (90s) y de ban (20s/turno)

---

## 📂 Estructura

```
.
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── index.ts            # Hono + Bun.serve + WebSocket upgrade
│   │   │   ├── db.ts               # Mongoose connection
│   │   │   ├── models/             # Pokemon, Move, Type, Room, Battle
│   │   │   ├── routes/             # pokemon, rooms, battles
│   │   │   ├── battle/
│   │   │   │   ├── formulas.ts     # HP, stats, damage, modifiers (PDF sec 5–6)
│   │   │   │   ├── types.ts        # Type chart loader & multiplier
│   │   │   │   └── engine.ts       # Turn resolver, status effects
│   │   │   ├── seed/pokeapi.ts     # Importer
│   │   │   ├── ws/hub.ts           # WebSocket broadcast
│   │   │   └── utils/              # rng, code generator
│   │   └── Dockerfile
│   └── frontend/
│       ├── src/
│       │   ├── routes/             # /, /room/$code
│       │   ├── components/         # BattleScene, BattleControls, BattleLog,
│       │   │                       # PokedexPicker, CoinFlip, HpBar, etc.
│       │   ├── lib/                # api, ws, session, types
│       │   └── styles/global.css
│       └── Dockerfile
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
└── PRD.md
```

---

## 🧪 Endpoints

### REST
| Método | Path | Descripción |
|---|---|---|
| POST | `/api/rooms` | Crear sala |
| POST | `/api/rooms/:code/join` | Unirse a sala |
| GET  | `/api/rooms/:code` | Estado de sala |
| POST | `/api/rooms/:code/ready` | Marcar listo |
| POST | `/api/rooms/:code/ban` | Banear pokémon |
| POST | `/api/rooms/:code/team` | Confirmar equipo |
| GET  | `/api/pokemon?q=&type=` | Lista filtrada |
| GET  | `/api/pokemon/:id` | Detalle + moves |
| GET  | `/api/pokemon/types/all` | Tipos disponibles |
| GET  | `/api/battles/:id` | Estado de batalla |
| POST | `/api/battles/:id/action` | Enviar acción `{type:'move'|'switch', ...}` |

### WebSocket
- `ws://localhost:3001/ws/rooms/:code?playerId=...`
- Eventos: `room:update`, `battle:start`, `battle:turn`, `battle:end`, `battle:action_received`

---

## 🎬 Demo recomendada

1. `docker compose up --build -d` (primera vez) o `docker compose up --no-build -d`
2. Sembrar BD (solo primera vez): `docker compose exec backend bun src/seed/pokeapi.ts`
3. Abrir 2 navegadores en `http://localhost:3000`
4. P1: Crear sala → copia código
5. P2: Unirse con el código
6. Ambos: **Listo** → empieza fase de **Ban** (3 c/u alternado)
7. Cada uno **selecciona 6 Pokémon** (timer 90s, máx 1 legendario)
8. **Coin flip animado** decide quién mueve primero
9. Combatir varios turnos: mostrar daño efectivo, crítico, estados
10. Cambiar Pokémon → estado se elimina
11. Llegar a victoria/derrota

---

## ⚠️ Limitaciones conocidas

- No hay **modo espectador** ni **replay de partidas** (descartado por scope de 1 semana).
- No hay **clima/campos completos**, aunque el modificador `fieldModifier=1` está en las fórmulas listo para extender.
- **Sonidos** no incluidos (la rúbrica no los exige).
- Los efectos de movimientos se derivan automáticamente de `meta.ailment` y `stat_changes` de PokéAPI; no cubre 100% de mecánicas raras (multi-hit, charge, etc.) — los moves se procesan como impacto único con efecto opcional.
- Reconexión requiere mismo navegador (sesión en localStorage); compartir el código entre dispositivos diferentes inicia jugadores nuevos.

---

## 📜 Licencia

Uso académico interno. Datos de Pokémon/sprites cortesía de [PokéAPI](https://pokeapi.co) y The Pokémon Company / Nintendo / Game Freak (no afiliado).
