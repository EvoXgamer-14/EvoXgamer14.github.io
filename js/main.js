/**
 * main.js — The EvoX 17
 * Módulos: Circuitos PCB animados + Menú hamburguesa móvil
 */

/* =========================================================
   CIRCUIT BOARD — Fondo animado estilo PCB con pulsos neón
   Genera trazas ortogonales, nodos y pulsos de datos
========================================================= */

class CircuitBoard {
  /**
   * @param {HTMLCanvasElement} canvas - Canvas de fondo
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    // Offscreen canvas para las trazas estáticas (se redibujan solo al resize)
    this.staticCanvas = document.createElement("canvas");
    this.staticCtx = this.staticCanvas.getContext("2d");

    // Paleta The EvoX 17 con pesos (más verde = más presencia)
    this.palette = [
      { color: "#39FF14", weight: 5 }, // Verde neón — dominante
      { color: "#00CFFF", weight: 2 }, // Azul neón
      { color: "#0038C8", weight: 2 }, // Azul oscuro
      { color: "#AAFF00", weight: 2 }, // Verde/amarillo neón (lima)
      { color: "#FFE600", weight: 1 }, // Amarillo eléctrico — acento
    ];

    this.segments = [];
    this.nodes = [];
    this.pulses = [];
    this.gridSize = 58;
    this.animId = null;
  }

  /** Selecciona un color de la paleta según sus pesos */
  _randomColor() {
    const total = this.palette.reduce((sum, p) => sum + p.weight, 0);
    let rand = Math.random() * total;
    for (const p of this.palette) {
      rand -= p.weight;
      if (rand <= 0) return p.color;
    }
    return this.palette[0].color;
  }

  /** Genera la malla de nodos y trazas estilo PCB */
  _generate() {
    this.segments = [];
    this.nodes = [];
    this.pulses = [];

    const { width, height } = this.canvas;
    const gs = this.gridSize;
    const cols = Math.ceil(width / gs) + 2;
    const rows = Math.ceil(height / gs) + 2;

    // Mapa de nodos sobre la cuadrícula
    const nodeMap = {};
    const key = (c, r) => `${c}_${r}`;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.48) {
          nodeMap[key(c, r)] = {
            c,
            r,
            x: c * gs,
            y: r * gs,
            color: this._randomColor(),
            pulse: Math.random() * Math.PI * 2,
            pulseSpeed: 0.012 + Math.random() * 0.022,
            size: 1.4 + Math.random() * 2,
          };
        }
      }
    }

    this.nodes = Object.values(nodeMap);

    // Conecta nodos adyacentes solo en horizontal/vertical (PCB real)
    this.nodes.forEach((node) => {
      [
        [1, 0],
        [0, 1],
      ].forEach(([dc, dr]) => {
        const neighbor = nodeMap[key(node.c + dc, node.r + dr)];
        if (!neighbor || Math.random() > 0.52) return;

        const color = Math.random() < 0.6 ? node.color : neighbor.color;
        const seg = {
          x1: node.x,
          y1: node.y,
          x2: neighbor.x,
          y2: neighbor.y,
          color,
          width: 0.5 + Math.random() * 1.1,
        };
        this.segments.push(seg);

        // Añade pulso de datos en ~22% de los segmentos
        if (Math.random() < 0.22) {
          this.pulses.push({
            x1: seg.x1,
            y1: seg.y1,
            x2: seg.x2,
            y2: seg.y2,
            progress: Math.random(),
            speed: 0.003 + Math.random() * 0.007,
            color: seg.color,
            size: 1.8 + Math.random() * 2.2,
          });
        }
      });
    });
  }

  /** Dibuja las trazas y nodos estáticos en el offscreen canvas */
  _drawStatic() {
    const ctx = this.staticCtx;
    const { width, height } = this.canvas;
    ctx.clearRect(0, 0, width, height);

    // Trazas PCB
    this.segments.forEach((seg) => {
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = seg.width;
      ctx.shadowColor = seg.color;
      ctx.shadowBlur = 5;
      ctx.globalAlpha = 0.17;
      ctx.stroke();
    });

    // Nodos / pads de conexión
    this.nodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.shadowColor = node.color;
      ctx.shadowBlur = 8;
      ctx.globalAlpha = 0.3;
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  /** Frame de animación: pulsos y nodos pulsantes sobre trazas estáticas */
  _animate() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Trazas desde offscreen (no se recalculan cada frame)
    ctx.drawImage(this.staticCanvas, 0, 0);

    // Nodos con pulso de brillo
    this.nodes.forEach((node) => {
      node.pulse += node.pulseSpeed;
      const t = (Math.sin(node.pulse) + 1) / 2;
      const radius = node.size * (0.75 + t * 0.65);

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.shadowColor = node.color;
      ctx.shadowBlur = 5 + t * 12;
      ctx.globalAlpha = 0.22 + t * 0.28;
      ctx.fill();
    });

    // Pulsos de datos viajando por las trazas
    this.pulses.forEach((pulse) => {
      pulse.progress += pulse.speed;
      if (pulse.progress >= 1) pulse.progress = 0;

      const x = pulse.x1 + (pulse.x2 - pulse.x1) * pulse.progress;
      const y = pulse.y1 + (pulse.y2 - pulse.y1) * pulse.progress;

      // Halo exterior difuso
      ctx.beginPath();
      ctx.arc(x, y, pulse.size * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = pulse.color;
      ctx.shadowColor = pulse.color;
      ctx.shadowBlur = 18;
      ctx.globalAlpha = 0.12;
      ctx.fill();

      // Núcleo brillante
      ctx.beginPath();
      ctx.arc(x, y, pulse.size, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = pulse.color;
      ctx.shadowBlur = 14;
      ctx.globalAlpha = 0.88;
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    this.animId = requestAnimationFrame(() => this._animate());
  }

  /** Redimensiona canvas, regenera circuitos y reinicia animación */
  _resize() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.staticCanvas.width = window.innerWidth;
    this.staticCanvas.height = window.innerHeight;

    this._generate();
    this._drawStatic();
    this._animate();
  }

  /** Punto de entrada: inicializa el circuito */
  init() {
    this._resize();

    // Debounce en resize para evitar regeneraciones excesivas
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this._resize(), 200);
    });
  }
}

/* =========================================================
   HAMBURGER MENU — Drawer lateral para móvil
   Controla apertura/cierre del sidebar con overlay
========================================================= */

class HamburgerMenu {
  constructor() {
    this.btn = document.getElementById("hamburger");
    this.sidebar = document.querySelector(".sidebar");
    this.overlay = document.getElementById("overlay");
    this.navLinks = document.querySelectorAll(".sidebar nav a");
  }

  /** Abre el drawer lateral */
  open() {
    this.sidebar.classList.add("open");
    this.overlay.classList.add("active");
    this.btn.classList.add("active");
    this.btn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden"; // evita scroll del fondo
  }

  /** Cierra el drawer lateral */
  close() {
    this.sidebar.classList.remove("open");
    this.overlay.classList.remove("active");
    this.btn.classList.remove("active");
    this.btn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  /** Alterna entre abierto y cerrado */
  toggle() {
    this.sidebar.classList.contains("open") ? this.close() : this.open();
  }

  /** Punto de entrada: registra todos los event listeners */
  init() {
    if (!this.btn || !this.sidebar || !this.overlay) return;

    this.btn.addEventListener("click", () => this.toggle());
    this.overlay.addEventListener("click", () => this.close());

    // Cierra el menú al navegar a una sección
    this.navLinks.forEach((link) => {
      link.addEventListener("click", () => this.close());
    });

    // Cierra con Escape para accesibilidad
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.sidebar.classList.contains("open")) {
        this.close();
      }
    });
  }
}

/* =========================================================
   INICIALIZACIÓN
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // Fondo de circuitos PCB animado
  const canvas = document.getElementById("circuit-canvas");
  if (canvas) {
    new CircuitBoard(canvas).init();
  }

  // Menú hamburguesa para móvil
  new HamburgerMenu().init();
});
