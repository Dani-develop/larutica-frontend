# Pendientes de la entrega

Corte: **2026-11-13, 14:29 (hora de Costa Rica)**. Entrega: hoy, 23:59.
Ningún ítem está en **Listo**. Un ítem pasa a Listo solo cuando el revisor reprodujo la evidencia.

## Juntar el candidato

`main` y `development` se separaron después del PR #28. Hay que volver a unirlas antes de entregar.

- [ ] Traer a la rama de entrega lo que está solo en `development`: 3.2, 5.6, 7.6 y el parche del PR #41 (H-02 a H-05 y el RCE de React).
- [ ] Traer a la rama de entrega lo que está solo en `main`: 4.7, 7.5 y los PR de Renovate ya fusionados. En `development` esas fichas quedaron vacías.

## Por ítem

### 1.1 Flujos críticos — Frander · revisor Daniel Núñez

- [ ] Anotar en la ficha el PR #10 y la aprobación de Daniel Núñez.
- [ ] Cerrar Q-02 y Q-03 con lo que ya decidió 4.5.
- [ ] Completar Resultados y las tres casillas de revisión.

### 1.3 Modelo STRIDE — Daniel Núñez · revisor Axel

- [ ] Axel abre el modelo, revisa impacto y mitigaciones, y firma la ficha.

### 2.3 Semgrep y Gitleaks — Daniel · revisor Frander

- [ ] Documentar que `install.sh` solo corre en Linux/WSL.
- [ ] El dueño del relay confirma entropía y que el token no se expuso, y lo registra en 7.5.
- [ ] Confirmar que la clave localhost del commit `abcccf6` solo se usó en pruebas, y registrarlo en 7.5.
- [ ] Enlazar el PR #18 en la tabla de evidencia.

### 2.6 Revisión con IA — Axel · revisor Pablo

- [ ] Pablo decide AI-01, AI-02 y AI-03 (H-07) con evidencia.
- [ ] Marcar los requisitos y la revisión en la ficha.

### 3.1 CI por PR — Frander · revisor Pablo

- [ ] Anotar la corrida verde de Actions y la aprobación de Pablo (PR #12).
- [ ] Registrar la excepción de los 72 avisos `react-hooks` en 7.5 y 5.6 (H-05).

### 3.2 Análisis en CI — Daniel · revisor Axel

- [ ] Llevar el ítem a la rama de entrega (hoy solo está en `development`).
- [ ] Axel reproduce la evidencia y firma. El PR quedó en borrador.

### 3.5 Protección de ramas — Pablo · revisor Axel

- [ ] El dueño del repositorio activa los rulesets de `main` y `development`: PR obligatorio, aprobación de otra persona, revisión de CODEOWNERS y estos checks: `Node 24 / ubuntu-latest`, `Node 24 / windows-latest`, `E2E flujos críticos`.
- [ ] Guardar evidencia de un PR bloqueado.
- [ ] Axel firma.

### 4.4 E2E — Frander · revisor Daniel

- [ ] Anotar la corrida de Actions en la ficha.
- [ ] Daniel revisa el PR #11 (hoy no tiene ninguna revisión).

### 4.5 Autorización — Daniel Núñez · revisor Frander

- [ ] Frander corre `npm run test:authorization` y comprueba que los rechazos no leen ni modifican datos ajenos.
- [ ] Frander firma las tres casillas.
- [ ] Asociar una corrida de Actions que sí llegue a esta suite.

### 4.7 DAST con ZAP — Axel · revisor Daniel Núñez

- [ ] Ejecutar el workflow en Actions contra el ambiente aislado y guardar el reporte HTML (H-01).
- [ ] Daniel Núñez revisa.
- [ ] Llevar la ficha completa a la rama unificada.

### 5.3 Resumen de la versión — Daniel Núñez · revisor Daniel

- [ ] Rehacer el resumen sobre el commit final, ya unidas las ramas.
- [ ] Daniel confirma que cada PR y cada corrida citada pertenecen a ese SHA, y firma.

### 5.6 Excepciones — Daniel · revisor Pablo

- [ ] Llevar el ítem a la rama de entrega (hoy solo está en `development`).
- [ ] Cada excepción abierta existe en el registro 7.5, con hallazgo, versión, evidencia, justificación, responsable, aprobación humana y fecha de revisión.
- [ ] Pablo firma.
- [ ] Una credencial real se rota; no basta con borrarla.

### 6.5 Post-despliegue — Pablo · revisor Daniel

- [ ] Ejecutar el workflow contra Vercel con la URL y el commit desplegado.
- [ ] Conservar health check, smoke test y artefactos.
- [ ] Daniel revisa.
- [ ] E2E, autorización y ZAP sobre ese destino solo con cuentas de prueba.

### 7.5 Registro único — Axel · revisor Frander

- [ ] Dejar una sola ficha en la rama unificada.
- [ ] Cerrar o dejar con estado explícito H-01 a H-07.
- [ ] Frander marca «afirmaciones respaldadas» y «observaciones resueltas».
- [ ] Adjuntar la evidencia de CI de ZAP cuando exista.

### 7.6 Renovate — Pablo · revisor Daniel Núñez

- [ ] Dejar la ficha completa en la rama unificada: configuración, un PR real de actualización sujeto a los mismos checks, reescaneo programado de dependencias y cómo ese resultado crea o actualiza un hallazgo.
- [ ] Daniel Núñez firma.

## Hallazgos aún abiertos

- [ ] **H-01.** ZAP autenticado sin ejecución exitosa.
- [ ] **H-02.** Falso positivo de AAGUID; falta la decisión humana.
- [ ] **H-03.** Token del relay; el dueño confirma o se rota.
- [ ] **H-04.** Clave localhost; confirmar que solo es de pruebas.
- [x] **H-05.** Corregido en la rama `seg/entrega-unificada`: 0 avisos de `react-hooks` y reglas otra vez en *error*. Axel cierra el Issue #34 al integrar.
- [ ] **H-06.** Avisos corregidos en la rama (OSV local 78 → 0, `npm audit` 0). Falta la corrida de OSV en CI sobre el SHA final para adjuntarla.
- [ ] **H-07.** AI-01, AI-02 y AI-03 sin decisión de Pablo.

## Entrega en Profelink

- [ ] Enlace al repositorio público.
- [ ] Alcance y responsabilidades de cada integrante.
- [ ] Cómo se repartió el trabajo.
- [ ] Evidencias enlazadas desde cada ítem.

## Firmas que faltan

| Revisor | Ítems sin firmar |
|---|---|
| Daniel Núñez | 1.1 (en la ficha), 4.7, 7.6 |
| Frander | 4.5 |
| Daniel | 4.4, 5.3, 6.5 |
| Axel | 1.3, 3.2, 3.5 |
| Pablo | 2.6, 3.1 (en la ficha), 5.6 |
