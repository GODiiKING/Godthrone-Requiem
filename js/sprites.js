// ============================================================================
// [SPRITE MODIFICATION MARKER 1]
// UNIT DEFINITIONS & SPRITE ASSETS
// Replace the emoji property with an image sprite if you want 2D artwork:
// Example:
//   const guardianSprite = new Image();
//   guardianSprite.src = './images/guardian.png';
// ============================================================================

function createPlayer(startPos){
  return {
    type: 'player', 
    name: 'Guardian', 
    // [SPRITE MODIFICATION HERE] Swap emoji for: sprite: guardianSprite
    emoji: '🛡️', 
    color: '#5dc8ff',
    x: startPos.x, 
    y: startPos.y,
    hp: 100, maxHp: 100, atk: 18, def: 6, mag: 40, maxMag: 40, moveRange: 4,
    moving: false, pathQueue: [], px: 0, py: 0, _onArrive: null
  };
}

function createEnemy(startPos){
  return {
    type: 'enemy', 
    name: 'Fiend', 
    // [SPRITE MODIFICATION HERE] Swap emoji for: sprite: fiendSprite
    emoji: '👹', 
    color: '#ff5d5d',
    x: startPos.x, 
    y: startPos.y,
    hp: 90, maxHp: 90, atk: 14, def: 5, mag: 0, maxMag: 0, moveRange: 3,
    moving: false, pathQueue: [], px: 0, py: 0, _onArrive: null
  };
}

function drawUnit(ctx, u, config){
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

  // ============================================================================
  // [SPRITE MODIFICATION MARKER 2]
  // RENDERING THE CHARACTER ON CANVAS
  // To draw a custom image sprite instead of text emoji, replace the 4 lines
  // below with:
  //
  //   const size = TILE * 0.8;
  //   ctx.drawImage(u.sprite, u.px - size/2, u.py - size/2, size, size);
  // ============================================================================
  ctx.font = '36px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(u.emoji, u.px, u.py + 2);
  // ============================================================================

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
}