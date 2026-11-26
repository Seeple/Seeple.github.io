'use strict';
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const safePlay = video => video.play().catch(() => {});
const pausedByUser = new WeakSet();
const film = $('#film-dialog');

// Video previews load locally. Offscreen previews stop to keep the page lightweight.
const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  const video = entry.target;
  if (entry.isIntersecting && !reducedMotion && !film.open && !pausedByUser.has(video) && !video.hidden) safePlay(video);
  else video.pause();
}), { threshold: .25 });
$$('[data-autoplay]').forEach(video => { if(reducedMotion) video.removeAttribute('autoplay'); observer.observe(video); });
document.addEventListener('visibilitychange', () => { if(document.hidden) $$('video').forEach(v=>v.pause()); });
$$('[data-toggle]').forEach(button => {
 const video = document.getElementById(button.dataset.toggle);
 button.addEventListener('click', () => {
  if(video.paused){pausedByUser.delete(video);safePlay(video);} else {pausedByUser.add(video);video.pause();}
 });
 const sync=()=>{button.textContent=video.paused?'▷':'Ⅱ';button.setAttribute('aria-label',video.paused?'Play preview':'Pause preview');};
 video.addEventListener('play',sync);video.addEventListener('pause',sync);sync();
});

function selectTab(button, selector) {
 $$(selector).forEach(tab => {const active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
}
function keyboardTabs(list) {
 list.addEventListener('keydown', event => {
  const tabs=$$('[role="tab"]',list);const index=tabs.indexOf(document.activeElement);
  if(index<0)return; let next;
  if(['ArrowRight','ArrowDown'].includes(event.key))next=(index+1)%tabs.length;
  else if(['ArrowLeft','ArrowUp'].includes(event.key))next=(index+tabs.length-1)%tabs.length;
  else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;
  event.preventDefault();tabs[next].focus();tabs[next].click();
 });
}
$$('[role="tablist"]').forEach(keyboardTabs);

const methodContent={
 preview:{file:'preview',caption:'A calibrated 3D overlay makes the policy’s planned motion visible as the operator changes viewpoint.',alt:'Spatial action preview through the headset'},
 edit:{file:'edit',caption:'Pause, edit a future waypoint, execute the corrected suffix, and resume policy inference.',alt:'An operator drags a future waypoint to correct the predicted motion'},
 learn:{caption:'Original–corrected action pairs supervise a compact residual over a frozen base policy. Figure 4 from the paper.'}
};
$$('[data-step]').forEach(button => button.addEventListener('click',()=>{
 selectTab(button,'[data-step]');const key=button.dataset.step;const entry=methodContent[key];
 const video=$('#method-video');video.pause();video.hidden=key==='learn';$('#method-image').hidden=key!=='learn';
 $('#method-panel').setAttribute('aria-labelledby',button.id);$('#method-caption').textContent=entry.caption;
 if(entry.file){video.src=`assets/video/${entry.file}.mp4`;video.poster=`assets/images/${entry.file}.webp`;video.setAttribute('aria-label',entry.alt);video.load();if(!reducedMotion)safePlay(video);}
}));

const taskContent={
 manage_table:{title:'Manage Table',file:'table',episodes:30,description:'Place a plate, fork, and spoon in order, including opening a drawer to retrieve the fork.'},
 cable_routing:{title:'Cable Routing',file:'cable',episodes:30,description:'Grasp a cable, route it around three posts in sequence, and place the cable end at its target.'},
 hang_chinese_knot:{title:'Hang Chinese Knot',file:'knot',episodes:20,description:'Grasp the knot’s upper loop and place it over a designated branch of the stand.'}
};
const methodColors={'Base Policy':'#a7aaa1','HG-DAgger':'#7e9096','Sirius':'#b0a398','ARISE + Residual':'#397f70','ARISE + FT':'#c35436'};
let resultData=null,currentTask='manage_table',currentRound='2';
function renderResults(){
 if(!resultData)return;const task=resultData[currentTask],meta=taskContent[currentTask];
 const names=['Base Policy','HG-DAgger','Sirius','ARISE + Residual','ARISE + FT'];
 const rows=names.map(method=>({method,...task.methods[method][method==='Base Policy'?'0':currentRound]}));
 $('#success-chart').innerHTML=rows.map(row=>`<div class="bar-row"><div class="bar-label"><span>${row.method}</span><span>${row.percent.toFixed(1)}%</span></div><div class="bar-track"><div class="bar-fill" style="--value:${row.percent}%;--bar-color:${methodColors[row.method]}"></div></div></div>`).join('');
 $('#success-chart').setAttribute('aria-label',`${meta.title}, round ${currentRound}. ${rows.map(r=>`${r.method}: ${r.percent.toFixed(1)} percent`).join('. ')}`);
 $('#counts-body').innerHTML=rows.map(row=>`<tr><th scope="row">${row.method}</th><td>${row.successes} / ${task.rollouts}</td></tr>`).join('');
 $('#counts-caption').textContent=`${meta.title} · round ${currentRound}`;
 const ft=task.methods['ARISE + FT'][currentRound],baseline=Math.max(task.methods['HG-DAgger'][currentRound].successes,task.methods.Sirius[currentRound].successes);
 const improvement=((ft.successes-baseline)/task.rollouts*100).toFixed(1);
 $('#chart-takeaway').innerHTML=`<strong>+${improvement} percentage points</strong> with ARISE + FT over the strongest takeover baseline in round ${currentRound}.`;
 $('#chart-note').textContent=`${task.rollouts} evaluation rollouts per method and round. ${meta.episodes} correction episodes per round.`;
}
$$('[data-task]').forEach(button=>button.addEventListener('click',()=>{
 if(currentTask===button.dataset.task)return;currentTask=button.dataset.task;selectTab(button,'[data-task]');
 const meta=taskContent[currentTask],video=$('#task-video');video.pause();video.src=`assets/video/${meta.file}.mp4`;video.poster=`assets/images/${meta.file}.webp`;video.setAttribute('aria-label',`${meta.title} correction demonstration`);video.load();if(!reducedMotion)safePlay(video);
 $('#task-panel').setAttribute('aria-labelledby',button.id);$('#task-description').textContent=meta.description;renderResults();
}));
$$('[data-round]').forEach(button=>button.addEventListener('click',()=>{
 currentRound=button.dataset.round;$$('[data-round]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderResults();
}));
fetch('data/results.json').then(r=>{if(!r.ok)throw Error('Data unavailable');return r.json();}).then(data=>{resultData=data;renderResults();}).catch(()=>{
 $('#success-chart').innerHTML='<p>Results could not be loaded. Please refresh the page, or see Figure 6 in the paper.</p>';
});

const comparisonDescriptions={
 recovery:'Base Policy, ARISE + FT, and ARISE + Residual after two rounds. Rows show Cable Routing, Manage Table, and Hang Chinese Knot.',
 takeover:'HG-DAgger, Sirius, and ARISE + FT after two rounds. Rows show Cable Routing, Manage Table, and Hang Chinese Knot.'
};
$$('[data-comparison]').forEach(button=>button.addEventListener('click',()=>{
 $$('[data-comparison]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));const key=button.dataset.comparison,video=$('#comparison-video');
 video.pause();video.src=`assets/video/${key}.mp4`;video.poster=`assets/images/${key}.webp`;video.load();safePlay(video);$('#comparison-caption').textContent=comparisonDescriptions[key];video.setAttribute('aria-label',comparisonDescriptions[key]);
}));
$('#replay-comparison').addEventListener('click',()=>{const video=$('#comparison-video');video.currentTime=0;safePlay(video);});

$$('[data-open-film]').forEach(button=>button.addEventListener('click',()=>{
 $$('video').forEach(v=>v.pause());film.showModal();document.body.style.overflow='hidden';safePlay($('#full-video'));
}));
$('#close-film').addEventListener('click',()=>film.close());
film.addEventListener('close',()=>{$('#full-video').pause();document.body.style.overflow='';});
film.addEventListener('click',event=>{const r=film.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)film.close();});

const sectionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
 if(entry.isIntersecting)$$('.site-header nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===`#${entry.target.id}`));
}),{rootMargin:'-15% 0px -60% 0px'});
$$('#overview,#method,#results,#paper').forEach(section=>sectionObserver.observe(section));
