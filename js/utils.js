// ============================================================================
// GAME CONSTANTS & MATH UTILITIES
// ============================================================================

window.COLS = 8;
window.ROWS = 6;
window.TILE = 64;
window.PLAYER_START = { x: 1, y: 4 };
window.ENEMY_START = { x: 6, y: 1 };
window.SPELL_COST = 15;
window.SPELL_RANGE = 3;
window.SPELL_POWER = 28;

window.rand = function(min, max){ 
  return Math.floor(Math.random() * (max - min + 1)) + min; 
};

window.manhattan = function(a, b){ 
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); 
};

window.hexToRgba = function(hex, alpha){
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
};

window.getReachableTiles = function(startX, startY, range, blocked){
  const key = (x,y) => x + ',' + y;
  const start = { x: startX, y: startY, dist: 0, prev: null };
  const visited = new Map();
  visited.set(key(startX,startY), start);
  const queue = [start];
  let qi = 0;
  while(qi < queue.length){
    const cur = queue[qi++];
    if(cur.dist >= range) continue;
    const deltas = [[1,0],[-1,0],[0,1],[0,-1]];
    for(const [dx,dy] of deltas){
      const nx = cur.x + dx, ny = cur.y + dy;
      if(nx < 0 || nx >= window.COLS || ny < 0 || ny >= window.ROWS) continue;
      if(blocked.some(b => b.x === nx && b.y === ny)) continue;
      const k = key(nx,ny);
      if(visited.has(k)) continue;
      const node = { x: nx, y: ny, dist: cur.dist + 1, prev: cur };
      visited.set(k, node);
      queue.push(node);
    }
  }
  return visited;
};

window.reconstructPath = function(node){
  const path = [];
  let n = node;
  while(n && n.prev){ 
    path.unshift({ x: n.x, y: n.y }); 
    n = n.prev; 
  }
  return path;
};