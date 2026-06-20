# Reporte de Pruebas JTV - Versión Fácil (Para Dummies)

Este informe explica de forma muy sencilla cómo probamos la aplicación JTV v2.3 y qué cosas encontramos que funcionan bien y cuáles necesitan arreglarse para que usar la app sea más cómodo y no dé problemas.

---

## 1. ¿Cómo hicimos las pruebas?

Pusimos a un "robot" que imitó las acciones de una persona real dentro de la aplicación. Este robot fue haciendo clics, cambiando canales, subiendo y bajando el volumen y abriendo menús. 

Para que podamos ver exactamente qué hizo, cada vez que el robot hizo un clic, la pantalla se marcó con un **punto rojo** y se tomó una foto automática. En total, el robot sacó **21 fotos** que muestran todo el recorrido por la app. Las fotos se guardaron en la carpeta `docs/screenshots/`.

---

## 2. Lo que funciona de maravilla (¡Buenas noticias!)

*   **¡La televisión en vivo funciona perfectamente!**: Probamos canales como DAZN F1, FX y Cartoon Network. Nuestro sistema "robot" logró sintonizar y reproducir el video de todos ellos sin problemas.
*   **Audio automático al instante**: Superamos el bloqueo que los navegadores ponen a los videos para que inicien en silencio. La app busca y hace clic por sí sola en los botones de "quitar silencio" del canal interno para que escuches el audio al instante.
*   **Controles de volumen y silenciador desde la barra inferior**: Los botones de subir, bajar y silenciar volumen (Mute) en el menú de abajo funcionan perfectamente, respondiendo rápido y sincronizándose con la televisión.
*   **La barrera del ratón (Mouse Barrier)**: Cuando pones un canal, tienes 10 segundos para hacer clics y configurarlo. Pasados esos 10 segundos, la app crea un "muro invisible" para el puntero del ratón sobre el reproductor. Así se evitan clics accidentales en anuncios o virus ocultos del proveedor original del stream y los controles molestos desaparecen de la pantalla.
*   **¿Fotos de canales en negro? ¡Es normal!**: Verás que las capturas de pantalla de los canales (`tv_02_dazn_f1_playing.png`, etc.) están completamente negras. Esto no es un fallo; la computadora bloquea las fotos del reproductor de video por protección de derechos de autor y aceleración por tarjeta gráfica. Nuestros sensores de audio y de red confirmaron que el canal sonaba y cargaba datos de video perfectamente.
*   **¡Adiós anuncios y virus molestos en cine!**: Cuando pusimos una película en la sección de cine, nuestro sistema de seguridad bloqueó de forma automática todos los anuncios ocultos y enlaces raros. La película se vio limpia y sin interrupciones.
*   **Cambios estéticos**: Los fondos de pantalla de ajustes se aplican bien y la aplicación se ve muy moderna y elegante.

---

## 3. Problemas encontrados (Las piedras en el camino)

Durante el paseo por la app, encontramos 5 problemas que resultan molestos o que hacen que la aplicación falle:

### A. La app se cierra sola en muchas laptops (El problema más grave)
*   **Qué pasa**: La aplicación tiene una regla muy estricta: si tu pantalla mide menos de 1080 píxeles de alto, la app te muestra un mensaje de advertencia y **se apaga sola después de 5 segundos**.
*   **Por qué es un problema**: La mayoría de las computadoras portátiles normales tienen pantallas que, por el zoom de Windows (escalado recomendado), la aplicación las detecta como pantallas pequeñas. Esto hace que **la app sea completamente inútil en la mayoría de las laptops**, ya que se cierra al instante sin dejarte ver nada.

### B. El menú de la izquierda es "escurridizo"
*   **Qué pasa**: Para abrir la lista de canales, tienes que llevar el puntero del ratón al borde izquierdo de la pantalla. Pero la "zona sensible" es tan delgada como un cabello.
*   **Por qué es un problema**: Tienes que andar adivinando con el ratón exactamente dónde ponerlo. A veces pasas el ratón y la app no se da cuenta de que quieres abrir el menú.

### C. Parpadeos molestos al mover la ventana
*   **Qué pasa**: En la sección de Películas y Series, cada vez que estiras la ventana de la app para hacerla más grande o pequeña, la pantalla parpadea con un círculo de carga.
*   **Por qué es un problema**: La app se pone a descargar de nuevo todas las películas de internet solo porque cambiaste el tamaño de la ventana. Esto hace que vaya lento y consuma internet de forma innecesaria. Debería simplemente reacomodar las películas que ya descargó.

### D. Clics fallidos al abrir menús rápido
*   **Qué pasa**: El menú de la izquierda se abre deslizándose con una animación. Si intentas hacer clic rápido en un canal justo cuando se está abriendo, el clic se pierde o se hace en otro lado.
*   **Por qué es un problema**: La app calcula dónde hacer el clic antes de que el menú termine de aparecer en pantalla.

### E. Botones rebeldes en los controles de volumen
*   **Qué pasa**: En la barra de controles que sale abajo cuando ves televisión, los botones de subir y bajar volumen no son botones reales para el sistema de la computadora, sino simples textos con enlaces. 
*   **Por qué es un problema**: Esto hace que personas que usan el teclado para navegar o lectores de pantalla para personas con discapacidad visual no puedan controlar el volumen correctamente.

---

## 4. ¿Cómo vamos a arreglar esto? (Plan de mejoras)

Para que la aplicación funcione perfecto, tenemos un plan de 5 pasos:

1.  **Salvar las laptops**: Haremos que la app no se cierre sola si tu pantalla es un poco pequeña, y que simplemente se adapte a tu tamaño de pantalla.
2.  **Menú más fácil de abrir**: Haremos que la barra de canales se abra con un botón claro en pantalla o que la zona donde pasas el ratón sea mucho más ancha para que no falles.
3.  **Memoria inteligente para películas**: Haremos que la app recuerde las películas que ya descargó y que solo las ordene en pantalla cuando cambies el tamaño de la ventana, sin volver a descargarlas de internet.
4.  **Menús más rápidos**: Haremos que las animaciones sean más veloces para que puedas hacer clics al instante sin que se pierdan.
5.  **Botones reales**: Cambiaremos los textos de volumen por botones de verdad para que cualquier persona pueda usarlos fácilmente.
