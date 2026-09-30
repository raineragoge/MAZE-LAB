# MAZE-LAB

Aplicación web interactiva para visualizar y comparar distintos algoritmos de búsqueda sobre un laberinto editable.

## Objetivo

El objetivo del proyecto es entender de forma visual cómo funcionan varios algoritmos de búsqueda utilizados en Inteligencia Artificial. El usuario puede crear un mapa, colocar un punto de inicio, una o varias metas, obstáculos y casillas con peso, y después observar cómo cada algoritmo explora el tablero y encuentra una ruta.

## Tecnologías utilizadas

- **HTML**: estructura de la página.
- **CSS**: diseño visual, distribución de paneles y estilos del tablero.
- **JavaScript**: lógica del programa, algoritmos, edición del mapa, métricas y animaciones.
- **GitHub**: control de versiones y almacenamiento del código.
- **Netlify**: despliegue público del proyecto.

## Algoritmos implementados

### BFS · Búsqueda en anchura
Explora el mapa por capas. Cuando todas las casillas tienen el mismo coste, encuentra una ruta con el menor número de pasos. No utiliza los pesos para decidir qué camino seguir.

### DFS · Búsqueda en profundidad
Avanza todo lo posible por una rama antes de retroceder. Puede encontrar una solución rápidamente, pero no garantiza que sea la ruta más corta ni la de menor coste.

### UCS · Búsqueda de coste uniforme
Explora primero el camino con menor coste acumulado. Tiene en cuenta los pesos de las casillas y, con costes no negativos, encuentra una ruta de coste mínimo.

### A*
Combina el coste acumulado con una heurística Manhattan que estima la distancia hasta la meta. Tiene en cuenta los pesos y permite orientar la búsqueda hacia el objetivo.

## Funcionalidades principales

- Tablero de **20 × 20** por defecto.
- Tamaño configurable entre 5 y 60.
- Colocación y movimiento del punto de inicio.
- Una o varias metas.
- Obstáculos no transitables.
- Casillas transitables con peso.
- Movimiento ortogonal, sin diagonales.
- Visualización de casillas exploradas.
- Visualización de la ruta final.
- Animación de un coche recorriendo la ruta.
- Botones de simular, pausar, continuar, detener y reiniciar.
- Control de velocidad de la animación.
- Comparación de BFS, DFS, UCS y A* sobre el mismo mapa.
- Métricas de pasos, coste, casillas exploradas y tiempo de animación.
- Modo claro y oscuro.
- Música electrónica generada en el navegador.

## Escenarios

La aplicación incluye cuatro escenarios pensados para comparar comportamientos distintos de los algoritmos:

1. **Menos pasos**  
   Mapa sin pesos donde se comparan caminos con distinta longitud.

2. **Pesos · Atajo caro**  
   Existe una ruta corta con coste alto y otra más larga pero barata.

3. **Metas con coste**  
   Se colocan varias metas para comprobar que la meta más cercana no tiene por qué ser la más barata.

4. **Sin solución**  
   Una barrera de obstáculos impide llegar desde el inicio hasta la meta.

> **Nota:** en la versión actual estos escenarios se generan a partir de condiciones definidas. Para la entrega final se convertirán en mapas reproducibles para que cada escenario cargue siempre la misma configuración.

## Pruebas realizadas

Se han comprobado los siguientes casos:

- **Ruta simple:** el algoritmo encuentra correctamente una ruta entre inicio y meta.
- **Ausencia de meta:** la aplicación no permite simular y muestra un aviso.
- **Varias metas:** BFS llega correctamente a la meta más cercana en número de pasos.
- **Pesos:** UCS y A* tienen en cuenta el coste de las casillas.
- **Comprobación de optimalidad:** sobre el mismo escenario, UCS y A* obtuvieron un coste final de **21** y **21 pasos**. UCS exploró **168 casillas** y A* **74 casillas**.
- **Obstáculos:** los algoritmos rodean los obstáculos y no los atraviesan.
- **Mapa sin solución:** la exploración termina sin cruzar la barrera y se informa de que no existe ruta.
- **Edición después de ejecutar:** al eliminar obstáculos y volver a simular, la aplicación calcula una nueva ruta correctamente.
- **Pausa y continuación:** la simulación se detiene y continúa desde el mismo punto.
- **Control de velocidad:** en el mismo recorrido, a **97 casillas/s** la animación tardó **3,7 s** y a **200 casillas/s** tardó **1,8 s**, manteniendo **87 casillas exploradas, 34 pasos y coste 34**.

## Estructura del proyecto

```text
MAZE-LAB/
├── index.html
├── styles.css
├── script.js
└── README.md
```

- **index.html**: contiene la estructura de la interfaz.
- **styles.css**: contiene el diseño visual.
- **script.js**: contiene los algoritmos, la lógica del tablero, las métricas y las animaciones.
- **README.md**: documentación básica del proyecto.

## Cómo ejecutar el proyecto

### Opción 1 · Abrir directamente

Descarga o clona el repositorio y abre:

```text
index.html
```

en un navegador web.

### Opción 2 · Servidor local con Python

Desde la carpeta del proyecto:

```bash
python -m http.server 8000
```

Después abre en el navegador:

```text
http://localhost:8000
```

## Repositorio

https://github.com/raineragoge/MAZE-LAB

## Despliegue

**Netlify:** https://mazeprojectlab.netlify.app

## Limitaciones actuales

- Los cuatro escenarios deben convertirse todavía en configuraciones totalmente reproducibles para la entrega final.
- Las capturas de las pruebas se incorporarán a la documentación final.

## Estado del proyecto

La aplicación principal ya permite editar el mapa, ejecutar BFS, DFS, UCS y A*, visualizar la exploración, comparar resultados y comprobar los principales casos de prueba requeridos.
