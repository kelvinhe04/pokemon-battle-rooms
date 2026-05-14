# PRD — Pokémon Battle Rooms

**Versión:** 1.2
**Fecha:** 2026-05-13
**Autor:** Kelvin He
**Curso:** Desarrollo de Software (Soft 9)
**Modalidad:** Individual · 1 semana · Demo en clase
**Plataforma objetivo:** Desktop (web)

---

## 1. Visión del producto

Aplicación web de combate Pokémon **1v1 en tiempo real** entre dos jugadores conectados desde computadoras distintas mediante un sistema de **salas con código** (estilo Pokémon Showdown / Pokémon Unite lobby). El usuario crea una sala, comparte el código, su rival se conecta, ambos arman su equipo desde una **Pokédex interactiva con tiempo límite**, y se enfrentan en batallas por turnos resueltas en el servidor con datos reales de **PokéAPI**.

**Principios de diseño:**
- **UI/UX premium** — interfaz pulida tipo Showdown moderno, fluida y responsive.
- **Animaciones realistas y fluidas** — ataques, daño, switch, KO, barras de HP animadas tipo juego oficial.
- **Esencia Pokémon** — sprites consistentes, sonidos sugeridos, log de batalla narrado, paleta y tipografía del universo Pokémon.
- **Backend autoritativo** — el frontend nunca calcula daño ni decide turnos.

---

## 2. Stack tecnológico (obligatorio)

| Capa | Tecnología |
|---|---|
| Frontend | **TanStack Start** (React + SSR + file-based routing) |
| Runtime | **Bun** |
| Backend | **Hono** (sobre Bun) |
| Base de datos | **MongoDB** |
| Tiempo real | **WebSockets** (recomendado) o SSE como alternativa |
| Contenedores | **Docker + Docker Compose** |
| Gestor de paquetes | **pnpm** (NO usar npm — considerado comprometido) |
| Fuente de datos | **PokéAPI v2** (https://pokeapi.co/api/v2) |

> Nota: el PDF y los requisitos exigen TanStack Start (web), no React Native. Plataforma objetivo: **desktop browser**.

---

## 3. Alcance funcional

### 3.1 Sistema de salas (Lobby)
- Pantalla de **Crear sala** → genera código único corto (ej. `ABC123`, 6 caracteres alfanuméricos).
- Pantalla de **Unirse a sala** → input de código.
- **Lobby de espera** mostrando código copiable, jugador 1 listo, esperando jugador 2.
- Sin login: nombre temporal por sesión.
- Inicio cuando ambos jugadores marcan "Listo".
- **Reconexión** si se refresca el navegador (bonus, recomendado).

### 3.2 Selección de equipo (Pokédex Room)
- Vista tipo **Pokédex interactiva** con grid de los 300+ Pokémon importados.
- Filtros: por **nombre**, **tipo**, **generación**.
- Cada jugador selecciona **hasta 6 Pokémon** para su equipo.
- **Tiempo límite** de selección (ej. 90s) con cuenta regresiva visible.
- Al finalizar el tiempo o al confirmar, el equipo se bloquea.
- Cada Pokémon en batalla tiene **exactamente 4 movimientos** (ni más, ni menos) elegidos de su pool real de PokéAPI.
  - **Asignación:** automática server-side — top 4 por `power` (desempate por `accuracy`), siempre que sean utilizables (`damageClass` en physical/special/status válido). Esto asegura batallas balanceadas y elimina ambigüedad.
  - **Sin movimientos repetidos** dentro de los 4 (validado al asignar).
  - **Regla documentada para Pokémon con <4 movimientos válidos:** se **excluyen del catálogo de selección** durante el seed. Se loggea en consola y se documenta en README. Esto garantiza que ningún Pokémon en la Pokédex incumpla la regla de 4 moves.
- **Restricción opcional implementada:** máximo **1 legendario por equipo** (validado en server al confirmar equipo).
- Soporta **todas las evoluciones** (cadenas completas) gracias a `evolutionChainId` persistido.

### 3.3 Fase de Ban (bonus implementado, modo "Ranked")
- Antes de la selección, fase de **ban alternado**: cada jugador banea **3 Pokémon** (total 6 baneados).
- Los Pokémon baneados no aparecen en la Pokédex de selección.

### 3.4 Batalla 1v1
- **Coin flip inicial** visible y animado para decidir quién mueve primero en el **primer turno** (versión mínima del PDF).
- A partir del turno 2, **mejora opcional implementada (bonus):** orden por **prioridad del move → velocidad efectiva → coin flip si empate**.
- Cada turno, cada jugador elige **una de dos acciones**:
  1. **Atacar** (uno de los 4 movimientos del Pokémon activo)
  2. **Cambiar** Pokémon activo por otro vivo del equipo
- **No hay items, no hay huida.**
- **Validaciones obligatorias en el servidor antes de resolver el turno:**
  1. El jugador pertenece a la sala.
  2. El Pokémon activo está vivo (HP > 0).
  3. El movimiento elegido pertenece al Pokémon activo.
  4. El jugador no actuó ya en este turno (anti-doble-acción).
  5. Si es switch, el Pokémon objetivo está vivo y no es el activo.
- **El frontend nunca calcula daño**: solo envía decisión y renderiza estado emitido.
- **Victoria:** cuando los 6 Pokémon de un jugador quedan debilitados (HP = 0). Se emite `battle:end` con `winnerPlayerId` y se muestra **pantalla de victoria/derrota** con resumen.

### 3.5 Estados temporales
- Estados implementados: **parálisis, veneno, quemadura, baja-ataque, baja-defensa, baja-velocidad**.
- Duración: **3 turnos** (según PDF; rubrica obligatoria).
- Al **cambiar/retirar** el Pokémon, los estados temporales se eliminan.
- Indicador visual del estado en la UI sobre el Pokémon activo + entrada en log.

### 3.6 Motor de daño (servidor)
Implementado según fórmulas del PDF (sección 5–6):

```
level = 50
hp = floor(((2*baseHp + ivHp) * level)/100) + level + 10
stat = floor(((2*baseStat + ivStat) * level)/100) + 5

baseDamage = floor(floor(floor((2*level)/5 + 2) * power * atk / def) / 50) + 2
final = max(1, floor(baseDamage * randomFactor * STAB * typeMult * crit * burn))
```

- **Random factor:** `randInt(85,100)/100`
- **STAB:** 1.5 si el tipo del move coincide con el atacante
- **Type multiplier:** producto por cada tipo del defensor (x0, x0.5, x1, x2)
- **Crítico:** 1.5 si `random() < 1/24`
- **Burn:** 0.5 si atacante quemado y move físico
- **Tipos y relaciones de daño** obtenidos desde **PokéAPI `/type/`** y persistidos en MongoDB. **Prohibido hardcodear la tabla de tipos.**
- **Tipos duales del defensor:** los multiplicadores se **combinan multiplicando** (ej: eléctrico vs Agua/Volador = x2 * x2 = x4).
- **Precisión:** `hitRoll = randInt(1,100); hits = hitRoll <= move.accuracy`. Si falla, no se aplica daño ni efecto y el log muestra "¡Falló!".
- **Categoría de movimiento:**
  - `physical` → usa `attack` vs `defense`
  - `special` → usa `specialAttack` vs `specialDefense`
  - `status` → daño 0, solo aplica efecto
- **Log de batalla** debe indicar explícitamente cuando aplique:
  - `"¡Es súper efectivo!"` (typeMultiplier > 1)
  - `"No es muy efectivo..."` (typeMultiplier < 1 y > 0)
  - `"No tuvo efecto..."` (typeMultiplier === 0)
  - `"¡Un golpe crítico!"` (cuando aplique x1.5)
  - `"¡Falló!"` (cuando hitRoll falla)

### 3.7 Interfaz de batalla
- Pantalla split: **rival arriba** (sprite de espalda invertido si aplica → frente del rival), **jugador abajo** (sprite trasero).
- Barras de **HP animadas** (verde → amarillo → rojo) que decrecen suavemente.
- Tarjetas con: nombre, nivel, tipos, badge de estado.
- 4 botones de movimientos con: nombre, tipo (color), categoría (físico/especial/estado), poder, precisión.
- Botón **Cambiar Pokémon** → modal con los 6 del equipo + HP actual + estado.
- **Log de batalla** lateral narrado: *"Charizard usó Lanzallamas. ¡Es súper efectivo! Bulbasaur perdió 64 PS."*
- **Pantalla de victoria/derrota** con animación final.

### 3.8 Animaciones (objetivo: realista y fluido)
Inspiración: Pokémon Showdown moderno, Pokémon Stadium, sprites animados gen 5.

**Cinco animaciones mínimas exigidas por el PDF (obligatorias):**
1. **Atacar** — sprite del atacante se inclina/avanza + partículas según tipo del move.
2. **Recibir daño** — flash rojo + shake del sprite del defensor.
3. **Cambiar Pokémon** — sprite saliente entra a poké ball, sprite entrante aparece con bounce.
4. **Barra de vida** — decremento animado suave (tween), no salto instantáneo, color verde→amarillo→rojo.
5. **Debilitarse (KO)** — sprite cae/se desvanece hacia abajo + fade out.

**Animaciones adicionales (polish):**
- Entrada inicial del Pokémon (intro de batalla).
- Coin flip 3D animado al inicio.
- Texto flotante para críticos / súper efectivo.
- Transición entre turnos.

Librerías sugeridas: **Framer Motion** + CSS keyframes, o **GSAP** para timelines complejos.

### 3.9 Sprites
- Fuente única y consistente: `sprites.versions['generation-v']['black-white'].animated` desde PokéAPI cuando exista, fallback a `front_default` / `back_default`.
- **No mezclar** sprites 2D con renders 3D.

---

## 4. Modelo de datos (MongoDB)

```ts
// pokemon
{ _id, pokedexId, name, types: string[], baseStats: {hp,atk,def,spa,spd,spe},
  spriteFront, spriteBack, spriteAnimatedFront, spriteAnimatedBack,
  moveIds: number[], isLegendary: bool, evolutionChainId: number, generation: number }

// move
{ _id, name, type, power, accuracy, priority, damageClass: 'physical'|'special'|'status',
  effect: { kind, chance, stat?, stages?, status? } | null, pp }

// type
{ _id, name, doubleDamageTo: string[], halfDamageTo: string[], noDamageTo: string[],
  doubleDamageFrom: string[], halfDamageFrom: string[], noDamageFrom: string[] }

// room
{ _id, code, status: 'waiting'|'banning'|'picking'|'in_battle'|'finished',
  players: [{ id, name, ready, team: PokemonInstance[], bans: number[] }],
  createdAt, expiresAt }

// battle
{ _id, roomCode, turn: number, status, activePokemonIndex: {p1, p2},
  pendingActions: { p1?, p2? }, battleLog: LogEntry[],
  rngSeed, winnerPlayerId? }

// pokemonInstance (en battle)
{ pokedexId, level: 50, ivs, currentHp, maxHp,
  battleStats: {atk,def,spa,spd,spe},
  statStages: {atk:0,def:0,...},
  moves: [{moveId, ppLeft}],
  status?: { kind, remainingTurns: 3 } }
```

---

## 5. Endpoints (Hono)

### REST
- `POST /api/rooms` → crear sala, devuelve código
- `POST /api/rooms/:code/join` → unirse
- `GET /api/rooms/:code` → estado de sala
- `POST /api/rooms/:code/ready` → marcar listo
- `POST /api/rooms/:code/ban` → banear pokémon
- `POST /api/rooms/:code/team` → confirmar equipo
- `POST /api/battles/:id/action` → enviar acción `{type:'move'|'switch', payload}`
- `GET /api/pokemon` → catálogo paginado / filtrado
- `GET /api/pokemon/:id` → detalle

### WebSocket
- `ws://.../rooms/:code` → eventos: `room:update`, `battle:turn`, `battle:log`, `battle:end`

---

## 6. Importación desde PokéAPI

- **Script de seed** ejecutado en arranque o vía comando (`bun run seed`).
- Importa **300+ Pokémon** (limit=300).
- Para cada uno guarda: id, nombre, tipos, stats base, sprites, lista de movimientos.
- Importa **todos los tipos** y sus relaciones de daño.
- Importa **movimientos** referenciados (precisión, poder, prioridad, categoría, efectos).
- Marca `isLegendary` consultando `/pokemon-species/`.
- Guarda `evolutionChainId` para soporte de "todas las evoluciones".
- **Cacheado**: si la BD ya tiene datos, no re-importar.
- Documentar en README.

---

## 7. Pantallas (flow)

```
[Home] → Crear sala / Unirse
   ↓
[Lobby] (código + jugadores + Listo)
   ↓
[Ban Phase] (alternado, 3 bans c/u, timer)
   ↓
[Pokédex Pick] (timer 90s, hasta 6, max 1 legendario)
   ↓
[Coin Flip] (animación)
   ↓
[Battle] (turnos, log, animaciones)
   ↓
[Victory/Defeat] (resumen + volver al inicio)
```

---

## 8. Rúbrica vs cobertura

| Criterio (PDF) | Pts | Cobertura |
|---|---|---|
| Carga PokéAPI + MongoDB | 15 | ✅ Sec 6 |
| Catálogo 300 Pokémon | 15 | ✅ Sec 3.2 |
| Salas 1v1 con código | 15 | ✅ Sec 3.1 |
| Motor de batalla | 25 | ✅ Sec 3.4–3.6 |
| Vulnerabilidades por tipo | 10 | ✅ desde PokéAPI |
| UI / sprites / animaciones | 10 | ✅ Sec 3.7–3.9 |
| Docker + README + demo | 10 | ✅ Sec 9 |
| **Bonus** (hasta +10) | +10 | Ban, legendarios, evoluciones, reconexión, prioridad |

---

## 9. Entregables

- Repositorio del proyecto (monorepo o split front/back).
- `docker-compose.yml` con servicios: `frontend`, `backend`, `mongo`.
- `README.md` con: descripción, stack, cómo correr (`docker compose up`), proceso de seed, reglas implementadas, limitaciones.
- Script de importación PokéAPI documentado.
- Demo lista para correr en clase desde dos navegadores.

---

## 10. Plan de trabajo (1 semana)

| Día | Foco |
|---|---|
| 1 | Setup monorepo, Docker, Mongo, Hono base, TanStack Start base, esquemas |
| 2 | Script de importación PokéAPI + persistencia + Pokédex UI |
| 3 | Sistema de salas + WebSocket + lobby + ban phase |
| 4 | Selección de equipo + coin flip + estado de batalla server |
| 5 | Motor de daño + estados + tipos + log |
| 6 | UI de batalla + animaciones + sprites + polish |
| 7 | Bug fixing, README, docker-compose final, ensayo de demo |

---

## 11. Decisiones tomadas (cerradas)

| # | Decisión | Valor |
|---|---|---|
| 1 | Movimientos por Pokémon | Auto-asignados top-4 por `power` server-side (sin duplicados) |
| 2 | Tiempo de selección de equipo | **90 segundos** |
| 3 | Tiempo fase de ban | **20s por turno de ban** (6 turnos alternados) |
| 4 | Tema visual | Moderno tipo Showdown 2024 + sprites animados gen-5 |
| 5 | Sonidos | Efectos básicos (ataque, KO, click) + música de batalla opcional |
| 6 | Reconexión | Implementada como bonus (refresh recupera sesión por código) |
| 7 | Estados temporales | Duran **3 turnos** (cumple rúbrica PDF) |
| 8 | Orden de turno | Coin flip turno 1 + prioridad/velocidad turnos siguientes |

---

## 12. Checklist final contra rúbrica PDF

### Requisitos funcionales obligatorios (sección 4 PDF)
- [x] 1. Catálogo de **300+ Pokémon** con sprites consistentes
- [x] 2. **Exactamente 4 movimientos** por Pokémon, sin repetidos, desde PokéAPI
- [x] 2. Regla documentada para Pokémon con <4 moves válidos (exclusión)
- [x] 3. Sistema de salas: crear, código único, unirse, lobby, inicio
- [x] 3. Sin login, nombres temporales
- [x] 4. Batalla 1v1, hasta 6 Pokémon por equipo, 1 activo
- [x] 4. Partida termina cuando los 6 de un jugador están KO
- [x] 5. Acciones: mover (1 de 4) o cambiar
- [x] 5. Validaciones server: pertenencia, vivo, move válido, anti-doble
- [x] 5. Frontend no calcula daño
- [x] 6. Coin flip (mínimo) + prioridad/velocidad (bonus)
- [x] 7. Daño calculado en backend
- [x] 7. Efectividad desde PokéAPI (no hardcodeada)
- [x] 7. Multiplicadores combinados para tipos duales
- [x] 7. Log indica súper efectivo / poco efectivo / sin efecto
- [x] 8. Estados duran **3 turnos**
- [x] 8. Estado visible en UI + en log
- [x] 8. Cambio/retiro elimina estado temporal
- [x] 8. Ejemplos: parálisis, veneno, quemadura, baja-atk/def/spe
- [x] 9. Pantalla crear sala / unirse / lobby / batalla
- [x] 9. Selección de equipo
- [x] 9. UI batalla: sprites, tipos, barras HP, 4 botones
- [x] 9. Botón cambiar Pokémon
- [x] 9. Log de batalla + mensaje victoria/derrota
- [x] 9. **5 animaciones obligatorias** (atacar, daño, cambiar, barra HP, KO)

### Fórmulas (sección 5–6 PDF)
- [x] `level=50`, IVs random 0-31 al iniciar partida (no recalcular)
- [x] Fórmula HP y stats con IVs
- [x] Modificadores de stats con stages [-6, +6]
- [x] Stages se eliminan al cambiar/retirar
- [x] Fórmula de daño completa (baseDamage + modifier)
- [x] STAB 1.5, random 85-100, crítico 1/24 = 1.5
- [x] Quemadura 0.5 en moves físicos
- [x] `damage >= 1` (max(1, floor(...)))

### Requisitos técnicos (sección 7 PDF)
- [x] Backend: crear/unir salas, validar, resolver turnos, calcular daño, ganador, endpoints
- [x] Frontend: pantallas, acciones, render, actualización (WebSocket)
- [x] BD: Pokémon, Move, Type, Room, Battle, Log

### Stack obligatorio
- [x] TanStack Start · Bun · Hono · MongoDB · Docker Compose

### Fuente de datos
- [x] PokéAPI v2, persistido en MongoDB, no hardcodeado
- [x] Endpoints documentados (`/pokemon`, `/move`, `/type`)

### Entregables (sección 9 PDF)
- [x] Repositorio
- [x] README con descripción, run, reglas, fuente, limitaciones
- [x] `docker-compose.yml` funcional
- [x] Script/proceso de importación documentado
- [x] App funcional 1v1 completa
- [x] Demo en clase

### Bonus implementados (sección 8 PDF, hasta +10 pts)
- [x] **Baneo** de Pokémon antes de partida (fase ban alternada)
- [x] **IVs aleatorios** por partida
- [x] **Prioridad + velocidad** efectiva en orden de turno
- [x] **Filtros** por nombre y tipo en Pokédex
- [x] **Reconexión** a sala tras refresh
- [x] **Temporizador** por turno de selección
- [x] **1 legendario máx** por equipo (regla competitiva)

### Demo en clase (sección 10 PDF) — script de presentación
1. `docker compose up` → levanta el proyecto
2. Crear sala, copiar código
3. Segundo navegador se une con código
4. Iniciar partida (ban + pick + coin flip)
5. Mostrar Pokémon con sprites consistentes y 4 movimientos exactos
6. Ejecutar varios turnos
7. Demostrar daño súper efectivo / poco efectivo
8. Aplicar estado temporal de 3 turnos
9. Cambiar Pokémon y mostrar que el estado se elimina
10. Llegar a victoria/derrota

---

**Fin del PRD v1.2 — alineado 100% con rúbrica del PDF**

---

## 13. Revisión final de alineación con PDF (sign-off)

Verificado punto por punto contra `Proyecto_Pokemon_Battle_Rooms_UTP_FISC_sin_cuadro_proyecto_indiv.pdf`:

| Sección PDF | Cubierto en PRD | Estado |
|---|---|---|
| 1. Instrucciones principales (10 bullets) | Secs 2, 3.1–3.9, 6 | ✅ |
| 2. Enunciado + objetivos | Sec 1, 3 | ✅ |
| 3. PokéAPI como fuente | Sec 6 | ✅ |
| 4.1 Catálogo (300 Pokémon) | Sec 3.2 | ✅ |
| 4.2 Movimientos (4 exactos, sin repetir, regla excepción) | Sec 3.2 | ✅ |
| 4.3 Sistema de salas | Sec 3.1 | ✅ |
| 4.4 Formato 1v1 / 6 / activo / fin | Sec 3.4 | ✅ |
| 4.5 Turnos + 5 validaciones server | Sec 3.4 | ✅ |
| 4.6 Coin flip + (bonus) prioridad/velocidad | Sec 3.4 | ✅ |
| 4.7 Daño backend + tipos PokéAPI + log efectividad | Sec 3.6 | ✅ |
| 4.8 Estados 3 turnos + cambio limpia | Sec 3.5 | ✅ |
| 4.9 UI + 5 animaciones obligatorias | Sec 3.7, 3.8 | ✅ |
| 5. Fórmulas (HP, stat, stages, daño, modifiers) | Sec 3.6 | ✅ |
| 6. Fórmulas complementarias (categoría, tipos, estados pasivos) | Sec 3.6, 3.5 | ✅ |
| 7. Requisitos técnicos (back, front, BD) | Secs 4, 5 | ✅ |
| 8. Bonus opcionales | Sec 11, 12 | ✅ (7 implementados) |
| 9. Entregables | Sec 9 | ✅ |
| 10. Demo en clase | Sec 12 (script) | ✅ |
| 11. Rúbrica 100 pts + 10 bonus | Sec 8 | ✅ |

**Conclusión:** PRD cubre el 100% de requisitos obligatorios + 7 de los 10 bonus listados. Bonus no incluidos (decisión consciente): items, clima/campos completos, historial/replay, modo espectador — no críticos para rúbrica, descartados por tiempo (1 semana).

**Listo para comenzar implementación.**
