#!/usr/bin/env node
/**
 * generate-assets.js
 *
 * Generates icon.png, adaptive-icon.png, splash.png, and favicon.png
 * from SVG definitions using sharp.
 *
 * Brand concept:
 *  - Vault ring: encrypted, device-locked storage
 *  - Card core: payment-card utility
 *  - Scan brackets on splash: OCR capture flow
 */

const sharp = require('sharp');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');

const sharedDefs = `
  <linearGradient id="bgGradient" x1="18%" y1="8%" x2="82%" y2="92%">
    <stop offset="0%" stop-color="#15171C"/>
    <stop offset="50%" stop-color="#0B0D11"/>
    <stop offset="100%" stop-color="#050608"/>
  </linearGradient>

  <radialGradient id="ambientGlow" cx="50%" cy="42%" r="56%">
    <stop offset="0%" stop-color="rgba(117, 226, 216, 0.18)"/>
    <stop offset="55%" stop-color="rgba(117, 226, 216, 0.05)"/>
    <stop offset="100%" stop-color="rgba(117, 226, 216, 0)"/>
  </radialGradient>

  <linearGradient id="steelRing" x1="10%" y1="10%" x2="90%" y2="90%">
    <stop offset="0%" stop-color="#F8FBFD"/>
    <stop offset="32%" stop-color="#B9C2CB"/>
    <stop offset="68%" stop-color="#6E7782"/>
    <stop offset="100%" stop-color="#D7DDE2"/>
  </linearGradient>

  <linearGradient id="cardFace" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#7DE5DB"/>
    <stop offset="52%" stop-color="#3D8E9B"/>
    <stop offset="100%" stop-color="#173A46"/>
  </linearGradient>

  <linearGradient id="cardHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="rgba(255,255,255,0.42)"/>
    <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
  </linearGradient>

  <linearGradient id="chipFill" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#FFF4C9"/>
    <stop offset="100%" stop-color="#C5A45C"/>
  </linearGradient>

  <radialGradient id="coreGlow" cx="50%" cy="45%" r="65%">
    <stop offset="0%" stop-color="#15373E"/>
    <stop offset="100%" stop-color="#091116"/>
  </radialGradient>

  <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="22" stdDeviation="28" flood-color="#000000" flood-opacity="0.45"/>
  </filter>

  <filter id="ringShadow" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000000" flood-opacity="0.35"/>
  </filter>
`;

function brandMark() {
  return `
    <g filter="url(#softShadow)">
      <circle cx="512" cy="512" r="290" fill="rgba(255,255,255,0.03)"/>
      <circle cx="512" cy="512" r="252" fill="url(#coreGlow)"/>
    </g>

    <g filter="url(#ringShadow)">
      <circle cx="512" cy="512" r="264" fill="none" stroke="url(#steelRing)" stroke-width="48"/>
      <circle cx="512" cy="512" r="203" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
    </g>

    <circle cx="512" cy="248" r="14" fill="#C8D0D8"/>
    <circle cx="776" cy="512" r="14" fill="#C8D0D8"/>
    <circle cx="512" cy="776" r="14" fill="#C8D0D8"/>
    <circle cx="248" cy="512" r="14" fill="#C8D0D8"/>

    <g transform="rotate(-11 512 512)" filter="url(#softShadow)">
      <rect x="302" y="396" width="420" height="252" rx="42" fill="url(#cardFace)"/>
      <rect x="302" y="396" width="420" height="78" rx="42" fill="url(#cardHighlight)" opacity="0.35"/>
      <rect x="302" y="396" width="420" height="252" rx="42" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>

      <rect x="350" y="468" width="82" height="62" rx="12" fill="url(#chipFill)"/>
      <line x1="350" y1="490" x2="432" y2="490" stroke="rgba(79,53,15,0.34)" stroke-width="2"/>
      <line x1="350" y1="508" x2="432" y2="508" stroke="rgba(79,53,15,0.34)" stroke-width="2"/>
      <line x1="384" y1="468" x2="384" y2="530" stroke="rgba(79,53,15,0.34)" stroke-width="2"/>
      <line x1="404" y1="468" x2="404" y2="530" stroke="rgba(79,53,15,0.34)" stroke-width="2"/>

      <rect x="350" y="568" width="180" height="18" rx="9" fill="rgba(255,255,255,0.70)"/>
      <rect x="350" y="602" width="116" height="14" rx="7" fill="rgba(255,255,255,0.32)"/>
    </g>

    <g filter="url(#softShadow)">
      <circle cx="512" cy="512" r="92" fill="#F4F8FA"/>
      <circle cx="512" cy="512" r="60" fill="#0A1115"/>
      <path d="M 512 482
               a 18 18 0 1 1 0 36
               a 18 18 0 1 1 0 -36 Z"
            fill="#F4F8FA"/>
      <rect x="504" y="511" width="16" height="38" rx="8" fill="#F4F8FA"/>
    </g>
  `;
}

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>${sharedDefs}</defs>
  <rect width="1024" height="1024" rx="224" fill="url(#bgGradient)"/>
  <circle cx="512" cy="470" r="330" fill="url(#ambientGlow)"/>
  ${brandMark()}
</svg>`;

const SPLASH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048" width="2048" height="2048">
  <defs>
    ${sharedDefs}

    <pattern id="grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
      <circle cx="40" cy="40" r="1.4" fill="rgba(255,255,255,0.05)"/>
    </pattern>

    <linearGradient id="scanLine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(125,229,219,0)"/>
      <stop offset="50%" stop-color="rgba(125,229,219,0.9)"/>
      <stop offset="100%" stop-color="rgba(125,229,219,0)"/>
    </linearGradient>
  </defs>

  <rect width="2048" height="2048" fill="url(#bgGradient)"/>
  <rect width="2048" height="2048" fill="url(#grid)"/>
  <circle cx="1024" cy="760" r="430" fill="url(#ambientGlow)"/>

  <g opacity="0.95">
    <path d="M 654 594 h 138 v 18 h -120 v 120 h -18 Z" fill="#78E1D7"/>
    <path d="M 1394 594 h -138 v 18 h 120 v 120 h 18 Z" fill="#78E1D7"/>
    <path d="M 654 1124 h 138 v -18 h -120 v -120 h -18 Z" fill="#78E1D7"/>
    <path d="M 1394 1124 h -138 v -18 h 120 v -120 h 18 Z" fill="#78E1D7"/>
    <rect x="718" y="858" width="612" height="6" rx="3" fill="url(#scanLine)" opacity="0.85"/>
  </g>

  <g transform="translate(486.4, 222.4) scale(1.05)">
    ${brandMark()}
  </g>

  <text
    x="1024" y="1392"
    font-family="'Courier New', Courier, monospace"
    font-size="92"
    font-weight="700"
    letter-spacing="18"
    fill="#F3F7F8"
    text-anchor="middle">CARD VAULT</text>

  <rect x="858" y="1432" width="332" height="2" rx="1" fill="rgba(255,255,255,0.16)"/>

  <text
    x="1024" y="1498"
    font-family="'Courier New', Courier, monospace"
    font-size="30"
    letter-spacing="8"
    fill="rgba(255,255,255,0.44)"
    text-anchor="middle">SCAN. ENCRYPT. LOCK.</text>
</svg>`;

async function generate() {
  console.log('Generating app assets...\n');

  const jobs = [
    { name: 'icon.png (1024x1024)', svg: ICON_SVG, file: 'icon.png', size: 1024 },
    { name: 'adaptive-icon.png (1024x1024)', svg: ICON_SVG, file: 'adaptive-icon.png', size: 1024 },
    { name: 'splash.png (2048x2048)', svg: SPLASH_SVG, file: 'splash.png', size: 2048 },
    { name: 'favicon.png (64x64)', svg: ICON_SVG, file: 'favicon.png', size: 64 },
  ];

  for (const { name, svg, file, size } of jobs) {
    await sharp(Buffer.from(svg), { density: 144 })
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(path.join(ASSETS, file));
    console.log(`  OK ${name}`);
  }

  console.log('\nAll assets generated successfully.');
}

generate().catch((err) => {
  console.error('\nError:', err.message);
  process.exit(1);
});
