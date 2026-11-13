# Guía para presentar el proyecto

Proyecto final de desarrollo seguro de software · LaRutica (frontend). Esta guía sirve para dos momentos: la **entrega en Profelink** y la **defensa individual** (10 % de la nota). La sección 5 es la de Frander; las demás son comunes al equipo.

> Los tiempos de abajo son una propuesta. Ajustarlos a lo que indique el docente para la defensa.

---

## 1. Mensaje central (30 segundos)

> «LaRutica maneja credenciales, dinero y datos personales de pasajeros. Aplicamos seguridad en las siete fases del ciclo de desarrollo: definimos los flujos críticos y las amenazas, automatizamos análisis y pruebas en cada PR, y registramos cada hallazgo con su estado real. Lo que no pudimos cerrar lo decimos con su evidencia y su responsable.»

Tres ideas que repetir durante toda la presentación:

1. **Trazabilidad:** flujo crítico (1.1) → amenaza (1.3) → prueba (4.4 / 4.5) → hallazgo (7.5).
2. **Automatización:** todo corre en CI, con el mismo comando que se corre en local.
3. **Honestidad:** una ejecución ausente se reporta como incompleta, nunca como aprobada.

---

## 2. Estructura sugerida (equipo, ~10 min)

| Min | Bloque | Qué se muestra | Fuente |
|---|---|---|---|
| 0–1 | Contexto | Qué es LaRutica y por qué importa su seguridad | Mensaje central |
| 1–3 | Planificación | 3 flujos críticos y modelo STRIDE (Threat Dragon) | 1.1, 1.3 |
| 3–5 | Desarrollo y CI | Semgrep, Gitleaks, OSV; revisión con IA; CI por PR | 2.3, 2.6, 3.1, 3.2, 3.5 |
| 5–7 | Pruebas | E2E, autorización por rol, DAST con ZAP | 4.4, 4.5, 4.7 |
| 7–9 | Versión y operación | Resumen de cambios, excepciones, registro único, Renovate, post-despliegue | 5.3, 5.6, 6.5, 7.5, 7.6 |
| 9–10 | Estado honesto | Qué quedó abierto (H-01, H-03, H-06, H-07) y qué falta para cerrarlo | `pendientes.md` |

Reparto: cada integrante presenta sus 3 ítems (tabla «Reparto» en `README.md`).

---

## 3. Antes de presentar (checklist)

**Repositorio y entrega**
- [ ] `main` y `development` unidas en la rama de entrega; el SHA final anotado.
- [ ] 5.3 rehecho sobre ese SHA (la ficha actual cita `94f5a19`; los commits posteriores cambiaron código, así que ya no describe el candidato).
- [ ] Repositorio público y enlace verificado desde una ventana de incógnito.
- [ ] Ninguna ficha, captura o log contiene secretos, tokens ni datos reales.

**Evidencia**
- [ ] Cada ítem enlaza PR, corrida de Actions y commit.
- [ ] Los revisores reprodujeron la evidencia y firmaron (un check verde no reemplaza la firma).
- [ ] `docs-proyecto-seguridad/pendientes.md` refleja el estado real de hoy.

**Entrega en Profelink**
- [ ] Enlace al repositorio público.
- [ ] Alcance y responsabilidades de cada integrante.
- [ ] Cómo se repartió el trabajo (tabla «Reparto»).
- [ ] Evidencias enlazadas desde cada ítem.

**Equipo para la demo**
- [ ] `npm ci` hecho y `npx playwright install chromium` ejecutado.
- [ ] `npm run build:vercel` ya corrido (la demo E2E lo necesita).
- [ ] Pestañas abiertas: el run verde de Actions, el PR, el reporte HTML.
- [ ] Plan B: capturas o el artefacto `e2e-flujos-criticos-<sha>` por si falla la red.

---

## 4. Estado real por hallazgo (para no sobrevender)

Fuente: `docs/security/hallazgos-h01-h07.md` y `pendientes.md`. Verificar contra el estado de GitHub Issues el día de la defensa.

| ID | Qué es | Estado | Qué decir |
|---|---|---|---|
| H-01 | DAST autenticado (ZAP) | Abierto | «El workflow existe, pero no hay una corrida exitosa; falla en `spiderAjax`. Se cierra con un run y su reporte HTML.» |
| H-02 | AAGUID de passkeys detectado por Gitleaks | Falso positivo verificado | Son identificadores públicos del modelo de autenticador. Excepción acotada por regla + archivo + forma del valor. |
| H-03 | Huella SHA-256 del token del relay | Falso positivo verificado; pendiente confirmar | Es el hash, no el token. El dueño debe confirmar que se generó con entropía; si no, se rota. |
| H-04 | Clave privada de pruebas localhost | Corregido | Se eliminó del repositorio; el TLS de pruebas ahora es efímero. La clave sigue en el historial de Git (era solo de pruebas). |
| H-05 | 72 avisos `react-hooks` | Corregido en la rama de entrega | 0 avisos y las reglas volvieron a *error*. Ojo: la ficha 3.1 y `hallazgos-h01-h07.md` aún describen versiones anteriores; alinearlas. |
| H-06 | SCA (dependencias) | Corregido en local; falta CI | `npm audit` en 0 y OSV local en 0. Falta la corrida de OSV en CI sobre el SHA final. |
| H-07 | Observaciones de la revisión con IA | Pendiente de decisión humana | AI-01 y AI-03 dependen de Pablo; AI-02 es limitación de alcance (la traza vive en el backend). |

Frase útil: *«No marcamos Listo sin evidencia reproducida por otra persona.»*

---

## 5. Guion de Frander (3 ítems, ~4–5 min + preguntas)

### 5.1 Ítem 1.1 — Flujos críticos (~1 min)

**Qué decir**
- Elegimos tres flujos por el dato o el impacto que manejan:
  - **F-01** inicio de sesión y acceso por rol → credenciales, sesiones, escalada de privilegios.
  - **F-02** compra y pago → dinero; riesgo de cobro sin reserva, sobreventa, cobro duplicado.
  - **F-03** consulta y cancelación → datos personales de pasajeros y devoluciones.
- 18 criterios Dado/Cuando/Entonces con tres tipos: éxito (`C`), error (`E`) y uso indebido (`A`).
- Dejamos fuera liquidaciones y publicaciones: también son sensibles, pero encajan mejor como ampliación.

**Idea clave:** las reglas son *observadas* en el código, no *aprobadas*. Las dudas Q-01 a Q-03 las decide una persona:
- **Q-01:** `assertCanConfirm` permite pasar una reserva `PENDING` a `CONFIRMED` por API sin cobro verificado (contradiría F-02).
- **Q-02:** si agencia o Admin pueden cancelar la reserva de un viajero.
- **Q-03:** si Transporte debe abrir `/dashboard/my-agency`.

**Cómo mostrar la trazabilidad (ejemplo F02-A2):** abrir la tabla «Trazabilidad» de 1.1 → `tests/e2e/f02-compra-pago.spec.ts` → buscar el texto `F02-A2`.

**Pendiente antes de presentar:** anotar el PR #10 y la aprobación de Daniel Núñez, cerrar Q-02 y Q-03 con lo que decidió 4.5, y completar Resultados.

### 5.2 Ítem 3.1 — CI por PR (~1,5 min)

**Qué decir**
- `.github/workflows/validate.yml` corre en cada PR hacia `main` y `development`.
- Orden: `npm ci` (desde el lockfile) → runtime y diseño → lint → `tsc` → `npm test` (incluye build, contratos, pagos y correo). Job aparte `E2E flujos críticos`.
- Checks que Pablo usa como obligatorios en 3.5: `Node 24 / ubuntu-latest`, `Node 24 / windows-latest`, `E2E flujos críticos`. **Si se renombran, hay que actualizar la protección de rama.**
- Si el job E2E no deja reporte, **falla** (`if-no-files-found: error`): un E2E sin resultado no cuenta como aprobado.
- Sin secretos: `permissions: contents: read` y `persist-credentials: false`; credenciales ficticias y Onvo simulado.

**Historia para contar:** el lint estaba en 1 227 errores; 1 149 venían de una copia generada de MapLibre. Se ignoró lo generado en vez de silenciar reglas, y luego los avisos de `react-hooks` se corrigieron de verdad (H-05).

**Segunda historia:** `renderiza /dashboard/reviews` ya fallaba en `main` (la página redirige a `/dashboard/publications` desde el commit `5ba2e2d`). Se comprobó en un worktree limpio de `main`; se corrigió la prueba porque el commit que retiró la sección demuestra que la redirección es intencional. Además, ese fallo impedía correr las suites de pagos y correo por el `&&` de la cadena.

**Limitación a decir tú primero:** no se probó que un check fallido *bloquee* la fusión; eso depende de los rulesets de 3.5.

### 5.3 Ítem 4.4 — E2E con Playwright (~1,5 min)

**Qué decir**
- 19 pruebas en `tests/e2e/`: F-01 (6), F-02 (7), F-03 (6). El ID del criterio va al inicio del nombre de cada prueba.
- Qué recorre: navegador → interfaz → API real → PostgreSQL embebido (PGlite). `GET /__qa/reset` restaura la base antes de cada prueba.
- Qué está simulado, dicho sin que lo pregunten:
  - F-01 usa un servicio de sesión simulado (no prueba la contraseña real ni la cookie `HttpOnly`).
  - El pago usa el SDK de Onvo simulado (sin 3DS, webhooks ni devolución real).
  - La identidad en la API se simula con `x-qa-actor`.
- Todo host distinto de `127.0.0.1` se bloquea: no hay red externa.

**Cómo sabes que una prueba puede fallar (pregunta típica):** en F03-A1 hay un control positivo: primero la dueña ve su reserva (200) y después otra persona recibe 403/404. Antes, `seed-paid` devolvía el id del *checkout* y F03-A1/A3 pasaban comprobando nada (404 por id inexistente). Se detectó, se corrigió el fixture y se añadió el control.

**Qué cambió en 1.1 por una prueba:** F01-A2 falló porque asumí que una Agencia con un `next` de viajero iba a `/dashboard`. La regla documentada dice que todos los roles pueden comprar; se verificó, se añadió F01-C3 y se creó una prueba de abuso distinta (`//evil.invalid/`).

### Demo en vivo (2 min, opcional)

```bash
npm run test:e2e          # arranca API + interfaz aisladas, corre 19 pruebas (~20 s)
npx playwright show-report
```

Mostrar después el run de Actions en verde y el artefacto `e2e-flujos-criticos-<sha>`.

Resultado esperado de la demo: `19 passed`. Si falla en vivo, decirlo y pasar al artefacto del run verde.

---

## 6. Como revisor: lo que debes poder explicar

Revisas **2.3, 4.5 y 7.5**. El docente puede preguntar qué reprodujiste.

| Ítem | Qué reproducir | Qué verificar |
|---|---|---|
| 2.3 (Daniel) | `npm run security:secrets` | `no leaks found`; las excepciones de `.gitleaks.toml` exigen regla + ruta + forma del valor a la vez. Anotar que `install.sh` solo corre en Linux/WSL. |
| 4.5 (Daniel Núñez) | `npm run test:authorization` | Los rechazos no leen ni modifican datos ajenos; resultado 8/8 en CI. |
| 7.5 (Axel) | Abrir el registro único | Una sola ficha; H-01 a H-07 con estado explícito; las afirmaciones tienen evidencia. |

Marca las casillas de la ficha solo después de reproducir. Si no pudiste, anótalo.

---

## 7. Resumen de lo que hizo cada compañero (para responder preguntas cruzadas)

| Integrante | Ítems | Una línea |
|---|---|---|
| Daniel | 2.3, 3.2, 5.6 | Semgrep + Gitleaks local y en CI, OSV, y registro de excepciones acotadas. |
| Frander | 1.1, 3.1, 4.4 | Flujos críticos, CI por PR y E2E trazables a los criterios. |
| Daniel Núñez | 1.3, 4.5, 5.3 | STRIDE con Threat Dragon, pruebas de autorización y resumen de la versión. |
| Axel | 2.6, 4.7, 7.5 | Revisión de código con IA, DAST con ZAP y registro único de hallazgos. |
| Pablo | 3.5, 6.5, 7.6 | Protección de ramas, comprobaciones post-despliegue y Renovate. |

---

## 8. Preguntas probables y respuesta corta

**¿Por qué estos tres flujos y no otros?**
Por el dato que mueven: credenciales (F-01), dinero (F-02), datos personales y devoluciones (F-03). Los demás requieren Admin o Agencia y caben como ampliación.

**¿Qué diferencia hay entre «observada» y «aprobada»?**
Observada: lo que hace el código hoy. Aprobada: validada por una persona. Q-01 a Q-03 están sin aprobar porque no quise asumir la respuesta.

**¿Qué prueban realmente los E2E y qué no?**
Prueban formulario, API y base aislada. No prueban Supabase Auth real, 3DS, webhooks ni devoluciones reales de Onvo.

**¿Un PR verde significa que el candidato está listo?**
No. Cada corrida debe corresponder al SHA final, y falta la firma del revisor. El job de seguridad ya fallaba en OSV antes de corregir las dependencias.

**¿Qué falta para publicar?**
Corrida de OSV en CI sobre el SHA final (H-06), una corrida exitosa de ZAP (H-01), corrida de post-despliegue contra Vercel (6.5), rulesets activos en `main` y `development` (3.5) y las firmas pendientes.

**¿Por qué no silenciaron los avisos de lint con `eslint-disable`?**
Porque ocultan la deuda. Primero se bajaron a *warn* con la deuda visible y después se corrigieron; no se añadió ningún `eslint-disable`.

**¿Qué haría distinto con más tiempo?**
Probar la sesión real con cookie `HttpOnly`, cubrir 3DS y devoluciones en sandbox, probar la cancelación con la salida ya iniciada controlando el reloj, y comprobar que un check rojo bloquee la fusión.

---

## 9. Reglas de oro de la defensa

1. Empieza por el riesgo y termina con la evidencia; no leas el código línea por línea.
2. Di las limitaciones antes de que te las pregunten.
3. Cada afirmación lleva un enlace: PR, commit, run de Actions o archivo.
4. Si no sabes algo, di qué documento lo responde y dónde está.
5. No digas «terminado» sobre algo que no corrió en CI ni reprodujo el revisor.
6. Nunca muestres secretos, tokens ni datos reales en pantalla.
