/* Snapshot the displayed cut on opening. Managing preferences does not edit the project. */
(() => {
'use strict';
const tr = J.layerText;
const labels = {
  layout:['レイアウト','Layout'],enter:['登場','Entrance'],hold:['保持','Hold'],exit:['退場','Exit'],
  decor:['装飾','Decoration'],treat:['文字の加工','Text treatment'],bg:['背景','Background'],
  cam:['カメラ','Camera'],fx:['画面効果','Screen effect'],trans:['つなぎ','Transition']
};
function element(tag, text, cls) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (cls) el.className = cls;
  return el;
}
function button(text, action) {
  const el = element('button',text,'small');
  el.type = 'button';
  el.addEventListener('click',action);
  return el;
}
function cutItems(plan,cut) {
  if (!cut || cut.line < 0 || cut.utext == null) return [];
  const slot = plan.cuts.filter(c=>c.line===cut.line && c.utext!=null).indexOf(cut);
  const events = J.lineSnapshot(plan,cut.line)?.[slot]?.events || [];
  const items = [];
  for (const group of J.GROUP_KEYS) {
    let ids = [cut[group]];
    if (group==='decor') ids = cut.decor.map(item=>item.id);
    if (group==='fx') ids = events.map(event=>event.type);
    for (const id of new Set(ids)) if (J.blacklistEligible(group,id)) items.push([group,id]);
  }
  return items;
}
function boot() {
  const api = J.uiApi;
  const opener = button(tr('ブラックリスト…','Blacklist…'),open);
  opener.id = 'btnBlacklist';
  document.getElementById('motionTools').append(opener);
  const dialog = element('dialog',null,'terms');
  dialog.id = 'blacklistDialog';
  const title = element('h2',tr('演出のブラックリスト','Technique blacklist'));
  title.id = 'blacklistHeading';dialog.setAttribute('aria-labelledby',title.id);
  const cutTitle = element('h3');
  const grid = element('div',null,'blacklist-grid');
  const note = element('p',tr('次の抽選から除外する部品を選びます。基本の中央配置・カット・静止・ゆっくり寄る・「なし」は候補切れに備えて残ります。','Select parts to exclude from future draws. Center, Cut, Still, Slow push and None are available as fallbacks.'),'note');
  const add = button(tr('選択した部品を登録','Exclude selected parts'),()=>{
    const selected = [...grid.querySelectorAll('input:checked')].map(input=>[input.dataset.group,input.value]);
    save([...J.readBlacklist(),...selected],tr('選択した部品を登録しました。','Selected parts added.'));
  });
  const listTitle = element('h3');
  const list = element('div',null,'blacklist-entries');
  const status = element('p',null,'note'); status.setAttribute('role','status');
  const file = element('input');file.type='file';file.accept='.json,application/json';file.hidden=true;
  const actions = element('div',null,'blacklist-actions');
  const exportButton = button(tr('ブラックリストJSONを保存','Export blacklist JSON'),async()=>{
    try {await J.saveFile('jizura-blacklist.json',JSON.stringify(J.blacklistFile(J.readBlacklist()),null,2));}
    catch (error) {status.textContent=error.message;}
  });
  actions.append(exportButton,button(tr('JSONから追加…','Merge from JSON…'),()=>file.click()),button(tr('閉じる','Close'),()=>dialog.close()));
  dialog.append(title,cutTitle,note,grid,add,listTitle,list,status,file,actions);
  document.body.append(dialog);
  let available=[],session=0;
  function name(group,id) { return tr(...labels[group])+' · '+J.registry(group)[id].name; }
  function render(checked = new Set()) {
    api.releaseThumbs(grid);grid.replaceChildren();list.replaceChildren();
    const entries = J.readBlacklist();
    const known = new Set(entries.map(pair=>pair.join(':')));
    add.disabled=true;
    for (const [group,id] of available) {
      const label=element('label',null,'blacklist-choice'), input=element('input');
      input.type='checkbox';input.dataset.group=group;input.value=id;
      input.disabled=known.has(group+':'+id);
      input.checked=!input.disabled && checked.has(group+':'+id);
      if (input.checked) add.disabled=false;
      const caption=element('span',name(group,id)+(input.disabled?tr('（登録済み）',' (listed)'):''));
      const canvas=element('canvas');
      canvas.width=128;canvas.height=72;canvas.dataset.g=group;canvas.dataset.k=id;
      canvas.setAttribute('aria-hidden','true');
      label.append(canvas,input,caption);grid.append(label);
    }
    if (!available.length) grid.append(element('p',tr('この位置に登録できる部品はありません。','No parts to add at this position.'),'note'));
    listTitle.textContent=tr('登録済み','Excluded parts')+' ('+entries.length+')';
    if (!entries.length) list.append(element('p',tr('まだ登録されていません。','No exclusions yet.'),'note'));
    for (const [group,id] of entries) {
      const row=element('div'), description=name(group,id);
      const remove=button(tr('やっぱり使う','Allow again'),()=>{
        save(J.readBlacklist().filter(([g,k])=>g!==group||k!==id),description+tr(' を抽選対象に戻しました。',' is eligible again.'));
      });
      remove.setAttribute('aria-label',remove.textContent+' · '+description);
      row.append(element('span',description),remove);list.append(row);
    }
    api.queueThumbs(grid);
  }
  function save(items,message) {
    const persisted=J.writeBlacklist(items);
    render();status.textContent=persisted?message:tr('このタブに反映しました。ブラウザに保存できなかったので、JSONで保存してください。','Applied in this tab. Browser storage failed. Export JSON to keep a copy.');
  }
  grid.addEventListener('change',()=>{add.disabled=!grid.querySelector('input:checked');});
  window.addEventListener('jizura-blacklist-changed',()=>{
    if (dialog.open) render(new Set([...grid.querySelectorAll('input:checked')].map(input=>input.dataset.group+':'+input.value)));
  });
  file.addEventListener('change',async()=>{
    const selected=file.files[0],ticket=session;file.value='';
    if (!selected) return;
    try {
      if (selected.size>1024*1024) throw new Error(tr('1 MB以下のブラックリストJSONを選んでください。','Choose a blacklist JSON file up to 1 MB.'));
      const imported=J.parseBlacklist(JSON.parse(await selected.text()));
      if (!dialog.open||ticket!==session) return;
      const old=J.readBlacklist(), merged=J.blacklistFile([...old,...imported]).entries;
      save(merged,tr('追加した件数：','New exclusions: ')+(merged.length-old.length));
    } catch (error) {
      if (dialog.open && ticket===session) status.textContent=error instanceof SyntaxError
        ? tr('JSONを読み取れませんでした。ブラックリストJSONを選んでください。','Could not read JSON. Choose a blacklist JSON file.') : error.message;
    }
  });
  dialog.addEventListener('close',()=>{session++;api.releaseThumbs(grid);});
  function open() {
    const S=J.ui;
    if (S.exporting||J.layerSession?.busy) return;
    const cut=J.cutAt(S.plan,S.t);
    api.pause();
    available=cutItems(S.plan,cut);
    cutTitle.textContent=cut?tr('このカットの部品','Parts in this cut')+' #'+(cut.index+1):tr('この位置にカットはありません','No cut at this position');
    status.textContent='';
    dialog.showModal();render();
  }
}
if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);else boot();
})();
