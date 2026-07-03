/**
 * gen-clamp.cjs — Generador de fórmulas clamp() con meseta
 *
 * Uso:
 *   node scripts/gen-clamp.cjs <min> <base> <max> [unit]
 *
 * Parámetros:
 *   min   — valor mínimo en px (ventanas pequeñas)
 *   base  — valor de diseño en px a 1080px de ancho (se mantiene plano hasta 2046px)
 *   max   — valor máximo en px a 3840px (4K)
 *   unit  — (opcional) "rem" para convertir a rem, "px" por defecto
 *
 * Ejemplos:
 *   node scripts/gen-clamp.cjs 21 32 114
 *   node scripts/gen-clamp.cjs 7 10.4 36.96 rem
 *
 * También puedes editar ELEMENTS abajo y correr sin args para generar
 * múltiples valores de golpe.
 */

const BASE_VW   = 1080;   // ancho de referencia de diseño
const THRESHOLD = 2046;   // px donde empieza a crecer (meseta hasta aquí)
const MAX_VW    = 3840;   // ancho 4K objetivo
const SLOPE_DIV = MAX_VW - THRESHOLD; // 1794

function meseta(min, base, max, unit = 'px') {
  const vw        = (base / BASE_VW * 100).toFixed(2);
  const pendiente = ((max - base) / SLOPE_DIV).toFixed(5);

  if (unit === 'rem') {
    const BASE_FONT = 16;
    const minR  = (min  / BASE_FONT).toFixed(2) + 'rem';
    const baseR = (base / BASE_FONT).toFixed(2) + 'rem';
    const maxR  = (max  / BASE_FONT).toFixed(2) + 'rem';
    return `clamp(${minR}, max(clamp(${minR}, ${vw}vw, ${baseR}), calc(${baseR} + ${pendiente} * (100vw - ${THRESHOLD}px))), ${maxR})`;
  }

  return `clamp(${min}px, max(clamp(${min}px, ${vw}vw, ${base}px), calc(${base}px + ${pendiente} * (100vw - ${THRESHOLD}px))), ${max}px)`;
}

// ── Generación por lote (edita aquí) ──────────────────────────────────────────
const ELEMENTS = [
  // { label: '.pbar-action-btn width/height', min: 21, base: 32, max: 114 },
  // { label: 'font-size título canal',        min: 13.44, base: 20, max: 51.2, unit: 'rem' },
];

// ── CLI ───────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.length >= 3) {
  const [min, base, max] = args.map(Number);
  const unit = args[3] || 'px';
  console.log('\n' + meseta(min, base, max, unit) + '\n');
} else if (ELEMENTS.length > 0) {
  ELEMENTS.forEach(({ label, min, base, max, unit = 'px' }) => {
    console.log(`\n/* ${label} */`);
    console.log(meseta(min, base, max, unit));
  });
  console.log();
} else {
  console.log(`
Uso: node scripts/gen-clamp.cjs <min> <base> <max> [rem|px]

  min   = valor mínimo en px
  base  = valor de diseño a 1080px (se mantiene igual hasta 2046px)
  max   = valor máximo a 3840px (4K)

Ejemplo:
  node scripts/gen-clamp.cjs 21 32 114
  node scripts/gen-clamp.cjs 7 10.4 36.96 rem
  `);
}
