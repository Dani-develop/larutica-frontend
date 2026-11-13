# Pendientes de la entrega

Corte: **2026-11-13, tarde (hora de Costa Rica)**. Entrega: hoy, 23:59.
Ningún ítem está en **Listo**. Un ítem pasa a Listo solo cuando el revisor reprodujo la evidencia.
Los ítems restantes los completó Frander en la ventana final; las revisiones y firmas siguen siendo de cada revisor.

## Hecho en esta ventana

- Ramas unidas: `main` incluye `seg/entrega-unificada` (PR #55). Ya no existe `development`.
- Verificación local sobre `10e90b8` (Node 24.22.0): `runtime:check`, `design:check`, TypeScript, lint (0 avisos `react-hooks`), build, `npm test` (autorización 8/8) y E2E 19/19, todo en verde.
- CI en `FranderCT/larutica-frontend-entrega`, SHA `981b084`:
  - [Seguridad 43522557908](https://github.com/FranderCT/larutica-frontend-entrega/actions/runs/43522557908): éxito; OSV 0, Semgrep 0, Gitleaks 0 (cierra la evidencia de H-06).
  - [Validar proyecto 43522569864](https://github.com/FranderCT/larutica-frontend-entrega/actions/runs/43522569864): éxito en Ubuntu, Windows y E2E (19 pruebas); incluye `test:authorization` 8/8.
  - [ZAP 43522573780](https://github.com/FranderCT/larutica-frontend-entrega/actions/runs/43522573780): **incompleta**, sin secrets `ZAP_USER` y `ZAP_PASSWORD`; no hay reporte.
- Decisiones humanas de Frander (2026-11-13): H-02 falso positivo cerrado; AI-01 resuelta; AI-02 limitación aceptada.
- Fichas actualizadas: 1.1, 1.3, 2.3, 2.6, 3.1, 3.5, 4.4, 4.5, 5.6, 6.5, 7.5, 7.6 y `entrega-profelink.md`.

## Por ítem (lo que falta)

- **1.1** — Daniel Núñez revisa y firma. Q-01 sigue abierta. Verificar los tres ajustes pedidos en la primera revisión del PR #10.
- **1.3** — Axel revisa y firma.
- **2.3** — Frander revisa. El dueño del relay confirma entropía y que el token no se expuso (H-03); confirmar que la clave de `abcccf6` solo fue de pruebas (H-04).
- **2.6** — Pablo revisa. AI-03: abrir el JSON en Threat Dragon 2.6.2, comprobar T-01 a T-07 y regenerar el PNG.
- **3.1** — Pablo revisa y firma. Enlazar la corrida de Actions sobre el SHA final.
- **3.2** — Axel reproduce y firma.
- **3.5** — El dueño del repositorio activa el ruleset (existe, pero está en `enforcement: disabled`); guardar evidencia de un PR bloqueado; Axel firma. Fijar por SHA las acciones de `zap.yml`.
- **4.4** — Daniel revisa el PR #11 (sin revisión) y firma.
- **4.5** — Frander reproduce `npm run test:authorization` y firma las casillas.
- **4.7** — Crear los secrets `ZAP_USER` y `ZAP_PASSWORD` con una cuenta de prueba, ejecutar ZAP y guardar el reporte HTML (H-01). Daniel Núñez revisa.
- **5.3** — Rehacer sobre el SHA final de entrega; Daniel confirma y firma.
- **5.6** — Pablo firma. Las solicitudes #38 (H-03) y #39 (H-04) siguen sin aprobación humana, responsable ni fecha. Retirar la #40 (H-06 ya corregido).
- **6.5** — El smoke test falla en `main` (`tests/vercel/navigation.spec.ts` busca «← Volver a LaRutica»; el PR #56 lo corregía). Confirmar el SHA desplegado en Vercel, lanzar el workflow y conservar artefactos. Solo con cuentas de prueba. Daniel revisa.
- **7.5** — Frander marca «afirmaciones respaldadas» y «observaciones resueltas» al revisar.
- **7.6** — Falta el reescaneo programado (`cron`): no existe en ningún workflow; el PR #56 traía la propuesta. Daniel Núñez firma.

## Hallazgos

- [ ] **H-01.** Abierto: ZAP autenticado sin ejecución exitosa (faltan secrets de prueba).
- [x] **H-02.** Cerrado: falso positivo, decisión de Frander.
- [ ] **H-03.** Abierto: el dueño confirma la entropía del token o se rota.
- [ ] **H-04.** Corregido en código; falta confirmar que la clave del historial solo era de pruebas.
- [x] **H-05.** Corregido (0 avisos, reglas en *error*; lint verde en CI). Axel cierra el Issue #34.
- [x] **H-06.** Corregido con evidencia de CI (OSV 0 sobre `981b084`). Axel cierra el Issue #33.
- [ ] **H-07.** Abierto parcial: AI-03 pendiente de verificación manual y revisión de Pablo.

## Decisiones abiertas (Frander)

- Repositorio de entrega: `FranderCT/larutica-frontend-entrega` (su `main` está en `981b084`) o `Dani-develop/larutica-frontend` (`10e90b8`). El código difiere solo en `lib/preferences/messages.ts`.
- Subir la rama `seg/cierre-entrega` y abrir PR.
- Llevar a la rama el arreglo del smoke y el `cron` del PR #56.

## Entrega en Profelink

- [ ] Enlace al repositorio público.
- [x] Alcance y responsabilidades (borrador en [entrega-profelink.md](entrega-profelink.md)).
- [x] Cómo se repartió el trabajo (borrador).
- [ ] Evidencias enlazadas desde cada ítem: enlazadas; faltan las de ZAP, post-despliegue y ruleset.

## Firmas que faltan

| Revisor | Ítems sin firmar |
|---|---|
| Daniel Núñez | 1.1, 4.7, 7.6 |
| Frander | 2.3, 4.5, 7.5 |
| Daniel | 4.4, 5.3, 6.5 |
| Axel | 1.3, 3.2, 3.5 |
| Pablo | 2.6, 3.1, 5.6 |
