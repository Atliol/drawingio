const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
const colorPicker = document.getElementById('color');
const swatches = document.querySelectorAll('.swatch');
const sizeSlider = document.getElementById('size');
const sizePreview = document.getElementById('size-preview');
const imgInput = document.getElementById('imgInput');
const newBtn = document.getElementById('newBtn');
const clearBtn = document.getElementById('clear');
const saveBtn = document.getElementById('saveBtn');
const nightBtn = document.getElementById('nightBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const statusTool = document.getElementById('status-tool');
const statusColor = document.getElementById('status-color');
const statusSize = document.getElementById('status-size');
const statusX = document.getElementById('status-x');
const statusY = document.getElementById('status-y');

const MAX_STACK = 50;
let undoStack = [];
let redoStack = [];

let tool = 'brush';
let drawing = false;
let startX = 0, startY = 0;
let lastX = 0, lastY = 0;
let imgData = null;
let color = colorPicker.value;
let size = +sizeSlider.value;
let nightMode = false;

// Responsive canvas resize, preserving content
function resizeCanvas() {
  const dataUrl = canvas.toDataURL();
  let width = 700, height = 440;
  if (window.innerWidth < 800) { width = window.innerWidth * 0.97; height = width * 0.6; }
  if (window.innerWidth < 580) { width = window.innerWidth * 0.98; height = width * 0.8; }
  canvas.width = width;
  canvas.height = height;
  const img = new window.Image();
  img.onload = () => ctx.drawImage(img, 0, 0, width, height);
  img.src = dataUrl;
}
window.addEventListener('resize', resizeCanvas);
window.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
  updateStatus();
  updateSizePreview();
  if (localStorage.getItem('paintAppNight') === "true") setNightMode(true);
  updateUndoRedoButtons();
});

toolBtns.forEach(btn => {
  btn.onclick = () => {
    toolBtns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    tool = btn.dataset.tool;
    updateStatus();
  };
});
document.querySelector('.tool-btn[data-tool="brush"]').classList.add('active');

colorPicker.addEventListener('input', e => {
  color = e.target.value;
  updateStatus();
  updateSizePreview();
});
swatches.forEach(sw => {
  sw.onclick = () => {
    color = sw.style.backgroundColor;
    colorPicker.value = rgb2hex(color);
    updateStatus();
    updateSizePreview();
    swatches.forEach(s=>s.classList.remove('active'));
    sw.classList.add('active');
  }
});

sizeSlider.addEventListener('input', e => {
  size = +e.target.value;
  updateSizePreview();
  updateStatus();
});
function updateSizePreview() {
  sizePreview.innerHTML = `<svg width="24" height="24"><circle cx="12" cy="12" r="${size/2}" fill="${color}" /></svg>`;
}

function rgb2hex(rgb) {
  if (!rgb.startsWith('rgb')) return rgb;
  let [r,g,b]=rgb.replace(/[^\d,]/g,'').split(',').map(Number);
  return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

function updateStatus(x=0, y=0) {
  statusTool.textContent = tool.charAt(0).toUpperCase()+tool.slice(1);
  statusColor.style.background = color;
  statusSize.textContent = size;
  statusX.textContent = Math.round(x);
  statusY.textContent = Math.round(y);
}

canvas.addEventListener('mousemove', e => {
  let pos = getPointerPos(e);
  updateStatus(pos.x, pos.y);
});
canvas.addEventListener('mouseleave', () => updateStatus(0,0));

function getPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  let x, y;
  if (e.touches) {
    x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
  } else {
    x = (e.clientX - rect.left) * (canvas.width / rect.width);
    y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  return {x, y};
}

// UNDO/REDO stack logic
function pushUndo() {
  if (undoStack.length >= MAX_STACK) undoStack.shift();
  undoStack.push(canvas.toDataURL());
  redoStack.length = 0;
  updateUndoRedoButtons();
}

function restoreFromDataUrl(dataUrl) {
  const img = new window.Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = dataUrl;
}

undoBtn.onclick = function() {
  if (undoStack.length === 0) return;
  redoStack.push(canvas.toDataURL());
  const dataUrl = undoStack.pop();
  restoreFromDataUrl(dataUrl);
  updateUndoRedoButtons();
};
redoBtn.onclick = function() {
  if (redoStack.length === 0) return;
  undoStack.push(canvas.toDataURL());
  const dataUrl = redoStack.pop();
  restoreFromDataUrl(dataUrl);
  updateUndoRedoButtons();
};
function updateUndoRedoButtons() {
  undoBtn.disabled = undoStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

function drawStar(cx, cy, spikes, outerRadius, innerRadius, stroke = true) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  if (stroke) ctx.stroke();
}

// DRAWING LOGIC
function beginDraw(e) {
  if (tool === "text") {
    const {x, y} = getPointerPos(e);
    const text = prompt("Enter text :");
    if (text) {
      pushUndo();
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = `${size * 2}px Inter,Arial,sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(text, x, y);
      ctx.restore();
    }
    updateStatus(x, y);
    return;
  }
  if (tool === "label") {
    const {x, y} = getPointerPos(e);
    const text = prompt("Enter label text:");
    if (text) {
      pushUndo();
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.font = `${size * 2}px Inter,Arial,sans-serif`;
      const metrics = ctx.measureText(text);
      const padding = 8;
      const boxWidth = metrics.width + padding * 2;
      const boxHeight = size * 2 + padding * 2;
      ctx.beginPath();
      ctx.rect(x, y, boxWidth, boxHeight);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.textBaseline = 'top';
      ctx.fillText(text, x + padding, y + padding);
      ctx.restore();
    }
    updateStatus(x, y);
    return;
  }
  pushUndo();
  drawing = true;
  const {x, y} = getPointerPos(e);
  startX = lastX = x;
  startY = lastY = y;
  if (['line','rect','ellipse','star'].includes(tool)) {
    imgData = ctx.getImageData(0,0,canvas.width,canvas.height);
  }
  if (tool === 'brush' || tool === 'eraser') {
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  if (tool === 'picker') {
    let px = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    let hex = "#"+((1<<24)+(px[0]<<16)+(px[1]<<8)+px[2]).toString(16).slice(1);
    color = hex;
    colorPicker.value = hex;
    updateStatus();
    updateSizePreview();
    drawing = false;
  }
}
function drawMove(e) {
  if (!drawing) return;
  const {x, y} = getPointerPos(e);
  if (tool === 'brush') {
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  if (tool === 'eraser') {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = size+4;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  if (['line','rect','ellipse','star'].includes(tool)) {
    ctx.putImageData(imgData, 0, 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    if (tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    if (tool === 'rect') {
      ctx.strokeRect(startX, startY, x-startX, y-startY);
    }
    if (tool === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse((startX+x)/2, (startY+y)/2, Math.abs(x-startX)/2, Math.abs(y-startY)/2, 0, 0, 2*Math.PI);
      ctx.stroke();
    }
    if (tool === 'star') {
      let centerX = (startX + x) / 2;
      let centerY = (startY + y) / 2;
      let spikes = 5;
      let outerRadius = Math.hypot(x - startX, y - startY) / 2;
      let innerRadius = outerRadius * 0.5;
      drawStar(centerX, centerY, spikes, outerRadius, innerRadius);
    }
  }
  lastX = x; lastY = y;
  updateStatus(x, y);
}
function endDraw(e) {
  if (!drawing) return;
  drawing = false;
  const {x, y} = getPointerPos(e);
  if (tool === 'brush' || tool === 'eraser') {
    ctx.closePath();
  }
  if (['line','rect','ellipse','star'].includes(tool)) {
    ctx.putImageData(imgData, 0, 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    if (tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    if (tool === 'rect') {
      ctx.strokeRect(startX, startY, x-startX, y-startY);
    }
    if (tool === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse((startX+x)/2, (startY+y)/2, Math.abs(x-startX)/2, Math.abs(y-startY)/2, 0, 0, 2*Math.PI);
      ctx.stroke();
    }
    if (tool === 'star') {
      let centerX = (startX + x) / 2;
      let centerY = (startY + y) / 2;
      let spikes = 5;
      let outerRadius = Math.hypot(x - startX, y - startY) / 2;
      let innerRadius = outerRadius * 0.5;
      drawStar(centerX, centerY, spikes, outerRadius, innerRadius);
    }
  }
  updateStatus(x, y);
}

canvas.addEventListener('mousedown', beginDraw);
canvas.addEventListener('mousemove', drawMove);
canvas.addEventListener('mouseup', endDraw);
canvas.addEventListener('mouseleave', ()=>drawing=false);
canvas.addEventListener('touchstart', e=>{beginDraw(e); e.preventDefault();});
canvas.addEventListener('touchmove', e=>{drawMove(e); e.preventDefault();});
canvas.addEventListener('touchend', e=>{endDraw(e); e.preventDefault();});
canvas.addEventListener('touchcancel', ()=>drawing=false);

// Upload image
imgInput.addEventListener('change', function() {
  if (!this.files[0]) return;
  pushUndo();
  const file = this.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new window.Image();
    img.onload = function() {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// New (clear all)
newBtn.onclick = () => {
  if (confirm("Start new drawing? Unsaved changes will be lost.")) {
    pushUndo();
    ctx.clearRect(0,0,canvas.width,canvas.height);
  }
}

// Clear (broom icon)
clearBtn.addEventListener('click', () => {
  pushUndo();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Save (download)
saveBtn.onclick = () => {
  const link = document.createElement('a');
  link.download = 'paint.png';
  link.href = canvas.toDataURL();
  link.click();
}

// Night mode
function setNightMode(on) {
  document.body.classList.toggle('night', on);
  nightMode = on;
  nightBtn.innerHTML = on ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  localStorage.setItem('paintAppNight', on ? "true" : "false");
}
nightBtn.onclick = () => setNightMode(!nightMode);