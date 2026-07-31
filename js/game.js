(function(){
  const COLS = 8, ROWS = 6, TILE = 64;
  const PLAYER_START = { x: 1, y: 4 };
  const ENEMY_START = { x: 6, y: 1 };
  const SPELL_COST = 15, SPELL_RANGE = 3, SPELL_POWER = 28;

  const canvas = document.getElementById('grid');
  const ctx = canvas.getContext('2d');

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
  const logEl = document.getElementById('log');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayText = document.getElementById('overlayText');
  const btnRestart = document.getElementById('btnRestart');

  let player, enemy, turn, mode, hasMovedThisTurn, hasActedThisTurn, gameOver;
  let reachable = new Map();
  let floatingTexts = [];
  let clock = 0;
  let lastTime = performance.now();

  function rand(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }
  function manhattan(a, b){ return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
  function isBusy(){ return player.moving || enemy.moving; }
  
  function hexToRgba(hex, alpha){
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function getReachableTiles(startX, startY, range, blocked){
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
        if(nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        if(blocked.some(b => b.x === nx && b.y === ny)) continue;
        const k = key(nx,ny);
        if(visited.has(k)) continue;
        const node = { x: nx, y: ny, dist: cur.dist + 1, prev: cur };
        visited.set(k, node);
        queue.push(node);
      }
    }
    return visited;
  }

  function reconstructPath(node){
    const path = [];
    let n = node;
    while(n && n.prev){ path.unshift({ x: n.x, y: n.y }); n = n.prev; }
    return path;
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
        const targetPx = wp.x * TILE + TILE/2, targetPy = wp.y * TILE + TILE/2;
        const dx = targetPx - u.px, dy = targetPy - u.py;
        const dist = Math.hypot(dx, dy);
        const speed = TILE / 0.18;
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

  function spawnFloatingText(gx, gy, text, color){
    floatingTexts.push({ x: gx*TILE + TILE/2, y: gy*TILE + TILE/2 - 10, text, color, life: 1.0, vy: -40 });
  }

  function updateFloatingTexts(dt){
    for(let i = floatingTexts.length - 1; i >= 0; i--){
      const f = floatingTexts[i];
      f.y += f.vy * dt;
      f.life -= dt * 1.1;
      if(f.life <= 0) floatingTexts.splice(i,1);
    }
  }

  function addLog(msg){
    const p = document.createElement('div');
    p.textContent = msg;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
    while(logEl.children.length > 60) logEl.removeChild(logEl.firstChild);
  }

  function updateUI(){
    turnIndicator.textContent = gameOver ? 'BATTLE OVER' : (turn === 'player' ? 'PLAYER TURN' : 'ENEMY TURN');
    turnIndicator.className = turn === 'player' ? 'turn-player' : 'turn-enemy';

    playerHpFill.style.width = Math.max(0, 100 * player.hp / player.maxHp) + '%';
    playerHpText.textContent = player.hp + ' / ' + player.maxHp;
    playerMagFill.style.width = Math.max(0, 100 * player.mag / player.maxMag) + '%';
    playerMagText.textContent = player.mag + ' / ' + player.maxMag;

    enemyHpFill.style.width = Math.max(0, 100 * enemy.hp / enemy.maxHp) + '%';
    enemyHpText.textContent = enemy.hp + ' / ' + enemy.maxHp;

    const dist = manhattan(player, enemy);
    distanceReadout.textContent = 'Distance to ' + enemy.name + ': ' + dist;

    const busy = isBusy();
    const myTurn = turn === 'player' && !gameOver && !busy;
    btnMove.disabled = !myTurn || hasMovedThisTurn;
    btnMove.classList.toggle('active', mode === 'selectMove');
    btnAttack.disabled = !myTurn || hasActedThisTurn || dist > 1;
    btnMagic.disabled = !myTurn || hasActedThisTurn || dist > SPELL_RANGE || player.mag < SPELL_COST;
    btnEndTurn.disabled = !myTurn;
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    for(let gy=0; gy<ROWS; gy++){
      for(let gx=0; gx<COLS; gx++){
        ctx.fillStyle = (gx+gy)%2===0 ? '#1c1626' : '#221a30';
        ctx.fillRect(gx*TILE, gy*TILE, TILE, TILE);
      }
    }

    if(mode === 'selectMove'){
      reachable.forEach((node) => {
        if(node.dist === 0) return;
        ctx.fillStyle = 'rgba(93,200,255,0.22)';
        ctx.fillRect(node.x*TILE, node.y*TILE, TILE, TILE);
        ctx.strokeStyle = 'rgba(93,200,255,0.6)';
        ctx.strokeRect(node.x*TILE+1, node.y*TILE+1, TILE-2, TILE-2);
      });
    }

    ctx.strokeStyle = 'rgba(120,100,150,0.2)';
    for(let i=0;i<=COLS;i++){ ctx.beginPath(); ctx.moveTo(i*TILE,0); ctx.lineTo(i*TILE,ROWS*TILE); ctx.stroke(); }
    for(let j=0;j<=ROWS;j++){ ctx.beginPath(); ctx.moveTo(0,j*TILE); ctx.lineTo(COLS*TILE,j*TILE); ctx.stroke(); }

    const renderConfig = { TILE, clock, gameOver, turn, hexToRgba };
    drawUnit(ctx, enemy, renderConfig);
    drawUnit(ctx, player, renderConfig);

    floatingTexts.forEach(f => {
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
    return { gx: Math.floor(mx / TILE), gy: Math.floor(my / TILE) };
  }

  function checkGameOver(){
    if(gameOver) return;
    if(enemy.hp <= 0){ gameOver = true; showGameOver(true); }
    else if(player.hp <= 0){ gameOver = true; showGameOver(false); }
  }

  function showGameOver(won){
    overlay.classList.remove('hidden');
    overlayTitle.textContent = won ? 'VICTORY' : 'DEFEAT';
    overlayTitle.className = won ? 'victory' : 'defeat';
    overlayText.textContent = won ? ('You have vanquished the ' + enemy.name + '.') : ('You have fallen before the ' + enemy.name + '.');
    updateUI();
  }

  function doEnemyAttack(){
    const dmg = Math.max(1, enemy.atk - player.def + rand(-2,2));
    player.hp = Math.max(0, player.hp - dmg);
    spawnFloatingText(player.x, player.y, '-' + dmg, '#ff6b6b');
    addLog('The ' + enemy.name + ' claws at you for ' + dmg + ' damage!');
    updateUI();
    checkGameOver();
    if(!gameOver) setTimeout(endEnemyTurn, 500);
  }

  function endEnemyTurn(){
    if(gameOver) return;
    turn = 'player';
    hasMovedThisTurn = false;
    hasActedThisTurn = false;
    addLog('— Player turn —');
    updateUI();
  }

  function enemyTurn(){
    if(gameOver || turn !== 'enemy') return;
    const dist = manhattan(player, enemy);
    if(dist <= 1){
      doEnemyAttack();
      return;
    }
    const reach = getReachableTiles(enemy.x, enemy.y, enemy.moveRange, [{x:player.x,y:player.y}]);
    let best = null;
    for(const node of reach.values()){
      const d = Math.abs(node.x - player.x) + Math.abs(node.y - player.y);
      if(!best || d < best.d || (d === best.d && node.dist < best.node.dist)){
        best = { d, node };
      }
    }
    const path = best ? reconstructPath(best.node) : [];
    if(path.length === 0){
      addLog('The ' + enemy.name + ' holds its ground.');
      endEnemyTurn();
      return;
    }
    addLog('The ' + enemy.name + ' closes the distance.');
    startMove(enemy, path, () => {
      if(manhattan(player, enemy) <= 1){ doEnemyAttack(); }
      else { endEnemyTurn(); }
    });
    updateUI();
  }

  btnMove.addEventListener('click', () => {
    if(turn !== 'player' || gameOver || isBusy() || hasMovedThisTurn) return;
    if(mode === 'selectMove'){
      mode = 'idle';
    } else {
      mode = 'selectMove';
      reachable = getReachableTiles(player.x, player.y, player.moveRange, [{x:enemy.x,y:enemy.y}]);
    }
    updateUI();
    draw();
  });

  btnAttack.addEventListener('click', () => {
    if(turn !== 'player' || gameOver || isBusy() || hasActedThisTurn) return;
    const dist = manhattan(player, enemy);
    if(dist > 1){ addLog('The enemy is too far away to strike.'); return; }
    const dmg = Math.max(1, player.atk - enemy.def + rand(-2,2));
    enemy.hp = Math.max(0, enemy.hp - dmg);
    spawnFloatingText(enemy.x, enemy.y, '-' + dmg, '#ff6b6b');
    addLog('You strike the ' + enemy.name + ' for ' + dmg + ' damage!');
    hasActedThisTurn = true;
    updateUI();
    checkGameOver();
  });

  btnMagic.addEventListener('click', () => {
    if(turn !== 'player' || gameOver || isBusy() || hasActedThisTurn) return;
    if(player.mag < SPELL_COST){ addLog('You lack the magic required to cast Arcane Bolt.'); return; }
    const dist = manhattan(player, enemy);
    if(dist > SPELL_RANGE){ addLog("The enemy is beyond your spell's reach."); return; }
    player.mag -= SPELL_COST;
    const dmg = Math.max(1, SPELL_POWER - enemy.def + rand(-2,2));
    enemy.hp = Math.max(0, enemy.hp - dmg);
    spawnFloatingText(enemy.x, enemy.y, '-' + dmg, '#c77dff');
    addLog('You unleash Arcane Bolt on the ' + enemy.name + ' for ' + dmg + ' damage!');
    hasActedThisTurn = true;
    updateUI();
    checkGameOver();
  });

  btnEndTurn.addEventListener('click', () => {
    if(turn !== 'player' || gameOver || isBusy()) return;
    mode = 'idle';
    turn = 'enemy';
    addLog('— Enemy turn —');
    updateUI();
    draw();
    setTimeout(enemyTurn, 500);
  });

  btnRestart.addEventListener('click', init);

  canvas.addEventListener('click', (e) => {
    if(mode !== 'selectMove' || turn !== 'player' || gameOver) return;
    const { gx, gy } = getTileFromEvent(e);
    if(gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return;
    const key = gx + ',' + gy;
    if(!reachable.has(key)) return;
    if(gx === player.x && gy === player.y){ mode = 'idle'; updateUI(); draw(); return; }
    const node = reachable.get(key);
    const path = reconstructPath(node);
    mode = 'idle';
    hasMovedThisTurn = true;
    addLog('You move to a new position.');
    startMove(player, path, () => { updateUI(); });
    updateUI();
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
    if(e.key === 'Escape' && mode === 'selectMove'){ mode = 'idle'; updateUI(); draw(); }
  });

  function init(){
    player = createPlayer(PLAYER_START);
    enemy = createEnemy(ENEMY_START);
    player.px = player.x*TILE + TILE/2; player.py = player.y*TILE + TILE/2;
    enemy.px = enemy.x*TILE + TILE/2; enemy.py = enemy.y*TILE + TILE/2;
    turn = 'player';
    mode = 'idle';
    hasMovedThisTurn = false;
    hasActedThisTurn = false;
    gameOver = false;
    floatingTexts = [];
    reachable = new Map();
    logEl.innerHTML = '';
    overlay.classList.add('hidden');
    addLog('The battle begins. Choose your move, warrior.');
    updateUI();
    draw();
  }

  function loop(now){
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    clock += dt;
    updateMovement(dt);
    updateFloatingTexts(dt);
    draw();
    requestAnimationFrame(loop);
  }

  init();
  requestAnimationFrame(loop);
})();