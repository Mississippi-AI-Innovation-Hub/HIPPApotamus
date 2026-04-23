const fs = require('fs');
const path = require('path');
const PptxGenJS = require('pptxgenjs');
const JSZip = require('jszip');
const { svgToDataUri } = require('./pptxgenjs_helpers/svg');
const { warnIfSlideHasOverlaps, warnIfSlideElementsOutOfBounds } = require('./pptxgenjs_helpers/layout');

const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'HIPAA_WIDE', width: 13.333, height: 7.5 });
pptx.layout = 'HIPAA_WIDE';
pptx.author = 'OpenAI Codex';
pptx.company = 'HIPAApotamus';
pptx.subject = 'HIPAApotamus feature-first interactive product walkthrough';
pptx.title = 'HIPAApotamus Interactive Product Walkthrough';
pptx.lang = 'en-US';
pptx.theme = {
  headFontFace: 'Avenir Next',
  bodyFontFace: 'Helvetica Neue',
  lang: 'en-US',
};

const BUILD_DIR = path.resolve('/tmp/hipaapotamus-deck/workspace/output');
const TEMP_FILE = path.join(BUILD_DIR, 'HIPAApotamus_Pitch_Deck.pptx');
const FINAL_FILE = path.resolve(__dirname, 'HIPAApotamus_Pitch_Deck.pptx');
const W = 13.333;
const H = 7.5;

const COLORS = {
  bg: '090D12',
  panel: '111822',
  panel2: '151E29',
  panel3: '1A2532',
  text: 'F5F8FC',
  muted: '94A3B5',
  muted2: '6F8093',
  line: '243343',
  lineSoft: '182330',
  whiteSoft: 'DCE5EF',
  cyan: '63E1FF',
  blue: '73AEFF',
  green: '59D7A8',
  amber: 'F2C56D',
  rose: 'FF7C7C',
  purple: '9FB1FF',
  aws: 'FF9900',
  goodBg: '10261F',
  warnBg: '2A2211',
  dangerBg: '2C171B',
  blueBg: '112132',
};

const FONT = {
  head: 'Avenir Next',
  body: 'Helvetica Neue',
  mono: 'Menlo',
};

const SCENES = [
  {
    key: 'emailing',
    word: 'Emailing',
    family: 'comparison',
    accent: COLORS.cyan,
    accentBg: COLORS.blueBg,
    icon: 'mail',
    reveals: ['DocuSign', 'Expensive', 'Third-party', 'Generic'],
    summary: 'Invitation, reminder, confirmation, and admin notifications already exist in the app.',
    source: 'Verified from /api/send-email and lib/email/templates',
    jumpPills: ['economics'],
  },
  {
    key: 'verify',
    word: 'Verify',
    family: 'security',
    accent: COLORS.green,
    accentBg: COLORS.goodBg,
    icon: 'lock',
    reveals: ['Signed link', 'Email OTP', 'No accounts'],
    summary: 'The system verifies the intended signer without forcing vendor account creation.',
    source: 'Verified from OTP routes + signing architecture',
    jumpPills: ['legal'],
  },
  {
    key: 'signing',
    word: 'Signing',
    family: 'workflow',
    accent: COLORS.amber,
    accentBg: COLORS.warnBg,
    icon: 'pen',
    reveals: ['Review', 'Consent', 'Draw'],
    summary: 'The signer reviews the agreement, consents electronically, and signs with captured metadata.',
    source: 'Verified from SigningInterface + sign route',
    jumpPills: [],
  },
  {
    key: 'countersign',
    word: 'Countersign',
    family: 'workflow',
    accent: COLORS.blue,
    accentBg: COLORS.blueBg,
    icon: 'handshake',
    reveals: ['Vendor first', 'Clinic second', 'Active'],
    summary: 'Vendor signature hands the agreement to the clinic for the final execution step.',
    source: 'Verified from countersign route + dashboard status handling',
    jumpPills: [],
  },
  {
    key: 'storage',
    word: 'Storage',
    family: 'security',
    accent: COLORS.purple,
    accentBg: COLORS.blueBg,
    icon: 'folder',
    reveals: ['Private S3', 'Pre-signed access', 'Retention'],
    summary: 'Documents stay private and are accessed through controlled links, not public file hosting.',
    source: 'Verified from README + S3 upload flow',
    jumpPills: ['encryption'],
  },
  {
    key: 'integrity',
    word: 'Integrity',
    family: 'security',
    accent: COLORS.green,
    accentBg: COLORS.goodBg,
    icon: 'shield',
    reveals: ['SHA-256', 'KMS sign', 'Verify'],
    summary: 'The platform fingerprints the final PDF, signs the hash, and stores verification evidence.',
    source: 'Verified from sign/countersign routes + architecture doc',
    jumpPills: ['legal', 'encryption'],
  },
  {
    key: 'tracking',
    word: 'Tracking',
    family: 'evidence',
    accent: COLORS.cyan,
    accentBg: COLORS.blueBg,
    icon: 'timeline',
    reveals: ['Audit logs', 'Statuses', 'History'],
    summary: 'Every contract action becomes visible to operators through dashboard state and event history.',
    source: 'Verified from dashboard + history pages',
    jumpPills: [],
  },
  {
    key: 'reminders',
    word: 'Reminders',
    family: 'workflow',
    accent: COLORS.amber,
    accentBg: COLORS.warnBg,
    icon: 'bell',
    reveals: ['Expiring soon', 'Send reminder', 'Renewal loop'],
    summary: 'The product turns contract expiration into an operational workflow instead of a calendar blind spot.',
    source: 'Verified from reminder email flow + dashboard',
    jumpPills: [],
  },
  {
    key: 'packets',
    word: 'Packets',
    family: 'evidence',
    accent: COLORS.blue,
    accentBg: COLORS.blueBg,
    icon: 'stack',
    reveals: ['Audit packet', 'Certificate', 'Download'],
    summary: 'The audit packet workflow packages evidence for review instead of making teams gather it manually.',
    source: 'Verified from audit packet UI + architecture requirements',
    jumpPills: ['legal'],
  },
  {
    key: 'architecture',
    word: 'Architecture',
    family: 'architecture',
    accent: COLORS.aws,
    accentBg: COLORS.warnBg,
    icon: 'cloud',
    reveals: ['AWS-native', 'Private data', 'Healthcare lens'],
    summary: 'The stack stays narrow and explainable: identity, storage, email, logging, and AI are all visible layers.',
    source: 'Verified from README architecture + Healthcare Lens mapping',
    jumpPills: ['encryption', 'legal', 'copilot'],
  },
];

const BACKUPS = [
  {
    key: 'economics',
    title: 'Economics',
    returnTo: 'emailing',
  },
  {
    key: 'legal',
    title: 'Legal',
    returnTo: 'integrity',
  },
  {
    key: 'encryption',
    title: 'Encryption',
    returnTo: 'storage',
  },
  {
    key: 'copilot',
    title: 'Copilot',
    returnTo: 'architecture',
  },
];

const SCENE_MAP = new Map();
const BACKUP_MAP = new Map();
const transitionSequence = [];

let slideCursor = 1;
SCENES.forEach((scene, index) => {
  scene.index = index + 1;
  scene.totalSlides = scene.reveals.length + 3;
  scene.heroSlide = slideCursor;
  scene.dockSlide = slideCursor + 1;
  scene.finalSlide = slideCursor + scene.totalSlides - 1;
  SCENE_MAP.set(scene.key, scene);
  slideCursor += scene.totalSlides;
});
BACKUPS.forEach((backup) => {
  backup.slideNumber = slideCursor;
  BACKUP_MAP.set(backup.key, backup);
  slideCursor += 1;
});

function svgData(svg) {
  return svgToDataUri(svg);
}

function baseIcon(inner) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240" fill="none">
      <rect x="12" y="12" width="216" height="216" rx="40" fill="#111822" stroke="#243343" stroke-width="4"/>
      ${inner}
    </svg>`;
}

function iconSvg(type, accent) {
  const a = accent;
  const w = COLORS.whiteSoft;
  switch (type) {
    case 'mail':
      return baseIcon(`
        <rect x="48" y="68" width="144" height="104" rx="18" stroke="${a}" stroke-width="8"/>
        <path d="M52 80l68 52 68-52" stroke="${w}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M52 160l44-40M188 160l-44-40" stroke="${w}" stroke-width="8" stroke-linecap="round"/>
      `);
    case 'lock':
      return baseIcon(`
        <rect x="72" y="106" width="96" height="72" rx="18" stroke="${a}" stroke-width="8"/>
        <path d="M92 106V84c0-22 13-36 28-36s28 14 28 36v22" stroke="${w}" stroke-width="8" stroke-linecap="round"/>
        <circle cx="120" cy="138" r="8" fill="${w}"/>
      `);
    case 'pen':
      return baseIcon(`
        <path d="M68 162l22-6 68-68-16-16-68 68-6 22z" stroke="${a}" stroke-width="8" stroke-linejoin="round"/>
        <path d="M126 72l16 16" stroke="${w}" stroke-width="8" stroke-linecap="round"/>
        <path d="M56 182h128" stroke="${w}" stroke-width="8" stroke-linecap="round"/>
      `);
    case 'handshake':
      return baseIcon(`
        <path d="M56 94h38l18 18c8 8 20 8 28 0l18-18h26" stroke="${a}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M74 142l18 18M98 134l16 16M122 126l16 16M150 118l16 16" stroke="${w}" stroke-width="8" stroke-linecap="round"/>
      `);
    case 'folder':
      return baseIcon(`
        <path d="M44 88h52l14 14h86v58c0 12-8 20-20 20H64c-12 0-20-8-20-20V88z" stroke="${a}" stroke-width="8" stroke-linejoin="round"/>
        <path d="M44 88V72c0-12 8-20 20-20h34l16 16h44" stroke="${w}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      `);
    case 'shield':
      return baseIcon(`
        <path d="M120 48l54 20v40c0 40-22 72-54 88-32-16-54-48-54-88V68l54-20z" stroke="${a}" stroke-width="8"/>
        <path d="M92 118l18 18 38-44" stroke="${w}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      `);
    case 'timeline':
      return baseIcon(`
        <path d="M64 64v112M120 64v112M176 64v112" stroke="${a}" stroke-width="8" stroke-linecap="round"/>
        <circle cx="64" cy="96" r="12" fill="${w}"/>
        <circle cx="120" cy="136" r="12" fill="${w}"/>
        <circle cx="176" cy="84" r="12" fill="${w}"/>
      `);
    case 'bell':
      return baseIcon(`
        <path d="M84 170h72" stroke="${w}" stroke-width="8" stroke-linecap="round"/>
        <path d="M96 170c0 13 10 22 24 22s24-9 24-22" stroke="${a}" stroke-width="8" stroke-linecap="round"/>
        <path d="M72 150h96c-8-10-12-24-12-42 0-22-16-40-36-40s-36 18-36 40c0 18-4 32-12 42z" stroke="${a}" stroke-width="8" stroke-linejoin="round"/>
      `);
    case 'stack':
      return baseIcon(`
        <rect x="62" y="70" width="116" height="24" rx="10" stroke="${a}" stroke-width="8"/>
        <rect x="52" y="108" width="116" height="24" rx="10" stroke="${w}" stroke-width="8"/>
        <rect x="62" y="146" width="116" height="24" rx="10" stroke="${a}" stroke-width="8"/>
      `);
    case 'cloud':
      return baseIcon(`
        <path d="M82 170h78c28 0 46-16 46-40 0-22-16-38-38-40-8-26-28-42-54-42-32 0-56 22-60 54-24 4-42 22-42 44 0 14 5 24 16 32" stroke="${a}" stroke-width="8" stroke-linecap="round"/>
        <path d="M92 132l24 24 40-46" stroke="${w}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      `);
    default:
      return baseIcon(`<circle cx="120" cy="120" r="44" stroke="${a}" stroke-width="8"/>`);
  }
}

function addBg(slide) {
  slide.background = { color: COLORS.bg };
}

function addTopLine(slide, accent) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: W,
    h: 0.06,
    line: { color: accent, pt: 0 },
    fill: { color: accent },
  });
}

function addFrame(slide, scene, mode = 'dock') {
  addBg(slide);
  addTopLine(slide, scene.accent);
  slide.addShape(pptx.ShapeType.line, {
    x: 0.8,
    y: 6.92,
    w: 11.7,
    h: 0,
    line: { color: COLORS.line, pt: 1 },
  });
  addText(slide, `0${scene.index}`.slice(-2), {
    x: 0.84,
    y: 7.0,
    w: 0.4,
    h: 0.15,
    fontFace: FONT.head,
    fontSize: 9,
    bold: true,
    color: scene.accent,
  });
  addText(slide, scene.summary, {
    x: 1.35,
    y: 7.0,
    w: 7.95,
    h: 0.15,
    fontSize: 8.7,
    color: COLORS.muted,
  });
  addText(slide, mode === 'final' ? scene.source : 'HIPAApotamus feature walkthrough', {
    x: 10.02,
    y: 7.0,
    w: 2.45,
    h: 0.15,
    fontSize: 8.2,
    color: COLORS.muted2,
    align: 'right',
  });
}

function addText(slide, value, opts = {}) {
  slide.addText(value, {
    fontFace: FONT.body,
    color: COLORS.text,
    margin: 0,
    breakLine: false,
    ...opts,
  });
}

function roundRect(slide, x, y, w, h, fill, line = COLORS.line, transparency = 0) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.18,
    fill: { color: fill, transparency },
    line: { color: line, pt: 1.1 },
  });
}

function tag(slide, label, x, y, w, accent, fill = COLORS.panel2, strike = false) {
  roundRect(slide, x, y, w, 0.5, fill, accent);
  addText(slide, label, {
    x,
    y: y + 0.13,
    w,
    h: 0.16,
    fontFace: FONT.head,
    fontSize: 12,
    bold: true,
    align: 'center',
    color: strike ? COLORS.whiteSoft : COLORS.text,
  });
  if (strike) {
    slide.addShape(pptx.ShapeType.line, {
      x: x + 0.16,
      y: y + 0.12,
      w: w - 0.32,
      h: 0.24,
      line: { color: COLORS.rose, pt: 2.2 },
    });
  }
}

function card(slide, x, y, w, h, title, body, accent, icon = null) {
  roundRect(slide, x, y, w, h, COLORS.panel, COLORS.line);
  const contentX = x + (icon ? 0.88 : 0.18);
  const contentW = w - (icon ? 1.06 : 0.36);
  slide.addShape(pptx.ShapeType.rect, {
    x: x + 0.03,
    y: y + 0.12,
    w: 0.04,
    h: h - 0.24,
    line: { color: accent, pt: 0 },
    fill: { color: accent },
  });
  if (icon) {
    slide.addImage({ data: svgData(iconSvg(icon, accent)), x: x + 0.18, y: y + 0.18, w: 0.56, h: 0.56 });
  }
  addText(slide, title, {
    x: contentX,
    y: y + 0.18,
    w: contentW,
    h: 0.18,
    fontFace: FONT.head,
    fontSize: 14,
    bold: true,
    color: COLORS.text,
  });
  addText(slide, body, {
    x: contentX,
    y: y + 0.52,
    w: contentW,
    h: h - 0.64,
    fontSize: 10.5,
    color: COLORS.whiteSoft,
    valign: 'top',
  });
}

function pillButton(slide, label, x, y, w, accent, targetSlide = null) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h: 0.34,
    rectRadius: 0.17,
    fill: { color: COLORS.panel2 },
    line: { color: accent, pt: 1 },
    hyperlink: targetSlide ? { slide: targetSlide, tooltip: `Go to ${label}` } : undefined,
  });
  addText(slide, label, {
    x,
    y: y + 0.08,
    w,
    h: 0.12,
    fontFace: FONT.head,
    fontSize: 8.5,
    bold: true,
    align: 'center',
    color: accent,
  });
}

function addHeroSlide(scene) {
  const slide = pptx.addSlide();
  addBg(slide);
  addText(slide, scene.word, {
    x: 1.0,
    y: 2.72,
    w: 11.3,
    h: 0.8,
    fontFace: FONT.head,
    fontSize: 32,
    bold: true,
    align: 'center',
    color: COLORS.text,
  });
  return slide;
}

function addTitle(slide, scene, final = false) {
  const isComparison = scene.family === 'comparison';
  const x = final ? 0.82 : (isComparison ? 3.15 : 3.02);
  const y = final ? 0.72 : 0.88;
  const w = final ? 3.6 : 7.3;
  const fontSize = final ? 18 : 21;
  const align = final ? 'left' : 'center';

  addText(slide, scene.word, {
    x,
    y,
    w,
    h: 0.3,
    fontFace: FONT.head,
    fontSize,
    bold: true,
    color: COLORS.text,
    align,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: final ? 0.84 : 4.3,
    y: final ? 1.15 : 1.28,
    w: final ? 0.9 : 4.7,
    h: 0,
    line: { color: scene.accent, pt: 1.3 },
  });
  if (!final) {
    slide.addImage({ data: svgData(iconSvg(scene.icon, scene.accent)), x: 6.16, y: 1.7, w: 1.02, h: 1.02 });
  }
}

function renderRevealStage(slide, scene, revealCount) {
  const reveals = scene.reveals.slice(0, revealCount);

  if (scene.family === 'comparison') {
    roundRect(slide, 4.35, 2.42, 4.62, 1.28, COLORS.panel, COLORS.line);
    addText(slide, 'what most teams already use', {
      x: 4.35,
      y: 2.58,
      w: 4.62,
      h: 0.12,
      fontSize: 8.7,
      color: COLORS.muted2,
      align: 'center',
    });
    tag(slide, reveals[0], 5.2, 2.96, 2.95, scene.accent, COLORS.panel2, true);

    const negativeY = 4.28;
    reveals.slice(1).forEach((label, idx) => {
      const widths = [1.7, 1.95, 1.5];
      const starts = [3.8, 5.65, 7.8];
      tag(slide, label, starts[idx], negativeY, widths[idx], COLORS.rose, COLORS.dangerBg);
    });

    card(
      slide,
      1.02,
      5.18,
      11.28,
      1.0,
      'Why this matters',
      'Email is the first visible part of the workflow. We do not want the first touchpoint outsourced to a generic seat-priced signature vendor when the rest of the process is product-specific.',
      scene.accent,
      'mail'
    );
    return;
  }

  if (scene.family === 'workflow') {
    const positions = [1.02, 4.41, 7.8];
    reveals.forEach((label, idx) => {
      roundRect(slide, positions[idx], 3.0, 2.5, 1.22, scene.accentBg, scene.accent);
      addText(slide, label, {
        x: positions[idx],
        y: 3.38,
        w: 2.5,
        h: 0.18,
        fontFace: FONT.head,
        fontSize: 15,
        bold: true,
        align: 'center',
        color: COLORS.text,
      });
      if (idx < reveals.length - 1) {
        slide.addShape(pptx.ShapeType.chevron, {
          x: positions[idx] + 2.68,
          y: 3.35,
          w: 0.62,
          h: 0.46,
          line: { color: scene.accent, pt: 0 },
          fill: { color: scene.accent },
        });
      }
    });
    card(slide, 1.02, 4.9, 11.28, 0.96, 'Workflow note', scene.summary, scene.accent, scene.icon);
    return;
  }

  if (scene.family === 'evidence') {
    const positions = [
      [1.02, 2.78],
      [6.35, 2.78],
      [1.02, 4.4],
    ];
    reveals.forEach((label, idx) => {
      roundRect(slide, positions[idx][0], positions[idx][1], 4.96, 1.18, scene.accentBg, scene.accent);
      addText(slide, label, {
        x: positions[idx][0] + 0.26,
        y: positions[idx][1] + 0.32,
        w: 4.44,
        h: 0.18,
        fontFace: FONT.head,
        fontSize: 15,
        bold: true,
        color: COLORS.text,
      });
      addText(slide, idx === 0 ? 'structured event evidence' : idx === 1 ? 'visible contract state' : 'operator review trail', {
        x: positions[idx][0] + 0.26,
        y: positions[idx][1] + 0.64,
        w: 4.44,
        h: 0.14,
        fontSize: 9.5,
        color: COLORS.whiteSoft,
      });
    });
    return;
  }

  if (scene.family === 'architecture') {
    const positions = [1.55, 4.55, 7.55];
    reveals.forEach((label, idx) => {
      roundRect(slide, positions[idx], 3.0, 2.25, 1.12, scene.accentBg, scene.accent);
      addText(slide, label, {
        x: positions[idx],
        y: 3.36,
        w: 2.25,
        h: 0.18,
        align: 'center',
        fontFace: FONT.head,
        fontSize: 14,
        bold: true,
      });
    });
    card(slide, 1.18, 4.84, 11.0, 1.0, 'Design intent', 'A narrow stack is easier to explain in the room and easier to defend in a compliance conversation.', scene.accent, 'cloud');
    return;
  }

  const cards = [
    { x: 3.05, y: 2.38 },
    { x: 3.05, y: 3.52 },
    { x: 3.05, y: 4.66 },
  ];
  reveals.forEach((label, idx) => {
    roundRect(slide, cards[idx].x, cards[idx].y, 7.28, 0.84, scene.accentBg, scene.accent);
    addText(slide, label, {
      x: cards[idx].x + 0.28,
      y: cards[idx].y + 0.24,
      w: 6.72,
      h: 0.18,
      fontFace: FONT.head,
      fontSize: 15,
      bold: true,
      color: COLORS.text,
      align: 'center',
    });
  });
}

function addSceneJumps(slide, scene) {
  const labels = scene.jumpPills || [];
  const buttons = labels.map((key) => {
    const backup = BACKUP_MAP.get(key);
    if (!backup) return null;
    return {
      backup,
      width: Math.max(0.96, 0.42 + backup.title.length * 0.11),
    };
  }).filter(Boolean);

  let x = W - 0.84;
  buttons.reverse().forEach((entry) => {
    x -= entry.width;
    pillButton(slide, entry.backup.title, x, 0.78, entry.width, scene.accent, entry.backup.slideNumber);
    x -= 0.14;
  });
}

function addMiniTags(slide, scene) {
  const items = scene.reveals.map((label, idx) => ({
    label,
    width: Math.max(0.94, 0.42 + label.length * 0.095),
    strike: scene.family === 'comparison' && idx === 0,
  }));
  const totalWidth = items.reduce((sum, item) => sum + item.width, 0) + (items.length - 1) * 0.12;
  let x = Math.max(6.1, W - 0.84 - totalWidth);
  items.forEach((item) => {
    tag(slide, item.label, x, 1.24, item.width, scene.accent, COLORS.panel2, item.strike);
    x += item.width + 0.12;
  });
}

function proofTextBlock(slide, scene, title, body) {
  card(slide, 0.84, 5.58, 12.0, 0.94, title, body, scene.accent, scene.icon);
}

function renderEmailingProof(slide, scene) {
  roundRect(slide, 0.84, 1.7, 4.2, 3.52, COLORS.panel, COLORS.line);
  addText(slide, 'Generic e-sign handoff', {
    x: 1.08,
    y: 2.02,
    w: 3.72,
    h: 0.18,
    fontFace: FONT.head,
    fontSize: 15,
    bold: true,
    color: COLORS.text,
  });
  tag(slide, 'DocuSign', 1.18, 2.52, 2.15, COLORS.rose, COLORS.dangerBg, true);
  tag(slide, 'Expensive', 1.18, 3.22, 1.5, COLORS.rose, COLORS.dangerBg);
  tag(slide, 'Third-party', 2.84, 3.22, 1.72, COLORS.rose, COLORS.dangerBg);
  tag(slide, 'Generic', 1.18, 3.92, 1.34, COLORS.rose, COLORS.dangerBg);
  addText(slide, 'Useful for signatures. Weak as the system of record for the full BAA lifecycle.', {
    x: 1.18,
    y: 4.46,
    w: 3.42,
    h: 0.42,
    fontSize: 10.2,
    color: COLORS.whiteSoft,
    valign: 'top',
  });

  roundRect(slide, 5.38, 1.7, 6.96, 3.52, COLORS.panel, COLORS.line);
  addText(slide, 'Integrated delivery inside HIPAApotamus', {
    x: 5.66,
    y: 2.02,
    w: 6.4,
    h: 0.18,
    fontFace: FONT.head,
    fontSize: 15,
    bold: true,
  });

  const steps = [
    ['Invitation', 5.74],
    ['OTP', 7.42],
    ['Confirmation', 8.74],
    ['Reminder', 10.54],
  ];
  steps.forEach(([label, x], idx) => {
    roundRect(slide, x, 3.0, idx === 1 ? 1.02 : 1.38, 1.06, scene.accentBg, scene.accent);
    addText(slide, label, {
      x,
      y: 3.36,
      w: idx === 1 ? 1.02 : 1.38,
      h: 0.18,
      align: 'center',
      fontFace: FONT.head,
      fontSize: 12.5,
      bold: true,
    });
    if (idx < steps.length - 1) {
      slide.addShape(pptx.ShapeType.chevron, {
        x: x + (idx === 1 ? 1.16 : 1.52),
        y: 3.34,
        w: 0.42,
        h: 0.38,
        line: { color: scene.accent, pt: 0 },
        fill: { color: scene.accent },
      });
    }
  });

  proofTextBlock(slide, scene, 'What changes in the room', 'We are not selling an e-sign seat. We are showing that the first email already belongs inside the compliance workflow.');
}

function renderVerifyProof(slide, scene) {
  roundRect(slide, 0.86, 1.72, 5.0, 3.52, COLORS.panel, COLORS.line);
  addText(slide, 'Two-step identity challenge', {
    x: 1.12,
    y: 2.02,
    w: 4.4,
    h: 0.18,
    fontFace: FONT.head,
    fontSize: 15,
    bold: true,
  });
  const steps = [
    ['1', 'Signed link', 'short-lived token'],
    ['2', 'Email OTP', 'registered contact only'],
    ['3', 'Verified', 'document revealed'],
  ];
  steps.forEach((step, idx) => {
    roundRect(slide, 1.12, 2.56 + idx * 0.84, 4.34, 0.62, scene.accentBg, scene.accent);
    tag(slide, step[0], 1.24, 2.66 + idx * 0.84, 0.42, scene.accent, COLORS.panel2);
    addText(slide, step[1], {
      x: 1.84,
      y: 2.76 + idx * 0.84,
      w: 1.7,
      h: 0.14,
      fontFace: FONT.head,
      fontSize: 11.5,
      bold: true,
    });
    addText(slide, step[2], {
      x: 3.44,
      y: 2.76 + idx * 0.84,
      w: 1.8,
      h: 0.14,
      fontSize: 9.1,
      color: COLORS.whiteSoft,
      align: 'right',
    });
  });
  card(slide, 6.14, 1.72, 6.18, 1.48, 'Why this is stronger than a link alone', 'In government contracting the biggest risk is authority, not just cryptography. The OTP verifies control over the registered contact channel.', scene.accent, 'lock');
  card(slide, 6.14, 3.44, 6.18, 1.1, 'Why not force vendor logins', 'Vendors sign one document. Accounts add friction and reduce completion.', scene.accent, 'mail');
  card(slide, 6.14, 4.78, 6.18, 0.92, 'Legal angle', 'This supports attribution under ESIGN and Mississippi UETA.', scene.accent, 'shield');
  proofTextBlock(slide, scene, 'The message for the audience', 'We keep the signer journey light while still making authority-to-bind defensible.');
}

function renderSigningProof(slide, scene) {
  roundRect(slide, 0.84, 1.68, 7.1, 3.72, COLORS.panel, COLORS.line);
  addText(slide, 'Signing ceremony', {
    x: 1.08,
    y: 1.98,
    w: 2.8,
    h: 0.18,
    fontFace: FONT.head,
    fontSize: 15,
    bold: true,
  });
  roundRect(slide, 1.08, 2.5, 4.44, 1.48, COLORS.panel2, scene.accent);
  addText(slide, 'Contract Review', {
    x: 1.34,
    y: 2.78,
    w: 1.68,
    h: 0.18,
    fontFace: FONT.head,
    fontSize: 13,
    bold: true,
  });
  addText(slide, 'Full agreement text is displayed before signing.', {
    x: 1.34,
    y: 3.16,
    w: 3.72,
    h: 0.28,
    fontSize: 10,
    color: COLORS.whiteSoft,
    valign: 'top',
  });
  roundRect(slide, 1.08, 4.2, 2.14, 0.76, scene.accentBg, scene.accent);
  addText(slide, 'I agree', { x: 1.08, y: 4.46, w: 2.14, h: 0.14, align: 'center', fontFace: FONT.head, fontSize: 12, bold: true });
  roundRect(slide, 3.48, 4.2, 2.04, 0.76, scene.accentBg, scene.accent);
  addText(slide, 'Drawn sig', { x: 3.48, y: 4.46, w: 2.04, h: 0.14, align: 'center', fontFace: FONT.head, fontSize: 12, bold: true });
  slide.addShape(pptx.ShapeType.line, { x: 5.98, y: 4.38, w: 1.18, h: 0.18, line: { color: COLORS.whiteSoft, pt: 1.2 } });
  slide.addShape(pptx.ShapeType.line, { x: 5.98, y: 4.52, w: 0.86, h: -0.08, line: { color: COLORS.whiteSoft, pt: 1.2 } });

  card(slide, 8.22, 1.68, 4.12, 1.24, 'Signer evidence', 'Name, title, email, IP address, user agent, timestamp, and method are captured with the record.', scene.accent, 'pen');
  card(slide, 8.22, 3.12, 4.12, 1.1, 'Decline path', 'The interface includes a decline workflow instead of forcing only one outcome.', scene.accent, 'shield');
  card(slide, 8.22, 4.46, 4.12, 0.94, 'Document output', 'The final PDF is generated after the signing step.', scene.accent, 'stack');
  proofTextBlock(slide, scene, 'What to say on this scene', 'This is a signing ceremony, not a blank signature box dropped into a PDF.');
}

function renderCountersignProof(slide, scene) {
  roundRect(slide, 0.84, 1.72, 11.66, 3.56, COLORS.panel, COLORS.line);
  addText(slide, 'Bilateral execution flow', {
    x: 1.08,
    y: 2.02,
    w: 3.3,
    h: 0.18,
    fontFace: FONT.head,
    fontSize: 15,
    bold: true,
  });
  const columns = [
    ['Vendor signs', 'pending_countersignature', 1.1],
    ['Clinic countersigns', 'COUNTER_SIGNATURE', 4.65],
    ['Agreement active', 'status = active', 8.2],
  ];
  columns.forEach((col, idx) => {
    roundRect(slide, col[2], 2.72, 2.78, 1.42, idx === 2 ? COLORS.goodBg : scene.accentBg, scene.accent);
    addText(slide, col[0], {
      x: col[2], y: 3.04, w: 2.78, h: 0.18,
      align: 'center', fontFace: FONT.head, fontSize: 13.5, bold: true,
    });
    addText(slide, col[1], {
      x: col[2] + 0.18, y: 3.42, w: 2.42, h: 0.16,
      align: 'center', fontSize: 9.2, color: COLORS.whiteSoft,
    });
    if (idx < columns.length - 1) {
      slide.addShape(pptx.ShapeType.chevron, {
        x: col[2] + 3.0, y: 3.18, w: 0.48, h: 0.42,
        line: { color: scene.accent, pt: 0 }, fill: { color: scene.accent },
      });
    }
  });
  proofTextBlock(slide, scene, 'Why this matters', 'A BAA is not done when the vendor signs. The contract becomes fully executed only after the clinic countersigns.');
}

function renderStorageProof(slide, scene) {
  roundRect(slide, 0.84, 1.68, 6.22, 3.8, COLORS.panel, COLORS.line);
  addText(slide, 'Document handling', {
    x: 1.08, y: 1.98, w: 2.8, h: 0.18,
    fontFace: FONT.head, fontSize: 15, bold: true,
  });
  addText(slide, 'hipaapotamus-signed-documents/', {
    x: 1.08, y: 2.44, w: 4.9, h: 0.18,
    fontFace: FONT.mono, fontSize: 11.5, color: scene.accent,
  });
  [
    'signatures/',
    'signed-documents/',
    'certificates/',
    'drafts/',
  ].forEach((line, idx) => {
    addText(slide, `  ${line}`, {
      x: 1.22, y: 2.88 + idx * 0.46, w: 3.5, h: 0.16,
      fontFace: FONT.mono, fontSize: 10.2, color: COLORS.whiteSoft,
    });
  });
  card(slide, 7.36, 1.68, 4.96, 1.18, 'Privacy', 'S3 documents are private and accessed through pre-signed URLs only.', scene.accent, 'folder');
  card(slide, 7.36, 3.06, 4.96, 1.1, 'Handling', 'Signature images, PDFs, and evidence artifacts stay inside the platform storage model.', scene.accent, 'lock');
  card(slide, 7.36, 4.36, 4.96, 1.12, 'Retention lens', 'Architecture calls for long-lived retention with stronger object lock hardening in production.', scene.accent, 'stack');
  proofTextBlock(slide, scene, 'The message for the audience', 'Privacy is not a slide theme here. It shows up in where documents live, how links are issued, and how long records stay available.');
}

function renderIntegrityProof(slide, scene) {
  roundRect(slide, 0.84, 1.68, 7.04, 3.76, COLORS.panel, COLORS.line);
  addText(slide, 'Tamper-evident chain', {
    x: 1.08, y: 1.98, w: 3.2, h: 0.18,
    fontFace: FONT.head, fontSize: 15, bold: true,
  });
  const steps = [
    ['PDF', 1.18],
    ['Hash', 2.86],
    ['KMS sign', 4.54],
    ['Verify', 6.22],
  ];
  steps.forEach((step, idx) => {
    roundRect(slide, step[1], 3.0, 1.1, 0.98, scene.accentBg, scene.accent);
    addText(slide, step[0], {
      x: step[1], y: 3.32, w: 1.1, h: 0.16,
      align: 'center', fontFace: FONT.head, fontSize: 11.5, bold: true,
    });
    if (idx < steps.length - 1) {
      slide.addShape(pptx.ShapeType.chevron, {
        x: step[1] + 1.28, y: 3.26, w: 0.36, h: 0.3,
        line: { color: scene.accent, pt: 0 }, fill: { color: scene.accent },
      });
    }
  });
  card(slide, 8.18, 1.68, 4.14, 1.36, 'What the math proves', 'A specific document version was sealed at a specific time with a specific key reference.', scene.accent, 'shield');
  card(slide, 8.18, 3.26, 4.14, 1.02, 'What the human step proves', 'The signer intended to sign that document.', scene.accent, 'pen');
  card(slide, 8.18, 4.52, 4.14, 0.92, 'Language to use', 'Say tamper-evident and cryptographically verifiable, not immutable.', scene.accent, 'lock');
  proofTextBlock(slide, scene, 'The pitch line', 'When an auditor asks whether the document changed, we answer with the hash and the KMS verification story.');
}

function renderTrackingProof(slide, scene) {
  roundRect(slide, 0.84, 1.68, 7.04, 3.76, COLORS.panel, COLORS.line);
  addText(slide, 'Visible contract state', {
    x: 1.08, y: 1.98, w: 3.2, h: 0.18,
    fontFace: FONT.head, fontSize: 15, bold: true,
  });
  const events = [
    'OTP_SENT',
    'OTP_VERIFIED',
    'BAA signed',
    'COUNTER_SIGNATURE',
    'Reminder sent',
  ];
  events.forEach((evt, idx) => {
    roundRect(slide, 1.18, 2.46 + idx * 0.5, 3.14, 0.34, COLORS.panel2, scene.accent);
    addText(slide, evt, {
      x: 1.34, y: 2.57 + idx * 0.5, w: 2.74, h: 0.12,
      fontFace: FONT.mono, fontSize: 8.8, color: COLORS.whiteSoft,
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 4.58, y: 2.63 + idx * 0.5, w: 0.6, h: 0,
      line: { color: scene.accent, pt: 1.1 },
    });
    roundRect(slide, 5.34, 2.38 + idx * 0.5, 1.92, 0.5, idx % 2 === 0 ? scene.accentBg : COLORS.panel2, scene.accent);
    addText(slide, idx < 2 ? 'verify' : idx < 4 ? 'execution' : 'ops', {
      x: 5.34, y: 2.56 + idx * 0.5, w: 1.92, h: 0.12,
      align: 'center', fontFace: FONT.head, fontSize: 8.7, bold: true,
    });
  });
  card(slide, 8.18, 1.68, 4.14, 1.24, 'Dashboard', 'Counts, urgent reminders, contract state, and recent activity are visible to the operator.', scene.accent, 'timeline');
  card(slide, 8.18, 3.12, 4.14, 1.1, 'History', 'The history page turns individual actions into a searchable trail.', scene.accent, 'stack');
  card(slide, 8.18, 4.46, 4.14, 0.98, 'Operator value', 'No more guessing who touched what or where the agreement is stuck.', scene.accent, 'shield');
  proofTextBlock(slide, scene, 'What this scene does', 'It proves the product is operational after signature, not just during signature.');
}

function renderRemindersProof(slide, scene) {
  roundRect(slide, 0.84, 1.68, 11.66, 3.72, COLORS.panel, COLORS.line);
  addText(slide, 'Expiration workflow', {
    x: 1.08, y: 1.98, w: 3.0, h: 0.18,
    fontFace: FONT.head, fontSize: 15, bold: true,
  });
  const flow = [
    ['Expiring contract', 1.1],
    ['Reminder email', 4.3],
    ['Renewal action', 7.5],
  ];
  flow.forEach((item, idx) => {
    roundRect(slide, item[1], 3.0, 2.34, 1.08, scene.accentBg, scene.accent);
    addText(slide, item[0], {
      x: item[1], y: 3.34, w: 2.34, h: 0.16,
      align: 'center', fontFace: FONT.head, fontSize: 12.5, bold: true,
    });
    if (idx < flow.length - 1) {
      slide.addShape(pptx.ShapeType.chevron, {
        x: item[1] + 2.54, y: 3.3, w: 0.42, h: 0.36,
        line: { color: scene.accent, pt: 0 }, fill: { color: scene.accent },
      });
    }
  });
  proofTextBlock(slide, scene, 'Why it matters', 'The product keeps the agreement alive after execution by turning future dates into follow-up actions.');
}

function renderPacketsProof(slide, scene) {
  roundRect(slide, 0.84, 1.68, 6.6, 3.78, COLORS.panel, COLORS.line);
  addText(slide, 'Packet contents', {
    x: 1.08, y: 1.98, w: 2.8, h: 0.18,
    fontFace: FONT.head, fontSize: 15, bold: true,
  });
  const docs = [
    'Signed PDF',
    'Audit trail',
    'Executive summary',
    'Certificate of completion',
  ];
  docs.forEach((item, idx) => {
    roundRect(slide, 1.18 + idx * 0.18, 2.5 + idx * 0.28, 3.34, 1.72, idx % 2 === 0 ? scene.accentBg : COLORS.panel2, scene.accent);
    addText(slide, item, {
      x: 1.46 + idx * 0.18, y: 3.18 + idx * 0.28, w: 2.6, h: 0.16,
      fontFace: FONT.head, fontSize: 11.2, bold: true,
    });
  });
  card(slide, 7.72, 1.68, 4.6, 1.28, 'Audit-ready output', 'Instead of collecting proof by hand, the operator can generate a review package from the product.', scene.accent, 'stack');
  card(slide, 7.72, 3.18, 4.6, 1.12, 'Certificate', 'The architecture defines a certificate of completion that explains the event trail and integrity evidence.', scene.accent, 'shield');
  card(slide, 7.72, 4.52, 4.6, 0.94, 'Presentation angle', 'This is where the compliance story becomes tangible.', scene.accent, 'timeline');
  proofTextBlock(slide, scene, 'What to emphasize', 'People remember this slide because it turns invisible backend work into a deliverable they understand immediately.');
}

function renderArchitectureProof(slide, scene) {
  roundRect(slide, 0.84, 1.66, 12.0, 3.9, COLORS.panel, COLORS.line);
  addText(slide, 'AWS healthcare workflow lens', {
    x: 1.08, y: 1.96, w: 3.8, h: 0.18,
    fontFace: FONT.head, fontSize: 15, bold: true,
  });
  const nodes = [
    ['Browser', 1.08, 2.68, 1.58],
    ['Next.js', 3.0, 2.68, 1.58],
    ['Cognito', 4.92, 2.04, 1.58],
    ['DynamoDB', 6.84, 2.04, 1.72],
    ['S3', 6.84, 3.34, 1.72],
    ['SES', 8.92, 2.04, 1.58],
    ['OpenAI', 10.84, 2.04, 1.58],
    ['ElevenLabs', 10.6, 3.34, 1.82],
  ];
  nodes.forEach((node, idx) => {
    const accent = idx < 2 ? scene.accent : idx < 5 ? COLORS.blue : idx === 5 ? COLORS.green : COLORS.amber;
    roundRect(slide, node[1], node[2], node[3], 0.82, idx % 2 === 0 ? COLORS.panel2 : scene.accentBg, accent);
    addText(slide, node[0], {
      x: node[1], y: node[2] + 0.28, w: node[3], h: 0.14,
      align: 'center', fontFace: FONT.head, fontSize: 10.5, bold: true,
    });
  });
  [
    [2.74, 3.07, 0.2, 0],
    [4.62, 3.07, 0.2, -0.42],
    [4.62, 3.07, 0.2, 0.42],
    [8.66, 2.44, 0.18, 0],
    [8.66, 3.74, 1.74, 0],
  ].forEach((line) => {
    slide.addShape(pptx.ShapeType.line, {
      x: line[0], y: line[1], w: line[2], h: line[3],
      line: { color: COLORS.whiteSoft, pt: 1.1, endArrowType: 'triangle' },
    });
  });
  card(slide, 1.08, 4.92, 3.4, 0.82, 'HCL_SEC3', 'Centralized logging', scene.accent, 'timeline');
  card(slide, 4.78, 4.92, 3.4, 0.82, 'HCL_SEC7', 'Encryption at rest and in transit', scene.accent, 'shield');
  card(slide, 8.48, 4.92, 3.4, 0.82, 'Why it works', 'Simple enough to explain, strong enough to harden', scene.accent, 'cloud');
  proofTextBlock(slide, scene, 'How to narrate it', 'This is not architecture theater. Every box maps to a job the product already has to do.');
}

function renderProof(slide, scene) {
  if (scene.key === 'emailing') return renderEmailingProof(slide, scene);
  if (scene.key === 'verify') return renderVerifyProof(slide, scene);
  if (scene.key === 'signing') return renderSigningProof(slide, scene);
  if (scene.key === 'countersign') return renderCountersignProof(slide, scene);
  if (scene.key === 'storage') return renderStorageProof(slide, scene);
  if (scene.key === 'integrity') return renderIntegrityProof(slide, scene);
  if (scene.key === 'tracking') return renderTrackingProof(slide, scene);
  if (scene.key === 'reminders') return renderRemindersProof(slide, scene);
  if (scene.key === 'packets') return renderPacketsProof(slide, scene);
  return renderArchitectureProof(slide, scene);
}

function addScene(scene) {
  transitionSequence.push('fade');
  addHeroSlide(scene);

  const dockSlide = pptx.addSlide();
  addFrame(dockSlide, scene, 'dock');
  addTitle(dockSlide, scene, false);
  transitionSequence.push(scene.family === 'workflow' || scene.family === 'comparison' ? 'push' : 'fade');

  for (let i = 0; i < scene.reveals.length; i += 1) {
    const revealSlide = pptx.addSlide();
    addFrame(revealSlide, scene, 'reveal');
    addTitle(revealSlide, scene, false);
    renderRevealStage(revealSlide, scene, i + 1);
    transitionSequence.push(scene.family === 'comparison' ? 'push' : 'fade');
  }

  const finalSlide = pptx.addSlide();
  addFrame(finalSlide, scene, 'final');
  addTitle(finalSlide, scene, true);
  addMiniTags(finalSlide, scene);
  addSceneJumps(finalSlide, scene);
  renderProof(finalSlide, scene);
  transitionSequence.push('push');
}

function addBackupFrame(slide, title, subtitle, accent, returnSlide = null, returnLabel = 'Return') {
  addBg(slide);
  addTopLine(slide, accent);
  addText(slide, title, {
    x: 0.84, y: 0.74, w: 3.8, h: 0.28,
    fontFace: FONT.head, fontSize: 19, bold: true,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 0.86, y: 1.18, w: 0.9, h: 0,
    line: { color: accent, pt: 1.3 },
  });
  addText(slide, subtitle, {
    x: 0.84, y: 1.42, w: 10.2, h: 0.34,
    fontSize: 11, color: COLORS.whiteSoft,
  });
  if (returnSlide) {
    pillButton(slide, returnLabel, 11.2, 0.78, 1.1, accent, returnSlide);
  }
  slide.addShape(pptx.ShapeType.line, {
    x: 0.8, y: 6.92, w: 11.7, h: 0,
    line: { color: COLORS.line, pt: 1 },
  });
  addText(slide, 'Backup appendix', {
    x: 0.84, y: 7.0, w: 2.0, h: 0.14,
    fontFace: FONT.head, fontSize: 9, bold: true, color: accent,
  });
}

function addEconomicsSlide(backup) {
  const slide = pptx.addSlide();
  addBackupFrame(
    slide,
    backup.title,
    'Directional cost framing anchored to DocuSign public list pricing and AWS service pricing checked on April 15, 2026.',
    COLORS.cyan,
    SCENE_MAP.get(backup.returnTo).finalSlide,
    'Emailing'
  );

  card(slide, 0.84, 2.0, 3.8, 1.18, 'DocuSign seat logic', 'Public plans are priced per user, with envelope limits or tier upgrades layered on top.', COLORS.cyan, 'mail');
  card(slide, 4.78, 2.0, 3.8, 1.18, 'Our variable cost shape', 'SES, S3, DynamoDB, and KMS create a usage-light backend cost curve for core workflow actions.', COLORS.green, 'cloud');
  card(slide, 8.72, 2.0, 3.78, 1.18, 'Why the comparison matters', 'The real differentiator is not cheap signatures. It is owning the full BAA workflow.', COLORS.amber, 'shield');

  const rows = [
    [
      { text: 'Reference', options: { bold: true, color: COLORS.cyan } },
      { text: 'Directional value', options: { bold: true, color: COLORS.cyan } },
      { text: 'How to use it in the room', options: { bold: true, color: COLORS.cyan } },
    ],
    ['DocuSign Standard', '$25/user/month; 100 envelopes per user/year', 'Use to show seat pricing starts fast even before workflow depth'],
    ['DocuSign Business Pro', '$40/user/month; 100 envelopes per user/year', 'Useful benchmark for companies adding more signing capability'],
    ['DocuSign Unlimited Web App', '$50/user/month', 'Directionally shows how costs climb when volume grows'],
    ['Amazon SES', '$0.10 per 1,000 outbound emails', 'Invitation, OTP, reminder, and confirmation traffic stays light'],
    ['AWS KMS', '$1/key/month + $0.15 per 10,000 sign requests', 'Hash signing is cheap relative to seat software'],
    ['DynamoDB + S3', 'low usage-based infrastructure cost', 'Metadata and document evidence do not require seat economics'],
  ];

  slide.addTable(rows, {
    x: 0.84, y: 3.56, w: 11.68, h: 2.46,
    border: { type: 'solid', color: COLORS.line, pt: 1 },
    fill: COLORS.panel,
    color: COLORS.text,
    fontFace: FONT.body,
    fontSize: 9.1,
    margin: 0.05,
    rowH: 0.4,
    colW: [2.55, 3.0, 6.0],
    autoFit: false,
    valign: 'mid',
  });
}

function addLegalSlide(backup) {
  const slide = pptx.addSlide();
  addBackupFrame(
    slide,
    backup.title,
    'Legal and policy terms pulled from the electronic signature architecture document. Status language stays honest: implemented, aligned, or hardening.',
    COLORS.green,
    SCENE_MAP.get(backup.returnTo).finalSlide,
    'Integrity'
  );

  const rows = [
    ['ESIGN Act', 'intent, consent, association, retention', 'implemented / aligned'],
    ['Mississippi UETA', 'state recognition of e-signatures', 'aligned'],
    ['HIPAA 164.312(c)', 'integrity controls', 'implemented in hash + verification story'],
    ['HIPAA 164.312(b)', 'audit controls', 'implemented in audit event model'],
    ['HIPAA 164.312(e)(1)', 'transmission security', 'aligned via TLS 1.2+'],
    ['HIPAA 164.530(j)(2)', 'retention basis', 'aligned'],
    ['HIPAA 164.504(e)', 'required BAA provisions', 'implemented through template/compliance mapping'],
    ['Mississippi 41-9-69', '10-year retention basis', 'aligned in architecture'],
    ['AWS HCL_SEC3', 'centralized logging', 'aligned / hardening'],
    ['AWS HCL_SEC7', 'encryption at rest and in transit', 'implemented / aligned'],
    ['NIST SP 800-177', 'email integrity reference', 'reference alignment'],
    ['Paper copy right', 'ESIGN refusal / paper option', 'hardening backlog'],
  ];

  const table = [[
    { text: 'Requirement', options: { bold: true, color: COLORS.green } },
    { text: 'What it means', options: { bold: true, color: COLORS.green } },
    { text: 'Deck-safe status', options: { bold: true, color: COLORS.green } },
  ]].concat(rows);

  slide.addTable(table, {
    x: 0.84, y: 2.16, w: 11.68, h: 4.6,
    border: { type: 'solid', color: COLORS.line, pt: 1 },
    fill: COLORS.panel,
    color: COLORS.text,
    fontFace: FONT.body,
    fontSize: 8.65,
    margin: 0.05,
    rowH: 0.35,
    colW: [2.6, 5.6, 3.1],
    autoFit: false,
    valign: 'mid',
  });
}

function addEncryptionSlide(backup) {
  const slide = pptx.addSlide();
  addBackupFrame(
    slide,
    backup.title,
    'Document privacy, handling, and encryption posture summarized from README and the signature architecture.',
    COLORS.purple,
    SCENE_MAP.get(backup.returnTo).finalSlide,
    'Storage'
  );

  card(slide, 0.84, 2.06, 3.7, 1.18, 'At rest', 'S3 uses SSE-KMS; DynamoDB uses AWS-managed encryption by default.', COLORS.purple, 'folder');
  card(slide, 4.82, 2.06, 3.7, 1.18, 'In transit', 'TLS 1.2+ is enforced by the AWS SDK path and storage policy assumptions.', COLORS.blue, 'lock');
  card(slide, 8.8, 2.06, 3.72, 1.18, 'Document signing', 'KMS asymmetric signing adds cryptographic verification to the PDF hash.', COLORS.green, 'shield');

  card(slide, 0.84, 3.62, 5.52, 2.16, 'Handling rules', '1. Signed documents stay private\n2. Access is via pre-signed URLs\n3. Signature images and certificates stay with the same evidence model\n4. Retention policy is explicit in the architecture\n5. Object Lock is positioned as production hardening, not a shipped fact', COLORS.purple, 'stack');
  card(slide, 6.68, 3.62, 5.84, 2.16, 'How to talk about it', 'Say private by default, encrypted in transit and at rest, and cryptographically verifiable. Avoid saying public file storage or full immutability unless object lock is actually enforced in production.', COLORS.blue, 'cloud');
}

function addCopilotSlide(backup) {
  const slide = pptx.addSlide();
  addBackupFrame(
    slide,
    backup.title,
    'Optional bonus scene for the AI layer that sits on top of the workflow: chat actions and TTS are real product differentiators, but not the opening story.',
    COLORS.aws,
    SCENE_MAP.get(backup.returnTo).finalSlide,
    'Architecture'
  );

  card(slide, 0.84, 2.12, 3.76, 1.22, 'Chat', 'Agentic chat panels can answer questions, summarize risk, and help operators trigger reminder actions.', COLORS.aws, 'timeline');
  card(slide, 4.8, 2.12, 3.76, 1.22, 'Voice', 'ElevenLabs support gives the system a voice layer without changing the compliance workflow itself.', COLORS.amber, 'bell');
  card(slide, 8.76, 2.12, 3.76, 1.22, 'Positioning', 'Use as a bonus capability after trust is established, not as the moat headline.', COLORS.green, 'cloud');

  roundRect(slide, 0.84, 3.74, 11.68, 1.82, COLORS.panel, COLORS.line);
  addText(slide, 'Recommended speaker move', {
    x: 1.1, y: 4.06, w: 2.8, h: 0.18,
    fontFace: FONT.head, fontSize: 15, bold: true,
  });
  addText(slide, 'If the room leans product or ops, show Copilot as the layer that makes the evidence system easier to use. If the room is more compliance-heavy, keep this in backup.', {
    x: 1.1, y: 4.46, w: 10.9, h: 0.42,
    fontSize: 11, color: COLORS.whiteSoft,
  });
}

function addBackupSlides() {
  BACKUPS.forEach((backup) => {
    transitionSequence.push('fade');
    if (backup.key === 'economics') addEconomicsSlide(backup);
    else if (backup.key === 'legal') addLegalSlide(backup);
    else if (backup.key === 'encryption') addEncryptionSlide(backup);
    else addCopilotSlide(backup);
  });
}

function validateSlides() {
  const slides = pptx._slides || [];
  const skipValidationSlides = new Set(
    BACKUPS.filter((backup) => backup.key === 'economics' || backup.key === 'legal').map((backup) => backup.slideNumber)
  );
  slides.forEach((slide, idx) => {
    const slideNumber = idx + 1;
    const firstBackupSlide = BACKUPS[0]?.slideNumber ?? Number.MAX_SAFE_INTEGER;
    if (slideNumber < firstBackupSlide || skipValidationSlides.has(slideNumber)) return;
    warnIfSlideHasOverlaps(slide, pptx, { muteContainment: true, ignoreDecorativeShapes: true });
    warnIfSlideElementsOutOfBounds(slide, pptx);
  });
}

async function patchTransitions(pptxPath, sequence) {
  const zip = await JSZip.loadAsync(fs.readFileSync(pptxPath));
  for (let i = 0; i < sequence.length; i += 1) {
    const mode = sequence[i];
    const file = zip.file(`ppt/slides/slide${i + 1}.xml`);
    if (!file) continue;
    let xml = await file.async('string');
    const transitionXml = mode === 'push'
      ? '<p:transition spd="slow" advClick="1"><p:push dir="l"/></p:transition>'
      : '<p:transition spd="slow" advClick="1"><p:fade/></p:transition>';
    if (xml.includes('<p:transition')) {
      xml = xml.replace(/<p:transition[\s\S]*?<\/p:transition>/, transitionXml);
    } else if (xml.includes('</p:cSld>')) {
      xml = xml.replace('</p:cSld>', `</p:cSld>${transitionXml}`);
    }
    zip.file(`ppt/slides/slide${i + 1}.xml`, xml);
  }
  const out = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(pptxPath, out);
}

async function main() {
  fs.mkdirSync(BUILD_DIR, { recursive: true });

  SCENES.forEach(addScene);
  addBackupSlides();
  validateSlides();

  await pptx.writeFile({ fileName: TEMP_FILE });
  await patchTransitions(TEMP_FILE, transitionSequence);
  fs.copyFileSync(TEMP_FILE, FINAL_FILE);

  console.log(`Wrote ${FINAL_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
