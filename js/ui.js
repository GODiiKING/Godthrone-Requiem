// ============================================================================
// UI RENDERING, LOGGING & FLOATING TEXT MANAGERS
// ============================================================================

window.floatingTexts = [];

window.spawnFloatingText = function(gx, gy, text, color){
  window.floatingTexts.push({ 
    x: gx * window.TILE + window.TILE / 2, 
    y: gy * window.TILE + window.TILE / 2 - 10, 
    text, 
    color, 
    life: 1.0, 
    vy: -40 
  });
};

window.updateFloatingTexts = function(dt){
  for(let i = window.floatingTexts.length - 1; i >= 0; i--){
    const f = window.floatingTexts[i];
    f.y += f.vy * dt;
    f.life -= dt * 1.1;
    if(f.life <= 0) window.floatingTexts.splice(i, 1);
  }
};

window.addLog = function(msg){
  const logEl = document.getElementById('log');
  const p = document.createElement('div');
  p.textContent = msg;
  logEl.appendChild(p);
  logEl.scrollTop = logEl.scrollHeight;
  while(logEl.children.length > 60) logEl.removeChild(logEl.firstChild);
};

window.updateUI = function(state){
  const { player, enemy, turn, mode, hasMovedThisTurn, hasActedThisTurn, gameOver, isBusy } = state;
  const turnIndicator = document.getElementById('turnIndicator');
  const playerHpFill = document.getElementById('playerHpFill');
  const playerHpText = document.getElementById('playerHpText');
  const playerMagFill = document.getElementById('playerMagFill');
  const playerMagText = document.getElementById('playerMagText');
  const enemyHpFill = document.getElementById('enemyHpFill');
  const enemyHpText = document.getElementById('enemyHpText');
  const distanceReadout = document.getElementById('distanceReadout');
  const btnMove = document.getElementById('btnMove');
  const btnAttack = document.getElementById('btnAttack');
  const btnMagic = document.getElementById('btnMagic');
  const btnEndTurn = document.getElementById('btnEndTurn');

  turnIndicator.textContent = gameOver ? 'BATTLE OVER' : (turn === 'player' ? 'PLAYER TURN' : 'ENEMY TURN');
  turnIndicator.className = turn === 'player' ? 'turn-player' : 'turn-enemy';

  playerHpFill.style.width = Math.max(0, 100 * player.hp / player.maxHp) + '%';
  playerHpText.textContent = player.hp + ' / ' + player.maxHp;
  playerMagFill.style.width = Math.max(0, 100 * player.mag / player.maxMag) + '%';
  playerMagText.textContent = player.mag + ' / ' + player.maxMag;

  enemyHpFill.style.width = Math.max(0, 100 * enemy.hp / enemy.maxHp) + '%';
  enemyHpText.textContent = enemy.hp + ' / ' + enemy.maxHp;

  const dist = window.manhattan(player, enemy);
  distanceReadout.textContent = 'Distance to ' + enemy.name + ': ' + dist;

  const busy = isBusy();
  const myTurn = turn === 'player' && !gameOver && !busy;
  btnMove.disabled = !myTurn || hasMovedThisTurn;
  btnMove.classList.toggle('active', mode === 'selectMove');
  btnAttack.disabled = !myTurn || hasActedThisTurn || dist > 1;
  btnMagic.disabled = !myTurn || hasActedThisTurn || dist > window.SPELL_RANGE || player.mag < window.SPELL_COST;
  btnEndTurn.disabled = !myTurn;
};

window.showGameOver = function(won, enemyName, onComplete){
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayText = document.getElementById('overlayText');
  overlay.classList.remove('hidden');
  overlayTitle.textContent = won ? 'VICTORY' : 'DEFEAT';
  overlayTitle.className = won ? 'victory' : 'defeat';
  overlayText.textContent = won ? ('You have vanquished the ' + enemyName + '.') : ('You have fallen before the ' + enemyName + '.');
  if(onComplete) onComplete();
};