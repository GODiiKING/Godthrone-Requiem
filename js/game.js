// ============================================================================
// MAIN BATTLE ENGINE & ANIMATION CONTROLLER
// ============================================================================

(function(){
  const canvas = document.getElementById('grid');
  const ctx = canvas.getContext('2d');
  const btnMove = document.getElementById('btnMove');
  const btnAttack = document.getElementById('btnAttack');
  const btnMagic = document.getElementById('btnMagic');
  const btnEndTurn = document.getElementById('btnEndTurn');
  const btnRestart = document.getElementById('btnRestart');
  const overlay = document.getElementById('overlay');

  let player, enemy, turn, mode, hasMovedThisTurn, hasActedThisTurn, gameOver;
  let reachable = new Map();
  let clock = 0;
  let lastTime = performance.now();

  function isBusy(){ return player.moving || enemy.moving; }

  function getUIState(){
    return { player, enemy, turn, mode, hasMovedThisTurn, hasActedThisTurn, gameOver, isBusy };
  }

  function startMove(unit, path, onDone){
    if(path.length === 0){ if(onDone) onDone(); return; }
    unit.pathQueue = path.slice();
    unit.moving = true;
    unit._onArrive = onDone;
  }

  function updateMovement(dt){
    [player, enemy].forEach(u => {
      if(u.moving && u.pathQueue.length > 0){
        const wp = u.pathQueue[0];
        const targetPx = wp.x * window.TILE + window.TILE/2;
        const targetPy = wp.y * window.TILE + window.TILE/2;
        const dx = targetPx - u.px, dy = targetPy - u.py;
        const dist = Math.hypot(dx, dy);
        const speed = window.TILE / 0.18;
        const step = speed * dt;
        if(dist <= step){
          u.px = targetPx; u.py = targetPy; u.x = wp.x; u.y = wp.y;
          u.pathQueue.shift();
          if(u.pathQueue.length === 0){
            u.moving = false;
            const cb = u._onArrive; u._onArrive = null;
            if(cb) cb();
          }
        } else {
          u.px += dx/dist*step;
          u.py += dy/dist*step;
        }
      }
    });
  }

  function draw(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for(let gy=0; gy<window.ROWS; gy++){
      for(let gx=0; gx<window.COLS; gx++){
        ctx.fillStyle = (gx+gy)%2===0 ? '#1c1626' : '#221a30';
        ctx.fillRect(gx*window.TILE, gy*window.TILE, window.TILE, window.TILE);
      }
    }

    if(mode === 'selectMove'){
      reachable.forEach((node) => {
        if(node.dist === 0) return;
        ctx.fillStyle = 'rgba(93,200,255,0.22)';
        ctx.fillRect(node.x*window.TILE, node.y*window.TILE, window.TILE, window.TILE);
        ctx.strokeStyle = 'rgba(93,200,255,0.6)';
        ctx.strokeRect(node.x*window.TILE+1, node.y*window.TILE+1, window.TILE-2, window.TILE-2);
      });
    }

    ctx.strokeStyle = 'rgba(120,100,150,0.2)';
    for(let i=0; i<=window.COLS; i++){ 
      ctx.beginPath(); ctx.moveTo(i*window.TILE,0); ctx.lineTo(i*window.TILE,window.ROWS*window.TILE); ctx.stroke(); 
    }
    for(let j=0; j<=window.ROWS; j++){ 
      ctx.beginPath(); ctx.moveTo(0,j*window.TILE); ctx.lineTo(window.COLS*window.TILE,j*window.TILE); ctx.stroke(); 
    }

    const renderConfig = { 
      TILE: window.TILE, 
      clock, 
      gameOver, 
      turn, 
      hexToRgba: window.hexToRgba 
    };
    window.drawUnit(ctx, enemy, renderConfig);
    window.drawUnit(ctx, player, renderConfig);

    window.floatingTexts.forEach(f => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.font = 'bold 20px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    });
  }

  function getTileFromEvent(e){
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    return { gx: Math.floor(mx / window.TILE), gy: Math.floor(my / window.TILE) };
  }

  function checkGameOver(){
    if(gameOver) return;
    if(enemy.hp <= 0){ 
      gameOver = true; 
      window.showGameOver(true, enemy.name, () => window.updateUI(getUIState())); 
    }
    else if(player.hp <= 0){ 
      gameOver = true; 
      window.showGameOver(false, enemy.name, () => window.updateUI(getUIState())); 
    }
  }

  function doEnemyAttack(){
    const dmg = Math.max(1, enemy.atk - player.def + window.rand(-2,2));
    player.hp = Math.max(0, player.hp - dmg);
    window.spawnFloatingText(player.x, player.y, '-' + dmg, '#ff6b6b');
    window.addLog('The ' + enemy.name + ' claws at you for ' + dmg + ' damage!');
    window.updateUI(getUIState());
    checkGameOver();
    if(!gameOver) setTimeout(endEnemyTurn, 500);
  }

  function endEnemyTurn(){
    if(gameOver) return;
    turn = 'player';
    hasMovedThisTurn = false;
    hasActedThisTurn = false;
    window.addLog('— Player turn —');
    window.updateUI(getUIState());
  }

  function enemyTurn(){
    if(gameOver || turn !== 'enemy') return;
    const dist = window.manhattan(player, enemy);
    if(dist <= 1){
      doEnemyAttack();
      return;
    }
    const reach = window.getReachableTiles(enemy.x, enemy.y, enemy.moveRange, [{x:player.x, y:player.y}]);
    let best = null;
    for(const node of reach.values()){
      const d = Math.abs(node.x - player.x) + Math.abs(node.y - player.y);
      if(!best || d < best.d || (d === best.d && node.dist < best.node.dist)){
        best = { d, node };
      }
    }
    const path = best ? window.reconstructPath(best.node) : [];
    if(path.length === 0){
      window.addLog('The ' + enemy.name + ' holds its ground.');
      endEnemyTurn();
      return;
    }
    window.addLog('The ' + enemy.name + ' closes the distance.');
    startMove(enemy, path, () => {
      if(window.manhattan(player, enemy) <= 1){ doEnemyAttack(); }
      else { endEnemyTurn(); }
    });
    window.updateUI(getUIState());
  }

  btnMove.addEventListener('click', () => {
    if(turn !== 'player' || gameOver || isBusy() || hasMovedThisTurn) return;
    if(mode === 'selectMove'){
      mode = 'idle';
    } else {
      mode = 'selectMove';
      reachable = window.getReachableTiles(player.x, player.y, player.moveRange, [{x:enemy.x, y:enemy.y}]);
    }
    window.updateUI(getUIState());
    draw();
  });

  btnAttack.addEventListener('click', () => {
    if(turn !== 'player' || gameOver || isBusy() || hasActedThisTurn) return;
    const dist = window.manhattan(player, enemy);
    if(dist > 1){ window.addLog('The enemy is too far away to strike.'); return; }
    const dmg = Math.max(1, player.atk - enemy.def + window.rand(-2,2));
    enemy.hp = Math.max(0, enemy.hp - dmg);
    window.spawnFloatingText(enemy.x, enemy.y, '-' + dmg, '#ff6b6b');
    window.addLog('You strike the ' + enemy.name + ' for ' + dmg + ' damage!');
    hasActedThisTurn = true;
    window.updateUI(getUIState());
    checkGameOver();
  });

  btnMagic.addEventListener('click', () => {
    if(turn !== 'player' || gameOver || isBusy() || hasActedThisTurn) return;
    if(player.mag < window.SPELL_COST){ window.addLog('You lack the magic required to cast Arcane Bolt.'); return; }
    const dist = window.manhattan(player, enemy);
    if(dist > window.SPELL_RANGE){ window.addLog("The enemy is beyond your spell's reach."); return; }
    player.mag -= window.SPELL_COST;
    const dmg = Math.max(1, window.SPELL_POWER - enemy.def + window.rand(-2,2));
    enemy.hp = Math.max(0, enemy.hp - dmg);
    window.spawnFloatingText(enemy.x, enemy.y, '-' + dmg, '#c77dff');
    window.addLog('You unleash Arcane Bolt on the ' + enemy.name + ' for ' + dmg + ' damage!');
    hasActedThisTurn = true;
    window.updateUI(getUIState());
    checkGameOver();
  });

  btnEndTurn.addEventListener('click', () => {
    if(turn !== 'player' || gameOver || isBusy()) return;
    mode = 'idle';
    turn = 'enemy';
    window.addLog('— Enemy turn —');
    window.updateUI(getUIState());
    draw();
    setTimeout(enemyTurn, 500);
  });

  btnRestart.addEventListener('click', init);

  canvas.addEventListener('click', (e) => {
    if(mode !== 'selectMove' || turn !== 'player' || gameOver) return;
    const { gx, gy } = getTileFromEvent(e);
    if(gx < 0 || gx >= window.COLS || gy < 0 || gy >= window.ROWS) return;
    const key = gx + ',' + gy;
    if(!reachable.has(key)) return;
    if(gx === player.x && gy === player.y){ 
      mode = 'idle'; 
      window.updateUI(getUIState()); 
      draw(); 
      return; 
    }
    const node = reachable.get(key);
    const path = window.reconstructPath(node);
    mode = 'idle';
    hasMovedThisTurn = true;
    window.addLog('You move to a new position.');
    startMove(player, path, () => { window.updateUI(getUIState()); });
    window.updateUI(getUIState());
    draw();
  });

  canvas.addEventListener('mousemove', (e) => {
    if(mode !== 'selectMove'){ canvas.style.cursor = 'default'; return; }
    const { gx, gy } = getTileFromEvent(e);
    const key = gx + ',' + gy;
    const valid = reachable.has(key) && !(gx === player.x && gy === player.y);
    canvas.style.cursor = valid ? 'pointer' : 'default';
  });

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && mode === 'selectMove'){ 
      mode = 'idle'; 
      window.updateUI(getUIState()); 
      draw(); 
    }
  });

  function init(){
    player = window.createPlayer(window.PLAYER_START);
    enemy = window.createEnemy(window.ENEMY_START);
    player.px = player.x * window.TILE + window.TILE / 2; 
    player.py = player.y * window.TILE + window.TILE / 2;
    enemy.px = enemy.x * window.TILE + window.TILE / 2; 
    enemy.py = enemy.y * window.TILE + window.TILE / 2;
    turn = 'player';
    mode = 'idle';
    hasMovedThisTurn = false;
    hasActedThisTurn = false;
    gameOver = false;
    window.floatingTexts = [];
    reachable = new Map();
    document.getElementById('log').innerHTML = '';
    overlay.classList.add('hidden');
    window.addLog('The battle begins. Choose your move, warrior.');
    window.updateUI(getUIState());
    draw();
  }

  function loop(now){
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    clock += dt;
    updateMovement(dt);
    window.updateFloatingTexts(dt);
    draw();
    requestAnimationFrame(loop);
  }

  init();
  requestAnimationFrame(loop);
})();