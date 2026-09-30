(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const descriptions = {
    bfs: "BFS · Amplitud: explora por capas. Encuentra una ruta con el menor número de pasos cuando cada movimiento cuenta igual, pero no usa los pesos para decidir.",
    dfs: "DFS · Profundidad: avanza todo lo posible por una rama antes de retroceder. Puede encontrar una ruta rápido, pero no garantiza la más corta ni la más barata.",
    ucs: "Coste uniforme · Dijkstra: siempre expande primero el camino acumulado más barato. Con pesos no negativos garantiza el menor coste.",
    astar: "A* · Heurística: combina el coste acumulado con una estimación Manhattan hasta la meta. Con esta heurística y costes no negativos obtiene un camino óptimo.",
    bidir: "Búsqueda bidireccional · Mejora extra: ejecuta una búsqueda desde el inicio y otra desde las metas hasta que ambas fronteras se encuentran. Reduce la profundidad de búsqueda en muchos mapas sin pesos, pero no optimiza costes ponderados."
  };

  let N = 20, grid = [], start = null, goals = new Map(), selectedAlgo = "bfs", selectedTool = "start";
  let dragging = false, running = false, paused = false, stopped = false;
  let currentRunToken = 0, lastComparison = [];
  let audioCtx = null, musicTimer = null, musicOn = false;

  function cellId(r,c){ return r*N+c; }
  function rc(id){ return [Math.floor(id/N), id%N]; }
  function inside(r,c){ return r>=0&&c>=0&&r<N&&c<N; }
  function neighbors(id){
    const [r,c]=rc(id), out=[];
    [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>{const nr=r+dr,nc=c+dc;if(inside(nr,nc))out.push(cellId(nr,nc));});
    return out;
  }
  function makeCell(){ return {wall:false, weight:1, icon:"🏢"}; }
  function initGrid(n=N){
    N=n; grid=Array.from({length:N*N},makeCell); start=cellId(Math.min(1,N-1),Math.min(1,N-1)); goals=new Map([[cellId(N-2,N-2),0]]);
    $("#sizeInput").value=N; $("#sizeLabel").textContent=N; $("#sizeLabel2").textContent=N; renderGrid(); clearVisuals(); updateAlgoText();
  }
  function renderGrid(){
    const el=$("#grid"); el.style.gridTemplateColumns=`repeat(${N},1fr)`; el.innerHTML="";
    grid.forEach((cell,id)=>{
      const d=document.createElement("div"); d.className="cell"; d.dataset.id=id; d.tabIndex=-1;
      d.addEventListener("pointerdown",e=>{dragging=true;paint(id);d.setPointerCapture?.(e.pointerId)});
      d.addEventListener("pointerenter",()=>{if(dragging)paint(id)});
      d.addEventListener("pointerup",()=>dragging=false);
      el.appendChild(d);
    });
    window.addEventListener("pointerup",()=>dragging=false,{once:true});
    refreshCells();
  }
  function refreshCells(){
    $$(".cell").forEach(d=>{
      const id=+d.dataset.id, cell=grid[id]; d.className="cell"; d.textContent="";
      if(cell.wall){d.classList.add("wall"); d.textContent=cell.icon||"⛔";}
      if(cell.weight>1&&!cell.wall){
        d.classList.add("weight"); d.textContent=weightIcon(cell.weight);
        const s=document.createElement("span");s.className="cost";s.textContent=cell.weight;d.appendChild(s);
      }
      if(id===start&&!cell.wall){d.classList.add("start"); d.textContent="🚘";}
      if(goals.has(id)&&!cell.wall){
        d.classList.add("goal"); d.textContent="🏁";
        const p=goals.get(id); if(p>0){const s=document.createElement("span");s.className="cost";s.textContent="+"+p;d.appendChild(s);}
      }
      const [r,c]=rc(id); d.title=`Fila ${r+1}, columna ${c+1}: coste ${cell.weight}`;
    });
    $("#mExplored").textContent=`0 / ${grid.filter(c=>!c.wall).length}`;
  }
  function weightIcon(w){ if(w<10)return"🚧"; if(w<25)return"🚶"; if(w<50)return"🚦"; if(w<75)return"⛰️"; return"🚗"; }

  function paint(id){
    if(running)return;
    const c=grid[id];
    if(selectedTool==="start"){
      if(!c.wall){ goals.delete(id); start=id; }
    }else if(selectedTool==="goal"){
      if(!c.wall&&id!==start){
        if(goals.has(id)) goals.delete(id); else goals.set(id,0);
      }
    }else if(selectedTool==="wall"){
      if(id!==start&&!goals.has(id)){ c.wall=true; c.weight=1; c.icon=$("#wallIcon").value; }
    }else if(selectedTool==="weight"){
      if(!c.wall&&id!==start){ c.weight=Math.max(2,Math.min(99,Number($("#weightValue").value)||5)); }
    }else if(selectedTool==="erase"){
      c.wall=false;c.weight=1;goals.delete(id);if(id===start)start=null;
    }
    refreshCells();
  }

  function clearVisuals(){
    $$(".cell").forEach(d=>d.classList.remove("explored","frontier","path"));
    $("#car").classList.add("hidden");
    $("#status").textContent="Listo"; $("#mTime").textContent="0.0 s"; $("#mCost").textContent="—"; $("#mSteps").textContent="—";
    $("#mFrontier").textContent="0"; $("#mDiscovered").textContent="0"; $("#mMaxFrontier").textContent="0";
    $("#mExplored").textContent=`0 / ${grid.filter(c=>!c.wall).length}`;
  }

  class MinHeap{
    constructor(){this.a=[]}
    push(item,priority){this.a.push({item,priority});this.up(this.a.length-1)}
    up(i){while(i>0){let p=(i-1)>>1;if(this.a[p].priority<=this.a[i].priority)break;[this.a[p],this.a[i]]=[this.a[i],this.a[p]];i=p}}
    pop(){if(!this.a.length)return null;const top=this.a[0],last=this.a.pop();if(this.a.length){this.a[0]=last;this.down(0)}return top.item}
    down(i){for(;;){let l=i*2+1,r=l+1,m=i;if(l<this.a.length&&this.a[l].priority<this.a[m].priority)m=l;if(r<this.a.length&&this.a[r].priority<this.a[m].priority)m=r;if(m===i)break;[this.a[m],this.a[i]]=[this.a[i],this.a[m]];i=m}}
    get length(){return this.a.length}
  }
  function stepCost(id){ return grid[id].weight + (goals.get(id)||0); }
  function heuristic(id){
    if(!goals.size)return 0; const [r,c]=rc(id); let best=Infinity;
    for(const g of goals.keys()){const [gr,gc]=rc(g);best=Math.min(best,Math.abs(r-gr)+Math.abs(c-gc));}
    return best;
  }
  function reconstruct(parent,goal){
    const path=[]; let x=goal; while(x!=null){path.push(x);x=parent.get(x)??null;} return path.reverse();
  }


  function bidirectionalSearch(){
    if(start==null||!goals.size)return {error:"Falta colocar inicio o meta.",visited:[],path:[],cost:null,steps:null,maxFrontier:0,discovered:0,frontierSizes:[]};
    if(grid[start]?.wall)return {error:"El inicio no puede ser un obstáculo.",visited:[],path:[],cost:null,steps:null,maxFrontier:0,discovered:0,frontierSizes:[]};

    const qStart=[start], qGoal=[...goals.keys()];
    const parentStart=new Map([[start,null]]), parentGoal=new Map();
    const seenStart=new Set([start]), seenGoal=new Set(goals.keys());
    const visitedOrder=[], visitedSet=new Set(), frontierSizes=[];
    let meet=null, maxFrontier=qStart.length+qGoal.length;

    for(const g of goals.keys()) parentGoal.set(g,null);

    const markVisited=(id)=>{ if(!visitedSet.has(id)){ visitedSet.add(id); visitedOrder.push(id); } };

    while(qStart.length && qGoal.length && meet==null){
      let layer=qStart.length;
      while(layer-- && meet==null){
        const id=qStart.shift(); markVisited(id);
        if(seenGoal.has(id)){ meet=id; break; }
        for(const nb of neighbors(id)){
          if(grid[nb].wall||seenStart.has(nb))continue;
          seenStart.add(nb); parentStart.set(nb,id); qStart.push(nb);
          if(seenGoal.has(nb)){ meet=nb; break; }
        }
      }
      maxFrontier=Math.max(maxFrontier,qStart.length+qGoal.length);
      frontierSizes.push(qStart.length+qGoal.length);
      if(meet!=null)break;

      layer=qGoal.length;
      while(layer-- && meet==null){
        const id=qGoal.shift(); markVisited(id);
        if(seenStart.has(id)){ meet=id; break; }
        for(const nb of neighbors(id)){
          if(grid[nb].wall||seenGoal.has(nb))continue;
          seenGoal.add(nb); parentGoal.set(nb,id); qGoal.push(nb);
          if(seenStart.has(nb)){ meet=nb; break; }
        }
      }
      maxFrontier=Math.max(maxFrontier,qStart.length+qGoal.length);
      frontierSizes.push(qStart.length+qGoal.length);
    }

    if(meet==null){
      return {visited:visitedOrder,path:[],cost:null,steps:null,maxFrontier,discovered:new Set([...seenStart,...seenGoal]).size,frontierSizes,error:null};
    }

    const left=[]; let x=meet;
    while(x!=null){ left.push(x); x=parentStart.get(x)??null; }
    left.reverse();

    const right=[]; x=parentGoal.get(meet)??null;
    while(x!=null){ right.push(x); x=parentGoal.get(x)??null; }

    const path=left.concat(right);
    let cost=0; for(let i=1;i<path.length;i++) cost+=stepCost(path[i]);
    return {visited:visitedOrder,path,cost,steps:path.length-1,maxFrontier,discovered:new Set([...seenStart,...seenGoal]).size,frontierSizes,error:null,goal:path[path.length-1]};
  }

  function search(algo, exploreAll=false){
    if(algo==="bidir") return bidirectionalSearch();
    if(start==null||!goals.size)return {error:"Falta colocar inicio o meta.",visited:[],path:[],cost:null,steps:null,maxFrontier:0,discovered:0,frontierSizes:[]};
    if(grid[start]?.wall)return {error:"El inicio no puede ser un obstáculo.",visited:[],path:[],cost:null,steps:null,maxFrontier:0,discovered:0,frontierSizes:[]};

    const visitedOrder=[], parent=new Map(), seen=new Set([start]), dist=new Map([[start,0]]), frontierSizes=[];
    let found=null,maxFrontier=1;

    if(algo==="bfs"||algo==="dfs"){
      const open=[start];
      while(open.length){
        const id=algo==="bfs"?open.shift():open.pop();
        visitedOrder.push(id);
        if(goals.has(id)&&found==null){found=id;if(!exploreAll)break;}
        for(const nb of neighbors(id)){
          if(grid[nb].wall||seen.has(nb))continue;
          seen.add(nb);parent.set(nb,id);open.push(nb);
        }
        maxFrontier=Math.max(maxFrontier,open.length);frontierSizes.push(open.length);
      }
    }else{
      const heap=new MinHeap(); heap.push(start,algo==="astar"?heuristic(start):0);
      const closed=new Set();
      while(heap.length){
        const id=heap.pop(); if(closed.has(id))continue; closed.add(id); visitedOrder.push(id);
        if(goals.has(id)&&found==null){found=id;if(!exploreAll)break;}
        for(const nb of neighbors(id)){
          if(grid[nb].wall)continue;
          const nd=(dist.get(id)??Infinity)+stepCost(nb);
          if(nd<(dist.get(nb)??Infinity)){
            dist.set(nb,nd);parent.set(nb,id);seen.add(nb);
            heap.push(nb,nd+(algo==="astar"?heuristic(nb):0));
          }
        }
        maxFrontier=Math.max(maxFrontier,heap.length);frontierSizes.push(heap.length);
      }
    }
    if(found==null)return {visited:visitedOrder,path:[],cost:null,steps:null,maxFrontier,discovered:seen.size,frontierSizes,error:null};
    const path=reconstruct(parent,found);
    let cost=0;for(let i=1;i<path.length;i++)cost+=stepCost(path[i]);
    return {visited:visitedOrder,path,cost,steps:path.length-1,maxFrontier,discovered:seen.size,frontierSizes,error:null,goal:found};
  }

  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  async function waitWhilePaused(token){ while(paused&&!stopped&&token===currentRunToken) await sleep(40); }

  async function animateRun(result,token){
    const t0=performance.now(), cells=$$(".cell"), speed=()=>Math.max(1,Number($("#speed").value));
    let explored=0;
    for(let i=0;i<result.visited.length;i++){
      if(stopped||token!==currentRunToken)return false;
      await waitWhilePaused(token); if(stopped)return false;
      const id=result.visited[i]; cells[id]?.classList.add("explored");
      explored=i+1; $("#mExplored").textContent=`${explored} / ${grid.filter(c=>!c.wall).length}`;
      $("#mFrontier").textContent=result.frontierSizes[i]??0; $("#mDiscovered").textContent=result.discovered; $("#mMaxFrontier").textContent=result.maxFrontier;
      $("#mTime").textContent=((performance.now()-t0)/1000).toFixed(1)+" s";
      await sleep(1000/speed());
    }
    if(!result.path.length){$("#status").textContent="Sin solución";return true}
    result.path.forEach(id=>cells[id]?.classList.add("path"));
    $("#mCost").textContent=result.cost; $("#mSteps").textContent=result.steps; $("#status").textContent="Ruta encontrada";
    await animateCar(result.path,token);
    if($("#winSound").checked)beepWin();
    return true;
  }

  async function animateCar(path,token){
    const car=$("#car"), wrap=$("#gridWrap"), cells=$$(".cell"); car.classList.remove("hidden");
    for(let i=0;i<path.length;i++){
      if(stopped||token!==currentRunToken)return;
      await waitWhilePaused(token);
      const rect=cells[path[i]].getBoundingClientRect(), wr=wrap.getBoundingClientRect();
      car.style.left=(rect.left-wr.left+rect.width/2)+"px"; car.style.top=(rect.top-wr.top+rect.height/2)+"px";
      if(i<path.length-1){
        const [r1,c1]=rc(path[i]),[r2,c2]=rc(path[i+1]);
        const ang=c2>c1?0:c2<c1?180:r2>r1?90:-90; car.style.transform=`translate(-50%,-50%) rotate(${ang}deg)`;
      }
      await sleep(Math.max(35,700/Math.max(1,Number($("#speed").value))));
    }
  }

  function compare(){
    const names={bfs:"BFS",dfs:"DFS",ucs:"Coste uniforme",astar:"A*"};
    lastComparison=["bfs","dfs","ucs","astar"].map(a=>({algo:a,name:names[a],...search(a,false)}));
    renderRanking();
  }
  function renderRanking(){
    const by=$("#rankBy").value;
    const arr=[...lastComparison].sort((a,b)=>{
      const av=by==="cost"?(a.cost??Infinity):a.visited.length,bv=by==="cost"?(b.cost??Infinity):b.visited.length;
      return av-bv;
    });
    const box=$("#ranking");
    if(!arr.length){box.textContent="Los cuatro algoritmos obligatorios se compararán al simular.";return}
    box.innerHTML="";
    arr.forEach((x,i)=>{
      const d=document.createElement("div");d.className="rank-row";
      d.innerHTML=`<b>${i+1}</b><div><b>${x.name}</b><br><small>${x.path.length?`${x.steps} pasos · coste ${x.cost}`:"sin solución"}</small></div><b>${x.visited.length} celdas</b>`;
      box.appendChild(d);
    });
  }

  async function simulate(){
    if(running)return;
    clearVisuals(); stopped=false; paused=false; running=true; currentRunToken++; const token=currentRunToken;
    $("#pauseBtn").textContent="Ⅱ Pausar"; $("#status").textContent="Explorando…";
    const result=search(selectedAlgo,$("#exploreAll").checked); compare();
    if(result.error){$("#status").textContent=result.error;running=false;return}
    await animateRun(result,token); running=false;
  }

  function randomEmpty(){
    grid=Array.from({length:N*N},makeCell); goals=new Map(); start=null;
  }
  function randomCell(exclude=new Set()){
    let id; do{id=Math.floor(Math.random()*grid.length)}while(exclude.has(id)); return id;
  }
  function randomMap(){
    randomEmpty(); const used=new Set(); start=randomCell(used);used.add(start); const g=randomCell(used);goals.set(g,0);used.add(g);
    for(let id=0;id<grid.length;id++){
      if(used.has(id))continue; const x=Math.random();
      if(x<0.18)grid[id].wall=true; else if(x<0.27)grid[id].weight=2+Math.floor(Math.random()*30);
    }
    refreshCells();clearVisuals();
  }
  function carveManhattan(a,b){
    const [ar,ac]=rc(a),[br,bc]=rc(b);let r=ar,c=ac;grid[cellId(r,c)].wall=false;
    while(c!==bc){c+=Math.sign(bc-c);grid[cellId(r,c)].wall=false}
    while(r!==br){r+=Math.sign(br-r);grid[cellId(r,c)].wall=false}
  }
  function scenario(type){
    N=20;
    $("#sizeInput").value=N; $("#sizeLabel").textContent=N; $("#sizeLabel2").textContent=N;
    randomEmpty();

    if(type==="steps"){
      start=cellId(18,1);
      const g=cellId(1,18); goals.set(g,0);
      [[5,4],[9,14],[13,7],[16,16]].forEach(([c,gap])=>{
        for(let r=2;r<18;r++){
          if(r!==gap && r!==gap+1) grid[cellId(r,c)].wall=true;
        }
      });
    }else if(type==="expensive"){
      const r=10; start=cellId(r,1); const g=cellId(r,18); goals.set(g,0);
      grid.forEach(c=>{c.wall=true;c.weight=1;});
      for(let c=1;c<=18;c++) grid[cellId(r,c)].wall=false;
      for(let c=2;c<18;c++) grid[cellId(r,c)].weight=30;
      for(let rr=7;rr<=10;rr++){
        grid[cellId(rr,1)].wall=false;
        grid[cellId(rr,18)].wall=false;
      }
      for(let c=1;c<=18;c++) grid[cellId(7,c)].wall=false;
    }else if(type==="goals"){
      grid.forEach(c=>{c.wall=true;c.weight=1;});
      start=cellId(10,2);
      const near=cellId(10,7), far=cellId(5,17);
      goals.set(near,55); goals.set(far,0);
      for(let c=2;c<=7;c++) grid[cellId(10,c)].wall=false;
      for(let r=5;r<=10;r++) grid[cellId(r,2)].wall=false;
      for(let c=2;c<=17;c++) grid[cellId(5,c)].wall=false;
      for(let r=6;r<10;r++){
        [4,8,12,15].forEach(c=>grid[cellId(r,c)].wall=false);
      }
    }else if(type==="blocked"){
      start=cellId(5,2);
      const g=cellId(15,17); goals.set(g,0);
      for(let c=0;c<N;c++) grid[cellId(10,c)].wall=true;
      [[3,5],[4,5],[6,8],[7,8],[2,12],[8,14],[12,3],[13,3],[14,7],[16,10],[17,10],[12,15]].forEach(([r,c])=>{
        grid[cellId(r,c)].wall=true;
      });
    }

    renderGrid();
    clearVisuals();
    compare();
    $("#status").textContent="Escenario reproducible cargado";
  }

  function updateAlgoText(){$("#algoDescription").textContent=descriptions[selectedAlgo]}
  $$(".algo").forEach(b=>b.onclick=()=>{$$(".algo").forEach(x=>x.classList.remove("active"));b.classList.add("active");selectedAlgo=b.dataset.algo;updateAlgoText()});
  $$(".tool").forEach(b=>b.onclick=()=>{$$(".tool").forEach(x=>x.classList.remove("active"));b.classList.add("active");selectedTool=b.dataset.tool});
  $$("[data-scenario]").forEach(b=>b.onclick=()=>scenario(b.dataset.scenario));
  $("#randomBtn").onclick=randomMap;
  $("#clearBtn").onclick=()=>{randomEmpty();refreshCells();clearVisuals()};
  $("#resetBtn").onclick=()=>{clearVisuals();refreshCells()};
  $("#removeWeightsBtn").onclick=()=>{grid.forEach(c=>c.weight=1);refreshCells()};
  $("#applySizeBtn").onclick=()=>initGrid(Math.max(5,Math.min(60,Number($("#sizeInput").value)||20)));
  $("#simulateBtn").onclick=simulate;
  $("#pauseBtn").onclick=()=>{if(!running)return;paused=!paused;$("#pauseBtn").textContent=paused?"▶ Continuar":"Ⅱ Pausar";$("#status").textContent=paused?"Pausado":"Explorando…"};
  $("#stopBtn").onclick=()=>{stopped=true;paused=false;currentRunToken++;running=false;$("#status").textContent="Detenido"};
  $("#speed").oninput=()=>$("#speedText").textContent=$("#speed").value+" casillas/s";
  $("#rankBy").onchange=renderRanking;
  $("#themeBtn").onclick=()=>{document.body.classList.toggle("light");$("#themeBtn").textContent=document.body.classList.contains("light")?"☾ Modo oscuro":"☀ Modo claro"};

  function ensureAudio(){audioCtx??=new (window.AudioContext||window.webkitAudioContext)();return audioCtx}
  function tone(freq,dur=.12,vol=.03,type="sawtooth"){
    const a=ensureAudio(),o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol*(Number($("#volume").value)/100);o.connect(g);g.connect(a.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+dur);o.stop(a.currentTime+dur);
  }
  function musicTick(){
    const bpm=Number($("#trackSelect").value), base=[110,146.83,164.81,196][Math.floor(Math.random()*4)];
    tone(base,.18,.05,"sawtooth"); if(Math.random()>.45)tone(base*2,.08,.02,"square");
    musicTimer=setTimeout(musicTick,60000/bpm/2);
  }
  $("#musicBtn").onclick=()=>{
    musicOn=!musicOn;$("#musicBtn").textContent=musicOn?"Ⅱ Pausar música":"▶ Reproducir música";
    if(musicOn){ensureAudio().resume();musicTick()}else{clearTimeout(musicTimer);musicTimer=null}
  };
  $("#trackSelect").onchange=()=>{if(musicOn){clearTimeout(musicTimer);musicTick()}};
  function beepWin(){ try{tone(523.25,.12,.08,"sine");setTimeout(()=>tone(659.25,.14,.08,"sine"),120);setTimeout(()=>tone(783.99,.22,.08,"sine"),250)}catch{} }

  document.addEventListener("keydown",e=>{
    const active=document.activeElement;if(active&&["INPUT","SELECT"].includes(active.tagName))return;
    if(!start)return; const [r,c]=rc(start);let nr=r,nc=c;
    if(e.key==="ArrowUp")nr--;if(e.key==="ArrowDown")nr++;if(e.key==="ArrowLeft")nc--;if(e.key==="ArrowRight")nc++;
    if((nr!==r||nc!==c)&&inside(nr,nc)){const id=cellId(nr,nc);if(!grid[id].wall&&!goals.has(id)){start=id;refreshCells()}}
    if(e.key===" "){e.preventDefault();paint(start)}
  });

  initGrid(20);
})();