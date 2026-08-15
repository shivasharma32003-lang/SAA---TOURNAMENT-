const CONFIG={
  entry:20,
  prize:500,
  upi:'shivaysharma52@ybl',
  api:'https://script.google.com/macros/s/AKfycbw3lF5lyBedbTCpODywIQgq3nxBGkj_4Wx2iq6oqmX6fvY_P00AEVGD8rYEJhohffx2/exec'
};

const KEY='saa_players';
let data=[];
let adminLogged=false;

async function loadPlayers(){
  try{
    const res=await fetch(CONFIG.api);
    const json=await res.json();

    if(json.success && Array.isArray(json.players)){
      data=json.players.map(x=>({
        name:x.Name||x.name||'',
        uid:x.UID||x.uid||'',
        team:x.Team||x.team||'',
        phone:x.phone||x.Phone||'',
        status:x.Status||x.status||'Approved',
        kills:+(x.Kills||x.kills||0),
        points:+(x.Points||x.points||0)
      }));

      localStorage.setItem(KEY,JSON.stringify(data));
      renderBoard();
    }
  }catch(err){
    console.log('API error:',err);
    data=JSON.parse(localStorage.getItem(KEY)||'[]');
    renderBoard();
  }
}

function save(){
  localStorage.setItem(KEY,JSON.stringify(data));
}

function show(id){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(id==='leaderboard')renderBoard();
  if(id==='admin'&&adminLogged)renderAdmin();
}

document.getElementById('regForm').onsubmit=async e=>{
  e.preventDefault();

  const nameValue=document.getElementById('name').value.trim();
  const uidValue=document.getElementById('uid').value.trim();
  const phoneValue=document.getElementById('phone').value.trim();
  const teamEl=document.getElementById('team');
  const teamValue=teamEl?teamEl.value.trim():'solo';

  if(!nameValue||!uidValue||!phoneValue){
    regMsg.textContent='Please fill all required fields.';
    return;
  }

  regMsg.textContent='Submitting registration...';

  try{
    await fetch(CONFIG.api,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({
        name:nameValue,
        uid:uidValue,
        phone:phoneValue,
        team:teamValue
      })
    });

    regMsg.textContent='Registration submitted successfully!';
    e.target.reset();
    await loadPlayers();

  }catch(err){
    regMsg.textContent='Registration failed. Please try again.';
    console.log(err);
  }
};

function renderBoard(){
  let p=[...data].sort((a,b)=>b.points-a.points||b.kills-a.kills);

  board.innerHTML=p.length?
  '<table><tr><th>#</th><th>Player</th><th>Kills</th><th>Points</th></tr>'+
  p.map((x,i)=>
  `<tr><td>${i+1}</td><td>${esc(x.name)}</td><td>${x.kills}</td><td>${x.points}</td></tr>`
  ).join('')+
  '</table>':
  '<p class="muted">No players registered.</p>';
}

function login(){
  if(adminPassword.value!=='LOCAL_ADMIN_ONLY'){
    alert('For security, configure the real admin secret through the backend before deployment.');
    return;
  }

  adminLogged=true;
  adminArea.hidden=false;
  renderAdmin();
}

function renderAdmin(){
  players.innerHTML=data.map((x,i)=>
  `<div class="panel">
  <b>${esc(x.name)}</b><br>
  UID: ${esc(x.uid)}<br>
  Team: ${esc(x.team||'-')}<br>
  Phone: ${esc(x.phone||'-')}<br>
  Status: ${esc(x.status||'-')}<br>
  <button onclick="approve(${i})">Approve</button>
  <button onclick="del(${i})">Delete</button>
  </div>`
  ).join('')||'<p class="muted">No players.</p>';

  scores.innerHTML=data.map((x,i)=>
  `<div class="panel">
  <b>${esc(x.name)}</b>
  <input id="k${i}" type="number" value="${x.kills}">
  <input id="p${i}" type="number" value="${x.points}">
  <button class="primary" onclick="score(${i})">Save Score</button>
  </div>`
  ).join('');
}

function approve(i){
  data[i].status='Approved';
  save();
  renderAdmin();
}

function del(i){
  data.splice(i,1);
  save();
  renderAdmin();
  renderBoard();
}

function score(i){
  data[i].kills=+document.getElementById('k'+i).value;
  data[i].points=+document.getElementById('p'+i).value;
  save();
  renderAdmin();
  renderBoard();
}

function saveAdmin(){
  localStorage.setItem('saa_room',roomId.value);
  localStorage.setItem('saa_room_password',roomPassword.value);
  localStorage.setItem('saa_notice',announcement.value);
  notice.textContent=announcement.value;
  alert('Saved locally.');
}

function esc(s){
  return String(s||'').replace(/[&<>"']/g,m=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;'
  }[m]));
}

notice.textContent=localStorage.getItem('saa_notice')||'';

loadPlayers();
