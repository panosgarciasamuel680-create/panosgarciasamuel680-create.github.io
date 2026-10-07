(() => {
  const SIZE = 10;
  const COLORS = ['#72e7bd', '#ffb86b', '#9b8cff', '#ff7895', '#63c9ff', '#f0d76b'];
  const SHAPES = [
    [[0,0]], [[0,0],[0,1]], [[0,0],[1,0]], [[0,0],[0,1],[0,2]], [[0,0],[1,0],[2,0]],
    [[0,0],[0,1],[1,0],[1,1]], [[0,0],[0,1],[0,2],[1,0]], [[0,0],[1,0],[2,0],[2,1]],
    [[0,0],[0,1],[1,1],[1,2]], [[0,1],[1,0],[1,1],[1,2]], [[0,0],[1,0],[1,1],[2,1]],
    [[0,0],[0,1],[1,0],[1,1],[2,0]], [[0,0],[0,1],[0,2],[1,0],[1,1]],
    [[0,0],[1,0],[2,0],[3,0]], [[0,0],[0,1],[0,2],[0,3]], [[0,0],[1,0],[2,0],[3,0],[4,0]],
    [[0,0],[0,1],[0,2],[1,0],[2,0]], [[0,0],[1,0],[1,1],[1,2],[2,2]],
    [[0,0],[0,1],[0,2],[1,1],[2,1]], [[0,1],[1,0],[1,1],[1,2],[2,1]]
  ];
  const boardEl = document.querySelector('#board');
  const trayEl = document.querySelector('#tray');
  const scoreEl = document.querySelector('#score');
  const bestEl = document.querySelector('#best');
  const messageEl = document.querySelector('#message');
  const overlay = document.querySelector('#gameOver');
  const menu = document.querySelector('#mainMenu');
  const scenes = [...document.querySelectorAll('.scene')];
  const sceneCredit = document.querySelector('#sceneCredit');
  const photoInfo = [
    ['Puerta de San Juan · Viejo San Juan', 'Erick Morales Oyola', 'https://unsplash.com/photos/historic-fort-on-a-sunny-day-by-the-ocean-XkMy7dKjkKg'],
    ['Vista al mar · Viejo San Juan', 'Laura Materna', 'https://unsplash.com/photos/a-view-of-a-body-of-water-from-a-balcony-07D4LdqGTcc'],
    ['Playa Flamenco · Culebra', 'Raymesh Cintron', 'https://unsplash.com/photos/aerial-photo-of-seashore-during-daytime-_mgYzI3LSpc'],
    ['El Yunque · Río Grande', 'Paul Torres', 'https://unsplash.com/photos/a-large-waterfall-in-the-middle-of-a-forest-9lo5h-1-rEM']
  ];
  let board, score, best = Number(localStorage.getItem('bloques-best') || 0), pieces = [], selected = -1, sound = false;
  let audio;
  bestEl.textContent = best;

  function beep(freq = 440, duration = .07) {
    if (!sound) return;
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); const osc = audio.createOscillator(), gain = audio.createGain(); osc.frequency.value = freq; gain.gain.value = .035; osc.connect(gain); gain.connect(audio.destination); osc.start(); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration); osc.stop(audio.currentTime + duration); } catch {}
  }
  function makeBoard() {
    boardEl.innerHTML = '';
    for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) {
      const cell = document.createElement('div'); cell.className='cell'; cell.dataset.r=r; cell.dataset.c=c; cell.setAttribute('role','gridcell'); boardEl.append(cell);
    }
  }
  function randomPiece() { return { shape: SHAPES[Math.floor(Math.random()*SHAPES.length)], color: COLORS[Math.floor(Math.random()*COLORS.length)], used:false }; }
  function renderTray() {
    trayEl.innerHTML='';
    pieces.forEach((p,i)=>{
      const holder=document.createElement('div'); holder.className='piece'+(p.used?' used':'')+(selected===i?' selected':''); holder.dataset.index=i; holder.setAttribute('aria-label',`Pieza ${i+1}`); holder.setAttribute('role','button'); holder.tabIndex=p.used?-1:0;
      const h=Math.max(...p.shape.map(x=>x[0]))+1,w=Math.max(...p.shape.map(x=>x[1]))+1,g=document.createElement('div');g.className='piece-grid';g.style.gridTemplateColumns=`repeat(${w},20px)`;g.style.gridTemplateRows=`repeat(${h},20px)`;
      p.shape.forEach(([r,c])=>{const x=document.createElement('i');x.className='piece-cell';x.style.setProperty('--c',p.color);x.style.gridRow=r+1;x.style.gridColumn=c+1;g.append(x)});holder.append(g);trayEl.append(holder);
      holder.addEventListener('pointerdown', e=>startDrag(e,i));
      holder.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selected=i;renderTray();messageEl.textContent='Elige una casilla del tablero para colocar la pieza.'}});
    });
  }
  function renderBoard() {
    [...boardEl.children].forEach((el,i)=>{const v=board[Math.floor(i/SIZE)][i%SIZE];el.className='cell'+(v?' filled':''); if(v) el.style.setProperty('--c',v); else el.style.removeProperty('--c');});
  }
  function canPlace(shape,r,c) { return shape.every(([dr,dc])=>r+dr>=0&&r+dr<SIZE&&c+dc>=0&&c+dc<SIZE&&!board[r+dr][c+dc]); }
  function place(index,r,c) {
    const p=pieces[index]; if(!p||p.used||!canPlace(p.shape,r,c)){beep(180,.09);messageEl.textContent='Esa pieza no cabe ahí. Prueba otra casilla.';return false}
    p.shape.forEach(([dr,dc])=>board[r+dr][c+dc]=p.color);const placedCells=p.shape.map(([dr,dc])=>(r+dr)*SIZE+c+dc);p.used=true;selected=-1;score+=p.shape.length;beep(520,.07);
    const fullRows=[];for(let y=0;y<SIZE;y++)if(board[y].every(Boolean))fullRows.push(y);
    const fullCols=[];for(let x=0;x<SIZE;x++)if(board.every(row=>row[x]))fullCols.push(x);
    const cleared=new Set();fullRows.forEach(y=>{for(let x=0;x<SIZE;x++)cleared.add(y*SIZE+x)});fullCols.forEach(x=>{for(let y=0;y<SIZE;y++)cleared.add(y*SIZE+x)});
    if(cleared.size){cleared.forEach(i=>{board[Math.floor(i/SIZE)][i%SIZE]=null});score+=cleared.size+ (fullRows.length+fullCols.length)*10;beep(760,.16);messageEl.textContent=`¡Limpiaste ${fullRows.length+fullCols.length} línea${fullRows.length+fullCols.length===1?'':'s'}!`;messageEl.classList.remove('celebrate');void messageEl.offsetWidth;messageEl.classList.add('celebrate') }else messageEl.textContent='¡Buena jugada! Sigue buscando líneas.';
    if(score>best){best=score;localStorage.setItem('bloques-best',best)}scoreEl.textContent=score;bestEl.textContent=best;document.querySelector('#menuBest').textContent=best;scoreEl.classList.remove('bump');void scoreEl.offsetWidth;scoreEl.classList.add('bump');
    if(pieces.every(x=>x.used)){pieces=[randomPiece(),randomPiece(),randomPiece()];renderTray()}
    renderBoard();placedCells.forEach((i,n)=>{const cell=boardEl.children[i];cell.style.animationDelay=`${n*32}ms`;cell.classList.add('just-placed')});boardEl.classList.remove('board-pulse');void boardEl.offsetWidth;boardEl.classList.add('board-pulse');setTimeout(()=>boardEl.classList.remove('board-pulse'),360);if(cleared.size){cleared.forEach(i=>boardEl.children[i].classList.add('pop'));setTimeout(renderBoard,300)}checkGameOver();return true;
  }
  function checkGameOver(){if(!pieces.some(p=>!p.used&&p.shape.some(([r,c])=>{for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(canPlace(p.shape,y,x))return true;return false}))){document.querySelector('#finalScore').textContent=score;overlay.classList.remove('hidden')}}
  function targetCell(x,y){const el=document.elementFromPoint(x,y);return el?.classList.contains('cell')?el:null}
  function boardCellAt(x,y){
    const rect=boardEl.getBoundingClientRect();if(x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return null;
    const first=boardEl.children[0].getBoundingClientRect(), right=boardEl.children[1].getBoundingClientRect(), below=boardEl.children[SIZE].getBoundingClientRect();
    const col=Math.round((x-(first.left+first.width/2))/(right.left-first.left));
    const row=Math.round((y-(first.top+first.height/2))/(below.top-first.top));
    return row>=0&&row<SIZE&&col>=0&&col<SIZE?[row,col]:null;
  }
  let drag=null;
  function showPreview(shape,r,c){clearPreview();const valid=canPlace(shape,r,c);shape.forEach(([dr,dc])=>{const el=boardEl.children[(r+dr)*SIZE+c+dc];if(el)el.classList.add(valid?'preview':'invalid')})}
  function clearPreview(){boardEl.querySelectorAll('.preview,.invalid').forEach(el=>el.classList.remove('preview','invalid'))}
  function startDrag(e,index){if(pieces[index].used)return;e.preventDefault();selected=index;const holder=e.currentTarget;holder.classList.add('dragging-source');holder.setPointerCapture(e.pointerId);const clone=holder.cloneNode(true);clone.className='piece dragging';clone.style.width='auto';clone.style.height='auto';clone.style.position='fixed';clone.querySelector('.piece-grid').style.gridTemplateColumns=`repeat(${Math.max(...pieces[index].shape.map(x=>x[1]))+1},22px)`;document.body.append(clone);drag={index,clone,holder,pointerId:e.pointerId};moveDrag(e);holder.addEventListener('pointermove',moveDrag);holder.addEventListener('pointerup',endDrag,{once:true});holder.addEventListener('pointercancel',endDrag,{once:true});}
  function moveDrag(e){if(!drag)return;const p=pieces[drag.index],height=Math.max(...p.shape.map(x=>x[0]))+1,width=Math.max(...p.shape.map(x=>x[1]))+1;drag.clone.style.left=`${e.clientX}px`;drag.clone.style.top=`${e.clientY}px`;const hover=boardCellAt(e.clientX,e.clientY);if(hover){const [row,col]=hover,r=row-Math.floor((height-1)/2),c=col-Math.floor((width-1)/2);showPreview(p.shape,r,c);drag.cell=[r,c]}else{clearPreview();drag.cell=null}}
  function endDrag(e){if(!drag)return;const {index,clone,holder,cell}=drag;clone.remove();holder.classList.remove('dragging-source');clearPreview();drag=null;if(cell&&e.type!=='pointercancel'){const placed=place(index,cell[0],cell[1]);renderTray();if(!placed)selected=index}else{selected=index;renderTray();messageEl.textContent='Elige una casilla del tablero para colocar la pieza.'}}
  boardEl.addEventListener('pointerdown',e=>{const cell=e.target.closest('.cell');if(!cell)return;if(selected>=0){const p=pieces[selected],[row,col]=boardCellAt(e.clientX,e.clientY),height=Math.max(...p.shape.map(x=>x[0]))+1,width=Math.max(...p.shape.map(x=>x[1]))+1;place(selected,row-Math.floor((height-1)/2),col-Math.floor((width-1)/2));renderTray()} });
  boardEl.addEventListener('pointermove',e=>{if(selected<0||drag)return;const pos=boardCellAt(e.clientX,e.clientY);if(pos){const p=pieces[selected],height=Math.max(...p.shape.map(x=>x[0]))+1,width=Math.max(...p.shape.map(x=>x[1]))+1;showPreview(p.shape,pos[0]-Math.floor((height-1)/2),pos[1]-Math.floor((width-1)/2))}});
  boardEl.addEventListener('pointerleave',clearPreview);
  function newGame(){board=Array.from({length:SIZE},()=>Array(SIZE).fill(null));score=0;pieces=[randomPiece(),randomPiece(),randomPiece()];selected=-1;scoreEl.textContent='0';messageEl.textContent='Coloca las piezas y completa filas o columnas.';overlay.classList.add('hidden');menu.classList.add('hidden');makeBoard();renderBoard();renderTray()}
  document.querySelector('#newGame').addEventListener('click',()=>{newGame();menu.classList.remove('hidden')});document.querySelector('#playAgain').addEventListener('click',newGame);document.querySelector('#startGame').addEventListener('click',newGame);
  document.querySelector('#howTo').addEventListener('click',e=>{const text=document.querySelector('#howToText'),open=text.classList.toggle('hidden')===false;e.currentTarget.setAttribute('aria-expanded',open);e.currentTarget.querySelector('b').textContent=open?'－':'＋'});
  document.querySelector('#soundToggle').addEventListener('click',e=>{sound=!sound;e.currentTarget.style.color=sound?'var(--mint)':'';if(sound)beep(600)});
  let sceneIndex=0;function showScene(index){sceneIndex=index;scenes.forEach((img,i)=>img.classList.toggle('active',i===index));const [place,photographer,url]=photoInfo[index];sceneCredit.innerHTML=`<span>${place}</span><a href="${url}" target="_blank" rel="noopener noreferrer">Foto: ${photographer}</a>`}
  showScene(0);setInterval(()=>showScene((sceneIndex+1)%scenes.length),9000);
  const musicPanel=document.querySelector('#musicPanel'),spotifyFrame=document.querySelector('#spotifyFrame'),playlistToggle=document.querySelector('#playlistToggle');
  function setMusicOpen(open){musicPanel.hidden=!open;playlistToggle.setAttribute('aria-expanded',String(open));playlistToggle.setAttribute('aria-label',open?'Ocultar la playlist de Spotify':'Mostrar mi playlist de Spotify');playlistToggle.style.color=open?'var(--mint)':'';if(open)spotifyFrame.src='https://open.spotify.com/embed/playlist/78SNnVGMY8CGbUEzb0W3uL?utm_source=generator&theme=0';else spotifyFrame.src=''}
  playlistToggle.addEventListener('click',()=>setMusicOpen(musicPanel.hidden));document.querySelector('#closeMusic').addEventListener('click',()=>setMusicOpen(false));
  newGame();menu.classList.remove('hidden');
})();
