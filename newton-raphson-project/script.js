(function(){
  var $=function(id){return document.getElementById(id)};
  var PRESETS=[
    {n:'x³ − 8x + 5',f:'x^3 - 8x + 5',x0:0},
    {n:'x⁴ − 11x + 8',f:'x^4 - 11x + 8',x0:2},
    {n:'e⁻ˣ − x',f:'exp(-x) - x',x0:0},
    {n:'x³ − 2x² + 0.25x + 0.75',f:'x^3 - 2x^2 + 0.25x + 0.75',x0:-1}
  ];
  var S={xs:[],fs:[],ds:[],steps:0,f:null,d1:null,d2:null,cur:0,timer:null,status:'',conv:null};

  function fmt(v,d){
    if(!isFinite(v))return '—';
    if(v!==0&&Math.abs(v)<1e-9)return v.toExponential(2);
    return v.toFixed(d==null?6:d);
  }
  function cssv(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}

  function compile(src){
    var node=math.parse(src);
    var d1=math.derivative(node,'x'), d2=math.derivative(d1,'x');
    var mk=function(nd){var c=nd.compile();return function(x){var r=c.evaluate({x:x});return typeof r==='number'?r:NaN}};
    return {f:mk(node),d1:mk(d1),d2:mk(d2)};
  }

  function run(){
    var err=$('err');err.textContent='';
    stop();
    var src=$('fx').value.trim(), x0=parseFloat($('x0').value), tol=parseFloat($('tol').value), maxit=Math.max(1,Math.min(500,parseInt($('maxit').value)||50));
    if(!src){err.textContent='Enter a function f(x).';return}
    if(!isFinite(x0)){err.textContent='x₀ must be a number.';return}
    if(!(tol>0)){err.textContent='Tolerance must be a positive number such as 1e-6.';return}
    var fn;
    try{fn=compile(src);fn.f(x0)}catch(e){err.textContent='Could not read that function. Use x as the variable, e.g. x^3 - 8x + 5.';return}
    var xs=[x0],fs=[fn.f(x0)],ds=[NaN],status='max';
    for(var i=0;i<maxit;i++){
      var x=xs[i],fx=fn.f(x),dx=fn.d1(x);
      if(!isFinite(fx)||!isFinite(dx)){status='undefined';break}
      if(dx===0){status='flat';break}
      var xn=x-fx/dx;
      if(!isFinite(xn)){status='undefined';break}
      xs.push(xn);fs.push(fn.f(xn));ds.push(Math.abs(xn-x));
      if(Math.abs(xn-x)<tol){status='ok';break}
    }
    var c=fn.d1(x0),cond=fn.f(x0)*fn.d2(x0)/(c*c);
    S.f=fn.f;S.d1=fn.d1;S.d2=fn.d2;S.xs=xs;S.fs=fs;S.ds=ds;S.steps=xs.length-1;S.status=status;S.tol=tol;
    S.conv={v:cond,x0:x0,f:fn.f(x0),d1:c,d2:fn.d2(x0)};
    $('step').max=S.steps;S.cur=S.steps;$('step').value=S.cur;
    render();
    if(S.steps>0){S.cur=0;$('step').value=0;draw();play()}
  }

  function render(){
    var n=S.steps,last=S.xs[n],fl=S.fs[n],ok=S.status==='ok';
    var msg={ok:'Converged',max:'Max iterations reached',flat:'Stopped: f′(x) = 0',undefined:'Stopped: value undefined'}[S.status];
    $('tiles').innerHTML=
      '<div class="tile"><span>Iterations</span><b>'+n+'</b></div>'+
      '<div class="tile'+(ok?' ok':'')+'"><span>Root x*</span><b>'+fmt(last,6)+'</b></div>'+
      '<div class="tile"><span>f(x*)</span><b>'+fmt(fl,9)+'</b></div>'+
      '<div class="tile"><span>Status</span><b style="font-size:.95rem;font-family:var(--f-body);font-weight:600">'+msg+'</b></div>';
    var c=S.conv,good=isFinite(c.v)&&Math.abs(c.v)<1;
    $('conv').innerHTML='<span class="badge'+(good?'':' warn')+'">'+(good?'CONDITION HOLDS':'CONDITION FAILS')+'</span><div>'+
      '<code>|f(x₀)·f″(x₀) / [f′(x₀)]²| = |('+fmt(c.f,5)+')('+fmt(c.d2,5)+') / ('+fmt(c.d1,5)+')²| = '+fmt(Math.abs(c.v),5)+'</code><br>'+
      (good?'This is less than 1, so the iteration is guaranteed to converge from x₀.':'This is not less than 1 at x₀. The method may still converge, but there is no guarantee. Try another x₀ closer to the root.')+'</div>';
    var h='<thead><tr><th>i</th><th>x<sub>i</sub></th><th>f(x<sub>i</sub>)</th><th>f′(x<sub>i</sub>)</th><th>|x<sub>i</sub> − x<sub>i−1</sub>|</th></tr></thead><tbody>';
    for(var i=0;i<=n;i++){
      h+='<tr data-i="'+i+'" id="r'+i+'"><td>'+i+'</td><td>'+fmt(S.xs[i],6)+'</td><td>'+fmt(S.fs[i],6)+'</td><td>'+fmt(S.d1(S.xs[i]),6)+'</td><td>'+(i?fmt(S.ds[i],6):'—')+'</td></tr>';
    }
    $('tbl').innerHTML=h+'</tbody>';
    draw();
  }

  function setStep(i){S.cur=Math.max(0,Math.min(S.steps,i));$('step').value=S.cur;draw()}
  function play(){
    stop();$('play').textContent='❚❚ Pause';
    if(S.cur>=S.steps)S.cur=0;
    S.timer=setInterval(function(){
      if(S.cur>=S.steps){stop();return}
      setStep(S.cur+1);
    },matchMedia('(prefers-reduced-motion:reduce)').matches?200:750);
  }
  function stop(){if(S.timer){clearInterval(S.timer);S.timer=null}$('play').textContent='▶ Play'}

  function draw(){
    var cv=$('cv'),dpr=window.devicePixelRatio||1,W=cv.clientWidth,H=cv.clientHeight;
    if(!W||!H||!S.xs.length)return;
    cv.width=W*dpr;cv.height=H*dpr;
    var g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
    var ink=cssv('--ink'),muted=cssv('--muted'),line=cssv('--line'),curve=cssv('--curve'),tan=cssv('--tangent'),root=cssv('--root');
    // view window from all iterates
    var lo=Math.min.apply(null,S.xs),hi=Math.max.apply(null,S.xs),span=Math.max(hi-lo,1),pad=span*0.3;
    var x0v=lo-pad,x1v=hi+pad;
    var ys=[0],i;
    for(i=0;i<S.xs.length;i++)if(isFinite(S.fs[i]))ys.push(S.fs[i]);
    // also sample curve so the shape near the window is visible
    var N=300,samp=[];
    for(i=0;i<=N;i++){var x=x0v+(x1v-x0v)*i/N,y=S.f(x);samp.push([x,y]);}
    var ylo=Math.min.apply(null,ys),yhi=Math.max.apply(null,ys);
    var ysp=Math.max(yhi-ylo,1e-6);
    ylo-=ysp*0.18;yhi+=ysp*0.18;
    // keep the window from being too flat when all f values are tiny
    var L=52,R=16,T=16,B=34,pw=W-L-R,ph=H-T-B;
    var sx=function(x){return L+(x-x0v)/(x1v-x0v)*pw},sy=function(y){return T+(yhi-y)/(yhi-ylo)*ph};
    function nice(a,b,k){var r=(b-a)/k,p=Math.pow(10,Math.floor(Math.log10(r))),m=r/p,s=m<1.5?1:m<3?2:m<7?5:10;return s*p}
    g.font='11px JetBrains Mono, monospace';g.lineWidth=1;
    var tx=nice(x0v,x1v,7),ty=nice(ylo,yhi,6),v;
    g.strokeStyle=line;g.fillStyle=muted;g.textAlign='center';
    for(v=Math.ceil(x0v/tx)*tx;v<=x1v;v+=tx){g.beginPath();g.moveTo(sx(v),T);g.lineTo(sx(v),T+ph);g.stroke();g.fillText(+v.toFixed(6),sx(v),H-12)}
    g.textAlign='right';
    for(v=Math.ceil(ylo/ty)*ty;v<=yhi;v+=ty){g.beginPath();g.moveTo(L,sy(v));g.lineTo(L+pw,sy(v));g.stroke();g.fillText(+v.toFixed(6),L-6,sy(v)+4)}
    // axes
    g.strokeStyle=ink;g.lineWidth=1.5;
    if(ylo<0&&yhi>0){g.beginPath();g.moveTo(L,sy(0));g.lineTo(L+pw,sy(0));g.stroke()}
    if(x0v<0&&x1v>0){g.beginPath();g.moveTo(sx(0),T);g.lineTo(sx(0),T+ph);g.stroke()}
    g.save();g.beginPath();g.rect(L,T,pw,ph);g.clip();
    // curve
    g.strokeStyle=curve;g.lineWidth=2.5;g.beginPath();var pen=false;
    for(i=0;i<samp.length;i++){var p=samp[i];if(!isFinite(p[1])||Math.abs(p[1])>1e9){pen=false;continue}
      if(!pen){g.moveTo(sx(p[0]),sy(p[1]));pen=true}else g.lineTo(sx(p[0]),sy(p[1]))}
    g.stroke();
    // tangents up to the current step
    for(i=0;i<S.cur&&i<S.steps;i++){
      var xa=S.xs[i],fa=S.fs[i],xb=S.xs[i+1],latest=(i===S.cur-1);
      g.globalAlpha=latest?1:0.45;
      g.setLineDash([5,4]);g.strokeStyle=muted;g.lineWidth=1;
      g.beginPath();g.moveTo(sx(xa),sy(0));g.lineTo(sx(xa),sy(fa));g.stroke();g.setLineDash([]);
      g.strokeStyle=tan;g.lineWidth=latest?2.5:1.5;
      var ex=xb-(xb-xa)*0.25,ey=S.d1(xa)*(ex-xa)+fa;
      g.beginPath();g.moveTo(sx(xa),sy(fa));g.lineTo(sx(ex),sy(ey));g.stroke();
      g.fillStyle=curve;g.beginPath();g.arc(sx(xa),sy(fa),4,0,6.3);g.fill();
    }
    g.globalAlpha=1;
    // current point on curve
    var cx=S.xs[S.cur],cy=S.fs[S.cur];
    if(isFinite(cy)){g.fillStyle=curve;g.beginPath();g.arc(sx(cx),sy(cy),5.5,0,6.3);g.fill()}
    g.restore();
    // iterates on x axis
    var y0=(ylo<0&&yhi>0)?sy(0):T+ph;
    g.textAlign='center';g.font='600 11px JetBrains Mono, monospace';
    for(i=0;i<=S.cur;i++){
      var px=sx(S.xs[i]);if(px<L-2||px>L+pw+2)continue;
      var isCur=i===S.cur;
      g.fillStyle=isCur?root:muted;g.beginPath();g.arc(px,y0,isCur?6:4,0,6.3);g.fill();
      if(isCur||i<3||S.cur<8){g.fillStyle=isCur?root:muted;g.fillText('x'+sub(i),px,y0-(i%2?24:12))}
    }
    var rows=document.querySelectorAll('#tbl tr');
    for(i=0;i<rows.length;i++)rows[i].classList.remove('cur','final');
    var rr=$('r'+S.cur);if(rr){rr.classList.add('cur');if(S.cur===S.steps&&S.status==='ok')rr.classList.add('final')}
    $('steplbl').textContent='x'+sub(S.cur)+' = '+fmt(S.xs[S.cur],5);
  }
  function sub(n){return String(n).replace(/\d/g,function(d){return '₀₁₂₃₄₅₆₇₈₉'[d]})}

  // events
  $('form').addEventListener('submit',function(e){e.preventDefault();run()});
  $('play').addEventListener('click',function(){S.timer?stop():play()});
  $('prev').addEventListener('click',function(){stop();setStep(S.cur-1)});
  $('next').addEventListener('click',function(){stop();setStep(S.cur+1)});
  $('step').addEventListener('input',function(){stop();setStep(+this.value)});
  $('tbl').addEventListener('click',function(e){var tr=e.target.closest('tr[data-i]');if(tr){stop();setStep(+tr.dataset.i)}});
  var pb=$('presets');
  PRESETS.forEach(function(p){
    var b=document.createElement('button');b.type='button';b.className='chip';b.textContent=p.n+'  (x₀='+p.x0+')';
    b.addEventListener('click',function(){$('fx').value=p.f;$('x0').value=p.x0;run()});pb.appendChild(b);
  });
  window.addEventListener('resize',draw);
  matchMedia('(prefers-color-scheme:dark)').addEventListener&&matchMedia('(prefers-color-scheme:dark)').addEventListener('change',draw);
  window.__nr={run:run,S:S};
  run();
})();
