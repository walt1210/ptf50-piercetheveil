// Canvas 2D drawing for the try-on preview. Pure functions of (context, geometry); no React.

const METAL = {
  silver: { light: "#ffffff", mid: "#cdd3d9", dark: "#666a70", line: "#e6ebef" },
  gold: { light: "#ffe2a4", mid: "#e8b952", dark: "#9d5d14", line: "#e9b94e" },
};
const metal = (finish) => METAL[finish] ?? METAL.silver;

function ball(ctx, x, y, r, finish) {
  const m = metal(finish);
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, m.light);
  g.addColorStop(0.5, m.mid);
  g.addColorStop(1, m.dark);
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = r * 0.8;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function stroke(ctx, finish, width, blur = 0.55) {
  ctx.strokeStyle = metal(finish).line;
  ctx.lineWidth = Math.max(2, width);
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = width * blur * 2;
}

function hang(ctx, { center: { x, y }, r }, finish) {
  ctx.save();
  stroke(ctx, finish, r * 0.3);
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.7, r * 0.82, r * 1.3, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function ring(ctx, { center: { x, y }, r }, finish) {
  ctx.save();
  stroke(ctx, finish, r * 0.28);
  ctx.beginPath();
  ctx.arc(x, y, r * 1.15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drop(ctx, { center: { x, y }, r }, finish) {
  const color = metal(finish).line;
  ctx.save();
  ctx.fillStyle = color;
  stroke(ctx, finish, r * 0.22, 0.5);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + r * 1.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + r * 1.45);
  ctx.lineTo(x + r * 0.62, y + r * 2.15);
  ctx.lineTo(x, y + r * 2.8);
  ctx.lineTo(x - r * 0.62, y + r * 2.15);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function bar(ctx, [a, b], r, finish, bend = 0) {
  ctx.save();
  stroke(ctx, finish, r * 0.4, 0.4);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  if (bend) {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const nx = -(b.y - a.y);
    const ny = b.x - a.x;
    const k = (bend * 0.28 * r * 3) / (Math.hypot(nx, ny) || 1);
    ctx.quadraticCurveTo(mx + nx * k, my + ny * k, b.x, b.y);
  } else {
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.restore();
  ball(ctx, a.x, a.y, r, finish);
  ball(ctx, b.x, b.y, r, finish);
}

function horseshoe(ctx, { center: { x, y }, r }, finish) {
  const gap = (28 * Math.PI) / 180; // opening faces up, hidden in the nose
  const start = -Math.PI / 2 + gap;
  const end = -Math.PI / 2 - gap + Math.PI * 2;
  ctx.save();
  stroke(ctx, finish, r * 0.22);
  ctx.beginPath();
  ctx.arc(x, y, r, start, end, false);
  ctx.stroke();
  ctx.restore();
  const bead = Math.max(2.5, r * 0.17);
  ball(ctx, x + Math.cos(start) * r, y + Math.sin(start) * r, bead, finish);
  ball(ctx, x + Math.cos(end) * r, y + Math.sin(end) * r, bead, finish);
}

export function drawPiece(ctx, piece, finish) {
  switch (piece.kind) {
    case "hang": return hang(ctx, piece, finish);
    case "ring": return ring(ctx, piece, finish);
    case "drop": return drop(ctx, piece, finish);
    case "barbell": return bar(ctx, piece.ends, piece.r, finish);
    case "curved": return bar(ctx, piece.ends, piece.r, finish, piece.bend);
    case "horseshoe": return horseshoe(ctx, piece, finish);
    default: return ball(ctx, piece.center.x, piece.center.y, piece.r, finish);
  }
}
