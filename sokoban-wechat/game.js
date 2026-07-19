// ═══════════════════════════════════════════════════════════════
//  Sokoban · 不眨眼 — WeChat Mini Game
//  推箱子微信小游戏
// ═══════════════════════════════════════════════════════════════

// ── Canvas setup ────────────────────────────────────────────
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

// ── Level data (embedded) ────────────────────────────────────
const LEVELS = {
  'prb_1': `######
#.  .#
#    #
# BB #
#&   #
######`,
  'prb_2': `########
#   .  #
#  B   #
# B    #
#  .&  #
########`,
  'prb_3': `  ####
###  #
#    #
# BB.#
#  . #
#  &##
####`,
  'prb_4': `#######
#     #
# BB  #
#. .  #
#  &  #
#######`,
  'prb_5': `  ####
  #  ###
  #    #
  # BB #
### .  #
#   .  #
#   &  #
########`,
  'prb_8': `  ######
  # ..&#
  # BB #
  ## ###
   # #
   # #
#### #
#    ##
# #   #
#   # #
###   #
  #####`,
  'prb_9': `####
#  ####
# . . #
# BBX&#
##    #
 ######`,
  'prb_11': `#####
#&  ##
#.BX #
#  # #
#    #
######`,
  'prb_24': `  ######
###.&.# 
# BB#B##
#      #
### .  #
  # X  #
  ######`,
};

const CHAR = { ' ': 0, '#': 1, '&': 2, 'B': 3, '.': 4, 'X': 5 };
const ACTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // up down left right

// ── Game state ───────────────────────────────────────────────
let board    = null;   // 2D: char→num (the parsed layout)
let sFix     = null;   // 2D: only walls(1), targets(4), floor(0)
let player   = null;   // [r, c]
let boxes    = null;   // [[r,c], ...]
let moves    = 0;
let gameOver = false;
let levels   = [];
let curLevel = 0;

// ── Init ─────────────────────────────────────────────────────
const EMPTY_MAP = { 0: 0, 1: 1, 2: 0, 3: 0, 4: 4, 5: 4 };

function parseBoard(str) {
  const lines = str.trim().split('\n');
  const maxW = Math.max(...lines.map(l => l.length));
  return lines.map(l => {
    const padded = l.padEnd(maxW, '#');
    return padded.split('').map(c => CHAR[c] || 0);
  });
}

function boardToState(bd) {
  const fix = bd.map(row => row.map(c => EMPTY_MAP[c]));
  let pl = null;
  const bx = [];
  for (let r = 0; r < bd.length; r++) {
    for (let c = 0; c < bd[r].length; c++) {
      if (bd[r][c] === 2) pl = [r, c];
      if (bd[r][c] === 3 || bd[r][c] === 5) bx.push([r, c]);
    }
  }
  return { fix, player: pl, boxes: bx };
}

function loadLevel(idx) {
  const name = levels[idx];
  board = parseBoard(LEVELS[name]);
  const st = boardToState(board);
  sFix = st.fix;
  player = st.player;
  boxes = st.boxes;
  moves = 0;
  gameOver = false;
}

function reset() {
  const st = boardToState(board);
  sFix = st.fix;
  player = st.player;
  boxes = st.boxes;
  moves = 0;
  gameOver = false;
}

function isSolved() {
  let totalTargets = 0;
  let boxesOnTarget = 0;
  for (let r = 0; r < sFix.length; r++) {
    for (let c = 0; c < sFix[r].length; c++) {
      if (sFix[r][c] === 4) {
        totalTargets++;
        if (boxes.some(b => b[0] === r && b[1] === c)) boxesOnTarget++;
      }
    }
  }
  return totalTargets > 0 && boxesOnTarget === totalTargets;
}

function step(dr, dc) {
  if (gameOver) return false;
  const nr = player[0] + dr;
  const nc = player[1] + dc;

  if (nr < 0 || nr >= sFix.length || nc < 0 || nc >= sFix[0].length) return false;
  if (sFix[nr][nc] === 1) return false;

  const boxIdx = boxes.findIndex(b => b[0] === nr && b[1] === nc);

  if (boxIdx >= 0) {
    const br = nr + dr;
    const bc = nc + dc;
    if (br < 0 || br >= sFix.length || bc < 0 || bc >= sFix[0].length) return false;
    if (sFix[br][bc] === 1) return false;
    if (boxes.some(b => b[0] === br && b[1] === bc)) return false;
    boxes[boxIdx] = [br, bc];
  }

  player = [nr, nc];
  moves++;
  gameOver = isSolved();
  return true;
}

// ── Layout constants ─────────────────────────────────────────
const TOP_H    = 100;   // title + info bar
const BOT_H    = 200;   // controls area
const CELL     = Math.min(
  Math.floor((W - 20) / 20),
  Math.floor((H - TOP_H - BOT_H - 20) / 20)
);

function gameAreaHeight() { return H - TOP_H - BOT_H; }

// ── Render ───────────────────────────────────────────────────
function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function circ(x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function text(t, x, y, size, color, align) {
  ctx.fillStyle = color;
  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t, x, y);
}

function drawRoundedRect(x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function render() {
  if (!sFix || !board) return;
  const rows = sFix.length;
  const cols = sFix[0].length;
  const boardW = cols * CELL;
  const boardH = rows * CELL;
  const boardX = Math.floor((W - boardW) / 2);
  const boardY = TOP_H + Math.floor((gameAreaHeight() - boardH) / 2);

  ctx.clearRect(0, 0, W, H);

  // Background
  rect(0, 0, W, H, '#1a1a2e');

  // ── Top bar ────────────────────────────────────────────
  const name = levels[curLevel];
  rect(0, 0, W, TOP_H, '#16213e');
  text('🎮 Sokoban · 不眨眼', W / 2, 24, 18, '#ffffff');
  text(`Level: ${name.replace('prb_', '')}  |  #${curLevel + 1}/${levels.length}`, W / 2, 48, 14, '#8ab4f8');
  text(`Moves: ${moves}`, W / 2, 72, 16, '#f39c12');

  // ── Board ──────────────────────────────────────────────
  rect(boardX - 2, boardY - 2, boardW + 4, boardH + 4, 'rgba(255,255,255,0.05)');

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = boardX + c * CELL;
      const y = boardY + r * CELL;
      const ft = sFix[r][c];
      const isPl = player[0] === r && player[1] === c;
      const boxIdx = boxes.findIndex(b => b[0] === r && b[1] === c);

      if (ft === 1) {
        // Wall
        rect(x, y, CELL, CELL, '#4a5568');
        rect(x + 1, y + 1, CELL - 2, CELL - 2, '#2d3748');
      } else {
        // Floor
        rect(x, y, CELL, CELL, '#1a1a2e');
        // Target
        if (ft === 4) circ(x + CELL / 2, y + CELL / 2, CELL / 5, '#e67e22');
      }

      // Box
      if (boxIdx >= 0) {
        const onTarget = ft === 4;
        const pad = 3;
        drawRoundedRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, 3,
          onTarget ? '#27ae60' : '#3498db');
      }

      // Player
      if (isPl) {
        circ(x + CELL / 2, y + CELL / 2, CELL / 3, '#e74c3c');
        text('☺', x + CELL / 2, y + CELL / 2 + 1, CELL * 0.45, '#ffffff');
      }
    }
  }

  // ── Bottom controls ─────────────────────────────────────
  const cy = H - BOT_H;
  rect(0, cy, W, BOT_H, '#16213e');

  // D-pad
  const dpadCX = W / 3;
  const dpadCY = cy + BOT_H / 2;
  const dpadR  = 60;

  // Draw d-pad buttons
  const dirs = [
    { label: '▲', x: dpadCX, y: dpadCY - dpadR, dr: -1, dc: 0 },   // up
    { label: '▼', x: dpadCX, y: dpadCY + dpadR, dr: 1, dc: 0 },    // down
    { label: '◀', x: dpadCX - dpadR, y: dpadCY, dr: 0, dc: -1 },   // left
    { label: '▶', x: dpadCX + dpadR, y: dpadCY, dr: 0, dc: 1 },    // right
  ];

  dirs.forEach(d => {
    circ(d.x, d.y, 26, 'rgba(255,255,255,0.15)');
    text(d.label, d.x, d.y + 1, 22, '#ffffff');
  });

  // Center circle
  circ(dpadCX, dpadCY, 18, 'rgba(255,255,255,0.08)');

  // Action buttons (right side)
  const btnX = W * 2 / 3;
  const btns = [
    { label: '🔄 重置', y: cy + 40, action: reset },
    { label: '◀ 上关', y: cy + 90, action: () => { if (curLevel > 0) { curLevel--; loadLevel(curLevel); } } },
    { label: '下关 ▶', y: cy + 140, action: () => { if (curLevel < levels.length - 1) { curLevel++; loadLevel(curLevel); } } },
  ];

  btns.forEach(b => {
    drawRoundedRect(btnX - 55, b.y - 18, 110, 36, 10,
      'rgba(255,255,255,0.12)');
    text(b.label, btnX, b.y, 15, '#ffffff');
  });

  // Win overlay
  if (gameOver) {
    const ovW = 220, ovH = 80;
    const ovX = (W - ovW) / 2, ovY = (H - ovH) / 2;
    drawRoundedRect(ovX, ovY, ovW, ovH, 12, '#00b894');
    text('🎉  过关！', W / 2, ovY + ovH / 2 - 6, 22, '#ffffff');
    text('点击任意处继续', W / 2, ovY + ovH / 2 + 22, 12, 'rgba(255,255,255,0.8)');
  }
}

// ── Touch handling ──────────────────────────────────────────
// Map touch coordinates to d-pad / buttons
function hitTest(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) <= r + 5;
}

function handleTouch(x, y) {
  if (gameOver) {
    // Any touch dismisses win and advances
    gameOver = false;
    if (curLevel < levels.length - 1) { curLevel++; loadLevel(curLevel); }
    else reset();
    render();
    return;
  }

  const cy = H - BOT_H;
  const dpadCX = W / 3, dpadCY = cy + BOT_H / 2, dpadR = 60;
  const btnX = W * 2 / 3;

  // D-pad or action buttons
  if (hitTest(x, y, dpadCX, dpadCY - dpadR, 26)) {
    step(-1, 0);
  } else if (hitTest(x, y, dpadCX, dpadCY + dpadR, 26)) {
    step(1, 0);
  } else if (hitTest(x, y, dpadCX - dpadR, dpadCY, 26)) {
    step(0, -1);
  } else if (hitTest(x, y, dpadCX + dpadR, dpadCY, 26)) {
    step(0, 1);
  } else if (x >= btnX - 55 && x <= btnX + 55) {
    if (y >= cy + 22 && y <= cy + 58) {
      reset();
    } else if (y >= cy + 72 && y <= cy + 108) {
      if (curLevel > 0) { curLevel--; loadLevel(curLevel); }
    } else if (y >= cy + 122 && y <= cy + 158) {
      if (curLevel < levels.length - 1) { curLevel++; loadLevel(curLevel); }
    }
  }

  render();
}

wx.onTouchEnd(e => {
  if (e.changedTouches.length > 0) {
    const t = e.changedTouches[0];
    handleTouch(t.clientX, t.clientY);
  }
});

// ── Start ────────────────────────────────────────────────────
levels = Object.keys(LEVELS).sort((a, b) => {
  const na = parseInt(a.split('_')[1]);
  const nb = parseInt(b.split('_')[1]);
  return na - nb;
});
loadLevel(0);
render();

wx.showToast({ title: '推箱子 · 不眨眼', icon: 'none', duration: 1500 });
