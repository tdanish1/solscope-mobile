import sharp from 'sharp';

const GOLD = '#d4a843';
const BG = '#08070c';

// Single clean S path, triple-line effect via layered strokes
// (wide gold → narrow bg → medium gold → narrow bg → thin gold)
function makeIcon(size, padding, bgRadius) {
  const s = (size - padding * 2) / 100;
  const ox = padding;
  const oy = padding;

  // One smooth S bezier path
  const sPath = `
    M ${ox + 72*s} ${oy + 14*s}
    L ${ox + 42*s} ${oy + 14*s}
    C ${ox + 18*s} ${oy + 14*s} ${ox + 12*s} ${oy + 22*s} ${ox + 12*s} ${oy + 32*s}
    C ${ox + 12*s} ${oy + 44*s} ${ox + 28*s} ${oy + 48*s} ${ox + 50*s} ${oy + 50*s}
    C ${ox + 72*s} ${oy + 52*s} ${ox + 88*s} ${oy + 56*s} ${ox + 88*s} ${oy + 68*s}
    C ${ox + 88*s} ${oy + 78*s} ${ox + 82*s} ${oy + 86*s} ${ox + 58*s} ${oy + 86*s}
    L ${ox + 28*s} ${oy + 86*s}
  `;

  // Layer 5 strokes: gold, bg, gold, bg, gold (outermost to innermost)
  const layers = [
    { w: 21 * s, color: GOLD },
    { w: 16 * s, color: BG },
    { w: 11.5 * s, color: GOLD },
    { w: 7 * s, color: BG },
    { w: 3 * s, color: GOLD },
  ];

  const strokes = layers.map(l =>
    `<path d="${sPath}" fill="none" stroke="${l.color}" stroke-width="${l.w}" stroke-linecap="round" stroke-linejoin="round"/>`
  ).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bgRadius > 0 ? `<rect width="${size}" height="${size}" rx="${bgRadius}" fill="${BG}"/>` : `<rect width="${size}" height="${size}" fill="${BG}"/>`}
    ${strokes}
  </svg>`;
}

async function generate() {
  // icon.png — 1024x1024
  const iconSvg = makeIcon(1024, 230, 180);
  await sharp(Buffer.from(iconSvg)).png().toFile('assets/icon.png');
  console.log('Generated icon.png');

  // adaptive-icon.png — 1024x1024 (transparent bg, Android adds background)
  const adaptiveSvg = makeIcon(1024, 290, 0)
    .replace(`fill="${BG}"`, 'fill="none"');
  await sharp(Buffer.from(adaptiveSvg)).png().toFile('assets/adaptive-icon.png');
  console.log('Generated adaptive-icon.png');
}

generate().catch(console.error);
