const NUM_PLAYERS = 4;
const suits = ['♠','♥','♦','♣'];
let players = ['PLAYER 1','PLAYER 2','PLAYER 3','PLAYER 4'];
let rounds = [
  makeRound(), makeRound(), makeRound(), makeRound(), makeRound()
];

function makeRound(){
  return Array.from({length:NUM_PLAYERS},()=>({call:null,won:null}));
}

function calcScore(call, won){
  if(call===null || won===null || call===''||won===''||isNaN(call)||isNaN(won)) return null;
  call = Number(call); won = Number(won);
  if(won < call) return -call;
  if(won === call) return call;
  const diff = won - call;
  if(diff === 1) return +(call + 0.1).toFixed(1);
  return -call; // diff >= 2
}

function isFilled(v){
  return v!==null && v!=='' && !isNaN(v);
}

// True when all 4 players have entered a call value for this round.
function roundCallsFilled(rIdx){
  return rounds[rIdx].every(c=>isFilled(c.call));
}

// True when all 4 players have entered BOTH call and won for this round,
// AND the won values add up to exactly 13 (a full round of tricks).
function roundComplete(rIdx){
  const round = rounds[rIdx];
  const allFilled = round.every(c=>isFilled(c.call) && isFilled(c.won));
  if(!allFilled) return false;
  const wonSum = round.reduce((s,c)=>s+Number(c.won),0);
  return wonSum === 13;
}

function fmtScore(s){
  if(s===null) return '<span class="score-cell score-zero">–</span>';
  const cls = s>0 ? 'score-pos' : (s<0 ? 'score-neg':'score-zero');
  const sign = s>0 ? '+' : '';
  return `<span class="score-cell ${cls}">${sign}${s}</span>`;
}

function renderPlayers(){
  const row = document.getElementById('playersRow');
  row.innerHTML = players.map((name,i)=>{
    const defaultName = `PLAYER ${i+1}`;
    const isDefault = name === defaultName;
    return `
    <div class="player-card">
      <span class="suit">${suits[i]}</span>
      <input type="text" value="${isDefault ? '' : escapeHtml(name).replace(/"/g,'&quot;')}" placeholder="${defaultName}" data-player="${i}" maxlength="16" class="nameInput">
      <div class="total-tag" id="total-${i}">0</div>
      <div class="total-label">Total</div>
    </div>
  `;
  }).join('');
  row.querySelectorAll('.nameInput').forEach(inp=>{
    inp.addEventListener('focus', e=>{
      if(e.target.value) e.target.select();
    });
    inp.addEventListener('blur', e=>{
      const defaultName = `PLAYER ${Number(e.target.dataset.player)+1}`;
      players[e.target.dataset.player] = e.target.value || defaultName;
      renderHeader();
      renderTotals();
    });
    inp.addEventListener('input', e=>{
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      e.target.value = e.target.value.toUpperCase();
      e.target.setSelectionRange(start, end);
      const defaultName = `PLAYER ${Number(e.target.dataset.player)+1}`;
      players[e.target.dataset.player] = e.target.value || defaultName;
      renderHeader();
      renderTotals();
    });
  });
}

function renderHeader(){
  const header = document.getElementById('headerRow');
  const sub = document.getElementById('subHeaderRow');
  header.innerHTML = `<th class="round-col">Round</th>` +
    players.map(p=>`<th colspan="3">${escapeHtml(p)}</th>`).join('') +
    `<th colspan="2" class="agg-col">Round Total</th>` +
    `<th style="width:36px;"></th>`;
  sub.innerHTML = `<th class="round-col"></th>` +
    players.map(()=>`<th>Call</th><th>Won</th><th>Score</th>`).join('') +
    `<th class="agg-col">Calls</th><th class="agg-col">Won</th>` +
    `<th></th>`;
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.innerText = str;
  return d.innerHTML;
}

// Index of the round currently being played — the first round (from the
// start) that isn't complete yet. If every round so far is complete, this
// points just past the end (i.e. no round is "in progress" yet).
function currentRoundIndex(){
  for(let i=0;i<rounds.length;i++){
    if(!roundComplete(i)) return i;
  }
  return rounds.length;
}

function renderBody(){
  const body = document.getElementById('tableBody');
  // Only the round currently being played, plus the one right before it,
  // stay editable. Anything older gets locked — to edit it again, the
  // player must delete the rounds played after it.
  const currentIdx = currentRoundIndex();
  const editableMin = Math.max(0, currentIdx - 1);

  body.innerHTML = rounds.map((round, rIdx)=>{
    // A round can only be played once every round before it is fully complete
    // (all 4 calls AND all 4 won values entered).
    const progressionUnlocked = rIdx === 0 || roundComplete(rIdx-1);
    // Rounds further back than the "current" and "previous" round are locked
    // for further edits, even though they're already complete.
    const withinEditWindow = rIdx >= editableMin;
    const roundUnlocked = progressionUnlocked && withinEditWindow;
    const lockedForHistory = progressionUnlocked && !withinEditWindow;

    // Within an unlocked round, "Won" can't be touched until all 4 calls are in,
    // AND the sum of those calls must be at least 10.
    const callsFilled = roundCallsFilled(rIdx);
    const callSum = round.reduce((s,c)=> s + (isFilled(c.call) ? Number(c.call) : 0), 0);
    const callSumMeetsMin = callSum >= 10;
    const wonUnlocked = roundUnlocked && callsFilled && callSumMeetsMin;

    const cells = round.map((cell, pIdx)=>{
      const score = calcScore(cell.call, cell.won);
      let callTitle = '';
      if(!roundUnlocked){
        callTitle = lockedForHistory
          ? 'Round locked — delete the later rounds to edit this one again'
          : 'Previous round must be fully entered with Won totalling 13 first';
      }
      let wonTitle = '';
      if(!wonUnlocked){
        if(!roundUnlocked) wonTitle = callTitle;
        else if(!callsFilled) wonTitle = 'Enter all 4 calls for this round first';
        else if(!callSumMeetsMin) wonTitle = 'Total calls must be at least 10 before entering Won';
      }
      return `
        <td><input type="text" inputmode="numeric" pattern="[0-9]*" value="${cell.call ?? ''}" data-round="${rIdx}" data-player="${pIdx}" data-field="call" class="cellInput" ${roundUnlocked ? '' : 'disabled'} title="${callTitle}"></td>
        <td><input type="text" inputmode="numeric" pattern="[0-9]*" value="${cell.won ?? ''}" data-round="${rIdx}" data-player="${pIdx}" data-field="won" class="cellInput" ${wonUnlocked ? '' : 'disabled'} title="${wonTitle}"></td>
        <td>${fmtScore(score)}</td>
      `;
    }).join('');

    const callVals = round.map(c=>c.call).filter(v=>v!==null && v!=='' && !isNaN(v)).map(Number);
    const wonVals = round.map(c=>c.won).filter(v=>v!==null && v!=='' && !isNaN(v)).map(Number);
    const totalCall = callVals.reduce((a,b)=>a+b,0);
    const totalWon = wonVals.reduce((a,b)=>a+b,0);
    const wonOver = totalWon > 13;
    const allWonEntered = wonVals.length === NUM_PLAYERS;
    const hasLowCall = callVals.length === NUM_PLAYERS && totalCall < 10;

    return `<tr class="${hasLowCall ? 'low-call-row' : ''}${roundUnlocked ? '' : ' round-locked'}">
      <td class="round-col">${rIdx+1}</td>
      ${cells}
      <td class="agg-cell">${callVals.length ? totalCall : '–'}</td>
      <td class="agg-cell ${wonOver ? 'over':''}">${wonVals.length ? totalWon : '–'}${wonOver ? '<span class="agg-warning">Above 13</span>' : (allWonEntered && totalWon<13 ? '<span class="agg-warning" style="color:var(--cream-dim);">Below 13</span>' : '')}</td>
      <td><button class="del-btn" data-round="${rIdx}" title="Remove round">✕</button></td>
    </tr>`;
  }).join('');

  body.querySelectorAll('.cellInput').forEach(inp=>{
    inp.addEventListener('keydown', e=>{
      const key = e.key;
      if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)) return;
      e.preventDefault();
      let r = Number(e.target.dataset.round);
      let p = Number(e.target.dataset.player);
      let f = e.target.dataset.field; // 'call' or 'won'

      if(key === 'ArrowUp') r -= 1;
      else if(key === 'ArrowDown') r += 1;
      else if(key === 'ArrowLeft'){
        if(f === 'won'){ f = 'call'; }
        else { p -= 1; f = 'won'; }
      } else if(key === 'ArrowRight'){
        if(f === 'call'){ f = 'won'; }
        else { p += 1; f = 'call'; }
      }

      if(r < 0 || r >= rounds.length || p < 0 || p >= NUM_PLAYERS) return;

      const target = document.querySelector(`.cellInput[data-round="${r}"][data-player="${p}"][data-field="${f}"]`);
      if(target){
        target.focus();
        target.select();
      }
    });
    inp.addEventListener('input', e=>{
      const r = e.target.dataset.round, p = e.target.dataset.player, f = e.target.dataset.field;
      let raw = e.target.value.replace(/[^0-9]/g,'');
      let num = raw === '' ? null : Number(raw);

      if(num !== null && num > 13) num = 13;

      rounds[r][p][f] = num;

      if(f === 'won'){
        const wonEntries = rounds[r].map(c=>c.won);
        const filledIdx = [];
        const emptyIdx = [];
        wonEntries.forEach((v,idx)=>{
          if(v===null || v===''||isNaN(v)) emptyIdx.push(idx);
          else filledIdx.push(idx);
        });
        // Only auto-fill the OTHER empty box, and only when the user just typed
        // a value (not when they're clearing this box with backspace/delete).
        if(num !== null && filledIdx.length === 3 && emptyIdx.length === 1 && emptyIdx[0] !== Number(p)){
          const sumFilled = filledIdx.reduce((s,idx)=>s+Number(wonEntries[idx]),0);
          let remainder = 13 - sumFilled;
          if(remainder < 0) remainder = 0;
          if(remainder > 13) remainder = 13;
          rounds[r][emptyIdx[0]].won = remainder;
        }
      }

      renderBody();
      renderTotals();
      // restore focus after re-render
      const sel = document.querySelector(`.cellInput[data-round="${r}"][data-player="${p}"][data-field="${f}"]`);
      if(sel){
        sel.focus();
        const v = sel.value;
        sel.setSelectionRange(v.length, v.length);
      }
    });
  });
  body.querySelectorAll('.del-btn').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const r = Number(e.target.dataset.round);
      rounds.splice(r,1);
      renderBody();
      renderTotals();
    });
  });
}

function renderTotals(){
  const totalsRow = document.getElementById('totalsRow');
  const totals = players.map((_,pIdx)=>{
    return rounds.reduce((sum, round)=>{
      const s = calcScore(round[pIdx].call, round[pIdx].won);
      return sum + (s===null?0:s);
    },0);
  });
  const roundedTotals = totals.map(t=>Math.round(t*10)/10);
  const max = Math.max(...roundedTotals);
  totalsRow.innerHTML = `<td class="round-col">Total</td>` +
    roundedTotals.map(t=>{
      const isLead = t===max;
      return `<td colspan="3" class="${isLead?'leader':''}">${t>0?'+':''}${t}</td>`;
    }).join('') +
    `<td></td>`;

  roundedTotals.forEach((t,i)=>{
    const el = document.getElementById(`total-${i}`);
    if(el) el.textContent = (t>0?'+':'')+t;
  });
}

document.getElementById('addRoundBtn').addEventListener('click', ()=>{
  rounds.push(makeRound());
  renderBody();
  renderTotals();
});

document.getElementById('resetBtn').addEventListener('click', ()=>{
  if(confirm('Reset all calls, scores, and player names?')){
    players = ['PLAYER 1','PLAYER 2','PLAYER 3','PLAYER 4'];
    rounds = [makeRound(), makeRound(), makeRound(), makeRound(), makeRound()];
    renderPlayers();
    renderHeader();
    renderBody();
    renderTotals();
  }
});

function startNewGame(){
  if(confirm('Start a new game? This clears all player names, calls, and scores.')){
    players = ['PLAYER 1','PLAYER 2','PLAYER 3','PLAYER 4'];
    rounds = [makeRound(), makeRound(), makeRound(), makeRound(), makeRound()];
    renderPlayers();
    renderHeader();
    renderBody();
    renderTotals();
    window.scrollTo({top:0, behavior:'smooth'});
  }
}

function addRound(){
  rounds.push(makeRound());
  renderBody();
  renderTotals();
}

/* ---------- Top bar menu ---------- */
const menuBtn = document.getElementById('menuBtn');
const menuPanel = document.getElementById('menuPanel');
const menuBackdrop = document.getElementById('menuBackdrop');

function openMenu(){ menuPanel.classList.add('open'); menuBackdrop.classList.add('open'); }
function closeMenu(){ menuPanel.classList.remove('open'); menuBackdrop.classList.remove('open'); }

menuBtn.addEventListener('click', ()=>{
  menuPanel.classList.contains('open') ? closeMenu() : openMenu();
});
menuBackdrop.addEventListener('click', closeMenu);

document.getElementById('menuHome').addEventListener('click', ()=>{
  closeMenu();
  window.scrollTo({top:0, behavior:'smooth'});
});
document.getElementById('menuNewGame').addEventListener('click', ()=>{
  closeMenu();
  startNewGame();
});
document.getElementById('menuAddRound').addEventListener('click', ()=>{
  closeMenu();
  addRound();
});
document.getElementById('menuSettings').addEventListener('click', ()=>{
  closeMenu();
  document.getElementById('settingsBackdrop').classList.add('open');
});
document.getElementById('menuAbout').addEventListener('click', ()=>{
  closeMenu();
  document.getElementById('aboutBackdrop').classList.add('open');
});

/* ---------- Modals ---------- */
const aboutBackdrop = document.getElementById('aboutBackdrop');
const settingsBackdrop = document.getElementById('settingsBackdrop');

document.getElementById('aboutClose').addEventListener('click', ()=> aboutBackdrop.classList.remove('open'));
aboutBackdrop.addEventListener('click', e=>{ if(e.target === aboutBackdrop) aboutBackdrop.classList.remove('open'); });

document.getElementById('settingsClose').addEventListener('click', ()=> settingsBackdrop.classList.remove('open'));
settingsBackdrop.addEventListener('click', e=>{ if(e.target === settingsBackdrop) settingsBackdrop.classList.remove('open'); });

document.getElementById('settingsNewGame').addEventListener('click', ()=>{
  settingsBackdrop.classList.remove('open');
  startNewGame();
});

renderPlayers();
renderHeader();
renderBody();
renderTotals();
