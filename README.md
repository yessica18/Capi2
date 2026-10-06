# CAPICÚA 2.0 — El universo del saber

Plataforma educativa gratuita tipo videojuego 3D para aprender matemáticas, física e ingeniería.
Publicada en **https://yessica18.github.io/Capi2/**

> En CAPICÚA no luchas contra las matemáticas. Aprendes a utilizarlas.
> **APRENDE. EQUIVÓCATE. COMPRENDE. DOMINA.**

## Estructura (no cambiar los nombres de carpeta)

```
index.html              página única (rutas con #, sin servidor)
script.js               motor, contenido, interfaz y batallas
script-extra.js         secciones que se cargan al entrar (acuario, Capi, juegos…)
script-3d.js            mundo 3D (se carga solo cuando hace falta)
capicua-plus.js         CAPICÚA 2.0: Consejo de los Sabios, batallas mejoradas, Olvidina, micrófono, rendimiento
capicua-plus.css        CAPICÚA 2.0: responsive, tema claro, efectos de batalla
vendor/three.min.js     motor 3D (Three.js r149)
marca/                  logos, íconos, emblema, código QR, imagen para redes
manifest.webmanifest    instalación como app
sw.js                   funcionamiento sin conexión
sitemap.xml, robots.txt, _headers, .nojekyll
```

Todas las rutas son relativas, así que funciona bajo `/Capi2/` sin configurar nada.

### ⚠️ Cómo subir a GitHub sin romper la página

El error principal de la versión anterior fue que las carpetas `marca/` y `vendor/` se perdieron al subir los archivos uno por uno
("Add files via upload" aplana todo). Sin `vendor/three.min.js` el 3D nunca cargaba (sabios, enemigos, acuario y batallas en 3D salían vacíos),
y sin `marca/` fallaban los íconos, el manifiesto y el modo sin conexión.

Para subir: en GitHub → **Add file → Upload files**, arrastra **las carpetas completas** (`marca` y `vendor`) junto con los demás archivos,
o usa GitHub Desktop / `git push`. Después: **Settings → Pages → Branch: main / (root)**.

## Qué cambió en 2.0

| Área | Cambio |
|---|---|
| Despliegue | Carpetas `marca/` y `vendor/` restauradas; el 3D vuelve a cargar en GitHub Pages. Service worker nuevo (instala aunque falte un archivo). Versiones de caché actualizadas. `sitemap.xml` con la URL real. |
| Móvil | La barra superior medía más que la pantalla (402 px en un iPhone de 390 px), lo que obligaba al navegador a alejar la página: ese era el "zoom". Corregido. Campos con 16 px (iOS ya no amplía al escribir), `touch-action` para evitar el doble toque, sin desbordes horizontales (verificado en 320 px), botones de ejercicio de 44–48 px, opciones en una columna. |
| Colores | Tema claro mágico por defecto (azul cielo, turquesa, lavanda, rosa, menta). El tema espacial sigue en Ajustes. |
| Batallas | Daño según dificultad (fácil 10, media 20, difícil 35, jefe 50) × calidad de la respuesta × combo (x2 a 3 aciertos, x3 a 5, x4 a 10, x5 a 15). Ataques con símbolos por región (Espada algebraica, Golpe geométrico, Derivada, Descarga electromagnética…). Número de daño, proyectil y destello. HUD flotante con las barras de vida cuando bajas al ejercicio. Al fallar: contraataque + Capi "¡No pasa nada!" con **Intentar de nuevo / Ver pista / Repasar el tema**; el combo se reinicia pero la experiencia se conserva. Derrota no violenta: el enemigo se convierte en símbolos de conocimiento, insignia + PI. |
| Olvidina | El Repaso (repetición espaciada) ahora es una batalla contra Olvidina; aviso en Inicio cuando hay temas por repasar. |
| Consejo de los Sabios | Nueva zona 3D (`#consejo`): caminas (WASD/flechas, joystick táctil o tocando el suelo), los sabios te miran y saludan al acercarte, "Hablar con…", diálogo con época, lugar, especialidad, dato real y curiosidad, misión que abre una lección de su rama y ataque aliado que aparece en tus combates. Carga progresiva (primero los 15 destacados), 15/45/87 sabios según la potencia del equipo, y vista 2D si el 3D no está disponible. Lista accesible por épocas. |
| Accesorios | 11 accesorios matemáticos desbloqueables (π Pin, Broche de Sumatoria, Diadema de la Raíz, Compás de Euclides, Lentes del Astrónomo, Corona del Infinito…). Se equipan en Perfil y aparecen junto a tu avatar en batalla y en el Consejo. |
| Micrófono | Estados reales: pidiendo permiso, grabando, procesando, Capi hablando, no disponible. Detecta permiso bloqueado, falta de micrófono, página no segura y navegadores sin voz a texto, con instrucciones claras. El chat escrito siempre queda disponible. |
| Rendimiento | Detección automática de calidad (BAJA/MEDIA/ALTA). Modo rendimiento (Ajustes): sin desenfoques ni partículas decorativas, resolución 3D 1x. Nueva calidad "Rendimiento" en Calidad gráfica 3D. Three.js y las secciones pesadas siguen cargando solo cuando se necesitan. |

### Ganchos añadidos al código existente

Los archivos `script*.js` ya venían compilados. Se añadieron llamadas mínimas (si `capicua-plus.js` no carga, todo funciona como antes):

- `script.js`: `hit` / `taunt` / derrota de la arena → `CapPlus.battle`; Repaso → `CapPlus.olvidina`; micrófono de Capi → `CapPlus.mic`; enlace "Consejo de los Sabios" en el menú; tema claro por defecto; opción de calidad "Rendimiento".
- `script-3d.js`: expone `CapW3.stage`, `CapW3.animChibi`, `CapW3.textSprite` para reutilizar el motor 3D; resolución reducida en modo rendimiento.
- `script-extra.js`: micrófono del chat de Capi → `CapPlus.mic`.

## Servicios externos (integración preparada)

- **IA de Capi**: usa `window.CAPICUA_API` (o `<meta name="capicua-api" content="https://tu-servidor">`) con los endpoints `/api/...`. Sin ese servidor (o fuera de claude.ai), las funciones que necesitan IA avisan que no están disponibles y el resto de la plataforma funciona igual.
- **Voz a texto en navegadores sin reconocimiento (Firefox)**: define `window.CAPICUA_STT_URL` con un servicio que reciba el audio (POST) y devuelva `{ "text": "..." }`. Chrome, Edge y Safari no lo necesitan.

## Inventario (antes → después)

12 regiones · 147 niveles · 87 sabios + 7 leyendas modernas · 105 objetos de avatar · 8 armas · 146 logros · 26 criaturas del acuario: **iguales**.
Vistas: 41 → 42 (nueva: Consejo de los Sabios).

Enemigos (idénticos en Capi y Capi2, todos conservados): Procrastinación (Lady Perezosa), Frustración (Furio Nopuedo), Desidia (Don Desgano),
Indisciplina (Bufón Caos), Miedo a equivocarse (Sombrita Tiembla), Distracción (Influ Notificación), Falta de tiempo (Cronos Tictac),
Bloqueo (Sir Muro), Confusión (Doña Confusión), Duda (Dudoso Talvez), **Olvido (Olvidina Borrosa)** y la Reina Ignorancia, más los 12 jefes de región.
La versión Capi (1) es un subconjunto de Capi2: no hay objetos, criaturas, niveles, logros ni vistas que existan solo en la versión 1.

## Pruebas realizadas (Chromium, escritorio 1280–1440 px y móvil 320/375/390 px)

Todas las secciones del menú y rutas internas abren sin errores de consola y sin desborde horizontal; el 3D carga; acuario con criaturas 3D;
lección completa con respuestas correctas e incorrectas (daño, combo, contraataque, ayuda de Capi); repaso con Olvidina; Consejo:
caminar con teclado y joystick, acercarse, hablar, aceptar misión; accesorios en Perfil; bloque de rendimiento en Ajustes; micrófono con
permiso concedido y bloqueado. Pendiente de probar en dispositivos reales: Safari iOS, Firefox y Android físico.
