// ============================================================================
// [SPRITE MODIFICATION MARKER 1]
// UNIT DEFINITIONS & SPRITE ASSETS
// ============================================================================

// Preload sprite image assets using relative paths from your project root
const playerSprite = new Image();
playerSprite.src = './images/player/player.png';

const enemySprite = new Image();
enemySprite.src = './images/enemy/enemy.png';

window.createPlayer = function(startPos){
  return {
    type: 'player', 
    name: 'Guardian', 
    sprite: playerSprite,
    color: '#5dc8ff',
    x: startPos.x, 
    y: startPos.y,
    hp: 100, maxHp: 100, atk: 18, def: 6, mag: 40, maxMag: 40, moveRange: 4,
    moving: false, pathQueue: [], px: 0, py: 0, _onArrive: null
  };
};

window.createEnemy = function(startPos){
  return {
    type: 'enemy', 
    name: 'Fiend', 
    sprite: enemySprite,
    color: '#ff5d5d',
    x: startPos.x, 
    y: startPos.y,
    hp: 90, maxHp: 90, atk: 14, def: 5, mag: 0, maxMag: 0, moveRange: 3,
    moving: false, pathQueue: [], px: 0, py: 0, _onArrive: null
  };
};

// ============================================================================
// [SPRITE MODIFICATION MARKER 2]
// RENDERING THE CHARACTER ON CANVAS
// ============================================================================

window.drawUnit = function(ctx, u, config){
  const { TILE, clock, gameOver, turn, hexToRgba } = config;
  const isActive = !gameOver && ((turn === 'player' && u.type === 'player') || (turn === 'enemy' && u.type === 'enemy'));
  
  // Draw active turn selection ring
  if(isActive){
    ctx.save();
    ctx.beginPath();
    const r = TILE*0.42 + 3*Math.sin(clock*5);
    ctx.arc(u.px, u.py, r, 0, Math.PI*2);
    ctx.strokeStyle = u.type === 'player' ? 'rgba(93,200,255,0.8)' : 'rgba(255,93,93,0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // Draw tile background glow
  ctx.beginPath();
  ctx.arc(u.px, u.py, TILE*0.38, 0, Math.PI*2);
  ctx.fillStyle = hexToRgba(u.color, 0.18);
  ctx.fill();

  // Draw 2D image sprite centered on the unit coordinates
  const size = TILE * 0.85;
  if(u.sprite && u.sprite.complete){
    ctx.drawImage(u.sprite, u.px - size/2, u.py - size/2, size, size);
  } else {
    // Fallback loading indicator just in case the PNG is still fetching
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⏳', u.px, u.py);
  }

  // Draw health bar above unit
  const barW = TILE*0.7, barH = 6;
  const bx = u.px - barW/2, by = u.py - TILE*0.46;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(bx, by, barW, barH);
  const pct = Math.max(0, u.hp / u.maxHp);
  ctx.fillStyle = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#ffb020' : '#e53935';
  ctx.fillRect(bx, by, barW*pct, barH);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.strokeRect(bx, by, barW, barH);
};