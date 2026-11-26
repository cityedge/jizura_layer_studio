/* Keep-clear editing is a preview overlay; it never enters a renderer/export. */
(() => {
'use strict';
const $ = id => document.getElementById(id), tr = J.layerText;
let drag = null, pending = 0;
const target = () => J.ui?.plan && J.cueAtTime(J.ui.plan,J.ui.t);
function geometry() {
  const S = J.ui, line = target();
  if (!S?.plan || J.freeAreaMode(S.project) !== 'custom' || !line?.text.length || line.interlude) return null;
  return {...J.freeAreaGeometry(S.project,line.index,S.plan.W,S.plan.H),line,closed:!J.cueKeepsArea(S.project,line.index)};
}
// Keep the Move handle and its adjacent door button inside the visible picture.
function handlePosition(g, scale) {
  const {W,H} = J.ui.plan, r = g.rect;
  const x = g.vertical ? r.x + r.w/2 : Math.min(W*.12, 90/scale);
  const y = g.vertical ? Math.min(H*.12, 36/scale) : r.y + r.h/2;
  return {x:J.clamp(x, 26/scale, W-64/scale), y:J.clamp(y, 13/scale, H-13/scale)};
}
function pauseAtPreviewTime() {
  const time = J.ui.t;
  J.uiApi.pause();
  J.ui.t = time;
}
function keepLooks() { J.captureLocalLooks(J.ui.project,J.ui.plan,J.uiApi.audioLike()); }
function redraw() { J.uiApi.replan(); J.uiApi.syncUI(); J.ui.need = true; }
J.changeFreeAreaMode = mode => {
  if (!['off','center','custom'].includes(mode) || J.ui.exporting || J.layerSession?.busy) return;
  const S=J.ui;
  J.uiApi.pushEdit(); keepLooks();
  S.project.centerFree = mode !== 'off'; S.project.freeAreaMode = mode === 'custom' ? 'custom' : null;
  if (mode === 'custom') J.ensureFreeAreas(S.project,S.plan.lines);
  J.rekeyLocalLooks(S.project,S.plan,J.uiApi.audioLike());
  redraw(); J.uiApi.flushSave();
};
J.syncFreeAreaUI = () => {
  const S=J.ui;if (!S?.project) return;
  const custom=J.freeAreaMode(S.project)==='custom',side=J.freeAreaSide(S.project);
  document.querySelectorAll('.free-area-options').forEach(el=>el.hidden=!custom);
  document.querySelectorAll('.free-area-reset').forEach(el=>{el.disabled=!S.plan?.lines.length;el.title=side==='wide'?tr('全字幕の横長用だけを中央に戻します。','Reset only landscape settings for all subtitles.'):tr('全字幕の縦長用だけを中央に戻します。','Reset only portrait settings for all subtitles.');});
  $('view').style.touchAction=custom?'none':'';
  const info=geometry();
  $('freeAreaDoor').hidden=!info;
  document.querySelectorAll('.free-area-status').forEach(el=>el.textContent=(side==='wide'?tr('横長用','Landscape'):tr('縦長用','Portrait'))+' · '+(info?tr('字幕 ','Cue ')+(info.line.index+1):tr('字幕のある時刻へ移動してください','Seek to a subtitle to edit')));
};
J.drawFreeAreaGuide = (ctx,k) => {
  J.syncFreeAreaUI();
  const g=geometry();if (!g) return;
  const {rect:r}=g,W=J.ui.plan.W,H=J.ui.plan.H;
  const canvas=$('view'),bounds=canvas.getBoundingClientRect(),s=Math.min(bounds.width/W,bounds.height/H)||k;
  const {x:hx,y:hy}=handlePosition(g,s), door=$('freeAreaDoor');
  door.style.left=(canvas.offsetLeft+(bounds.width-W*s)/2+hx*s+29)+'px';
  door.style.top=(canvas.offsetTop+(bounds.height-H*s)/2+hy*s-12)+'px';
  const action=g.closed?tr('この字幕の空ける領域を開く','Open this subtitle’s band'):tr('この字幕の空ける領域を閉じる','Close this subtitle’s band');
  if(door.title!==action) {
    door.title=action;
    door.setAttribute('aria-label',action);
    door.classList.toggle('open-band',g.closed);
  }
  if(g.closed)return;
  ctx.save();ctx.setTransform(k,0,0,k,0,0);
  ctx.strokeStyle='#00e5d0';ctx.lineWidth=2/s;ctx.setLineDash([8/s,5/s]);ctx.strokeRect(r.x+1/s,r.y+1/s,Math.max(0,r.w-2/s),Math.max(0,r.h-2/s));ctx.setLineDash([]);
  ctx.fillStyle='#101820';ctx.fillRect(hx-25/s,hy-12/s,50/s,24/s);ctx.strokeRect(hx-25/s,hy-12/s,50/s,24/s);
  ctx.fillStyle='#fff';ctx.font=`${11/s}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(tr('移動','Move'),hx,hy);
  ctx.restore();
};
function point(e) {
  const c=$('view'),r=c.getBoundingClientRect(),P=J.ui.plan,s=Math.min(r.width/P.W,r.height/P.H);
  return {x:(e.clientX-r.left-(r.width-P.W*s)/2)/s,y:(e.clientY-r.top-(r.height-P.H*s)/2)/s,s};
}
function hit(e,g) {
  const p=point(e),r=g.rect,W=J.ui.plan.W,H=J.ui.plan.H;
  if(g.closed||p.x<0||p.y<0||p.x>W||p.y>H)return null;
  const {x:hx,y:hy}=handlePosition(g,p.s);
  if(Math.abs(p.x-hx)<=25/p.s&&Math.abs(p.y-hy)<=12/p.s)return 'move';
  const v=g.vertical?p.x:p.y,lo=g.vertical?r.x:r.y,hi=lo+(g.vertical?r.w:r.h),tol=9/p.s;
  if(Math.abs(v-lo)<=tol)return 'lo';if(Math.abs(v-hi)<=tol)return 'hi';
  return null;
}
function finish(e) {
  if (!drag || (e.pointerId!=null && e.pointerId!==drag.pointer)) return;
  if(pending){cancelAnimationFrame(pending);pending=0;}
  const id=drag.pointer;drag=null;
  if($('view').hasPointerCapture(id))$('view').releasePointerCapture(id);
  redraw();J.uiApi.flushSave();
}
J.initFreeAreaUI = () => {
  const door=document.createElement('button');
  door.type='button';door.id='freeAreaDoor';door.hidden=true;
  $('viewport').append(door);
  const canToggle=()=>!drag && !J.ui.exporting && !J.layerSession?.busy;
  door.addEventListener('pointerdown',e=>{
    if(e.button===0 && canToggle()) pauseAtPreviewTime();
  });
  door.addEventListener('keydown',e=>{
    if(e.key===' '||e.key==='Enter') e.stopPropagation();
  });
  door.addEventListener('click',e=>{
    const g=geometry();
    if(!g||!canToggle())return;
    pauseAtPreviewTime();
    J.uiApi.pushEdit();keepLooks();
    const p=J.ui.project,areas=p.freeAreas[J.freeAreaKey(p,g.line.index)];
    if(g.closed)delete areas.closed;
    else areas.closed=true;
    redraw();J.uiApi.flushSave();
    if(e.detail)door.blur();
  });
  for (const id of ['outCenter','eCenter']) {
    const old=$(id),wrap=old.closest('label'),box=document.createElement('div');box.className='free-area-control';
    const label=document.createElement('label');label.className='row';label.textContent=tr('空ける領域','Keep-clear area');
    const select=document.createElement('select');select.id=id;select.setAttribute('aria-label',tr('空ける領域','Keep-clear area'));
    for(const [v,ja,en] of [['off','空けない','None'],['center','中央を空ける','Center'],['custom','任意領域を空ける','Custom band']]){const o=document.createElement('option');o.value=v;o.textContent=tr(ja,en);select.append(o);}
    label.append(select);box.append(label);
    const options=document.createElement('div');options.className='free-area-options';options.hidden=true;
    const button=document.createElement('button');button.type='button';button.className='ghost small free-area-reset';button.id=id+'Reset';button.textContent=tr('空ける領域をリセット','Reset keep-clear areas');
    button.onclick=()=>{
      if(J.ui.exporting||J.layerSession?.busy)return;
      J.uiApi.pushEdit();keepLooks();J.resetFreeAreas(J.ui.project,J.ui.plan.lines);redraw();J.uiApi.flushSave();button.blur();
      J.uiApi.toast(tr('表示中の側だけ、全字幕の帯を中央に戻しました（Ctrl+Zで戻せます）。','Reset all bands for the current orientation only (Ctrl+Z to undo).'));
    };
    const status=document.createElement('p');status.className='note free-area-status';options.append(button,status);box.append(options);
    const note=document.createElement('p');note.className='note';note.textContent=tr('任意：点線で幅を、「移動」で位置を調整。▶│◀ でこの字幕だけ帯を閉じ、◀│▶ で元に戻します。位置と幅は横長用・縦長用に保存します。背景図形・画面効果は対象外です。','Custom: drag an edge to resize, or Move to reposition. ▶│◀ closes the band for this subtitle. ◀│▶ restores it. Landscape and portrait keep separate positions and widths. Background graphics and screen effects are excluded.');box.append(note);wrap.replaceWith(box);
  }
  const canvas=$('view');
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0||J.ui.exporting||J.layerSession?.busy)return;
    const g=geometry(),kind=g&&hit(e,g);if(!kind)return;
    e.preventDefault();e.stopImmediatePropagation();
    pauseAtPreviewTime();J.uiApi.pushEdit();keepLooks();J.ensureFreeAreas(J.ui.project,J.ui.plan.lines);
    const p=point(e);drag={pointer:e.pointerId,index:g.line.index,side:J.freeAreaSide(J.ui.project),kind,band:{...g.band},start:g.vertical?p.x:p.y,vertical:g.vertical,size:g.vertical?J.ui.plan.W:J.ui.plan.H};
    canvas.setPointerCapture(e.pointerId);
  },true);
  canvas.addEventListener('pointermove',e=>{
    if(!drag){const g=geometry(),kind=g&&hit(e,g);canvas.style.cursor=kind==='move'?'move':kind?(g.vertical?'ew-resize':'ns-resize'):'';return;}
    if(e.pointerId!==drag.pointer)return;e.preventDefault();
    const d=drag,p=point(e),delta=((d.vertical?p.x:p.y)-d.start)/d.size,b=d.band;
    let lo=b.position-b.width/2,hi=b.position+b.width/2;
    if(d.kind==='move'){const shift=J.clamp(delta,-lo,1-hi);lo+=shift;hi+=shift;}
    else if(d.kind==='lo')lo=J.clamp(lo+delta,Math.max(0,hi-.72),hi-.08);
    else hi=J.clamp(hi+delta,lo+.08,Math.min(1,lo+.72));
    J.ui.project.freeAreas[J.freeAreaKey(J.ui.project,d.index)][d.side]={position:(lo+hi)/2,width:hi-lo};
    if(!pending)pending=requestAnimationFrame(()=>{pending=0;redraw();});
  });
  canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);
};
})();
