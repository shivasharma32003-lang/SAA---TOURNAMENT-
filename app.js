const CONFIG = {
  entry: 20,
  prize: 500,
  upi: 'shivaysharma52@ybl',
  api: 'https://script.google.com/macros/s/AKfycbw3lF5lyBedbTCpODywIQgq3nxBGkj_4Wx2iq6oqmX6fvY_P00AEVGD8rYEJhohffx2/exec'
};

const KEY = 'saa_players';

let data = [];
let adminLogged = false;


// ===============================
// LOAD PLAYERS FROM GOOGLE SHEET
// ===============================
async function loadPlayers() {
  try {
    const res = await fetch(CONFIG.api);
    const json = await res.json();

    if (json.success && Array.isArray(json.players)) {

      data = json.players.map(x => ({
        name: x.Name || x.name || '',
        uid: x.UID || x.uid || '',
        team: x.Team || x.team || 'solo',
        phone: x.phone || x.Phone || '',
        utr: x.UTR || x.utr || '',
        status: x.Status || x.status || 'Pending',
        kills: Number(x.Kills || x.kills || 0),
        points: Number(x.Points || x.points || 0)
      }));

      localStorage.setItem(KEY, JSON.stringify(data));

      renderBoard();

      if (adminLogged) {
        renderAdmin();
      }
    }

  } catch (err) {

    console.log('API error:', err);

    data = JSON.parse(
      localStorage.getItem(KEY) || '[]'
    );

    renderBoard();

    if (adminLogged) {
      renderAdmin();
    }
  }
}


// ===============================
// LOCAL SAVE
// ===============================
function save() {
  localStorage.setItem(
    KEY,
    JSON.stringify(data)
  );
}


// ===============================
// PAGE SWITCH
// ===============================
function show(id) {

  document
    .querySelectorAll('.page')
    .forEach(x => x.classList.remove('active'));

  const page = document.getElementById(id);

  if (page) {
    page.classList.add('active');
  }

  if (id === 'leaderboard') {
    renderBoard();
  }

  if (id === 'admin' && adminLogged) {
    renderAdmin();
  }
}


// ===============================
// REGISTRATION
// ===============================
document.getElementById('regForm').onsubmit = async function(e) {

  e.preventDefault();

  const nameValue =
    document.getElementById('name').value.trim();

  const uidValue =
    document.getElementById('uid').value.trim();

  const phoneValue =
    document.getElementById('phone').value.trim();

  const utrElement =
    document.getElementById('utr');

  const utrValue =
    utrElement ? utrElement.value.trim() : '';

  const teamElement =
    document.getElementById('team');

  const teamValue =
    teamElement ? teamElement.value.trim() : 'solo';


  // REQUIRED FIELDS
  if (
    !nameValue ||
    !uidValue ||
    !phoneValue ||
    !utrValue
  ) {

    document.getElementById('regMsg').textContent =
      'Please fill Player Name, UID, WhatsApp Number and Payment UTR.';

    return;
  }


  document.getElementById('regMsg').textContent =
    'Submitting registration...';


  try {

    await fetch(CONFIG.api, {

      method: 'POST',

      headers: {
        'Content-Type':
          'text/plain;charset=utf-8'
      },

      body: JSON.stringify({

        name: nameValue,
        uid: uidValue,
        phone: phoneValue,
        team: teamValue,
        utr: utrValue

      })

    });


    document.getElementById('regMsg').textContent =
      'Registration submitted successfully!';

    e.target.reset();

    await loadPlayers();


  } catch (err) {

    console.log(err);

    document.getElementById('regMsg').textContent =
      'Registration failed. Please try again.';

  }

};


// ===============================
// LEADERBOARD
// ===============================
function renderBoard() {

  const boardElement =
    document.getElementById('board');

  if (!boardElement) return;


  const players = [...data]
    .filter(x =>
      x.status !== 'Deleted'
    )
    .sort((a, b) =>
      b.points - a.points ||
      b.kills - a.kills
    );


  if (!players.length) {

    boardElement.innerHTML =
      '<p class="muted">No players registered.</p>';

    return;
  }


  boardElement.innerHTML =

    '<table>' +

    '<tr>' +
    '<th>#</th>' +
    '<th>Player</th>' +
    '<th>Kills</th>' +
    '<th>Points</th>' +
    '</tr>' +

    players.map((x, i) =>

      '<tr>' +

      '<td>' +
      (i + 1) +
      '</td>' +

      '<td>' +
      esc(x.name) +
      '</td>' +

      '<td>' +
      x.kills +
      '</td>' +

      '<td>' +
      x.points +
      '</td>' +

      '</tr>'

    ).join('') +

    '</table>';
}


// ===============================
// ADMIN LOGIN
// ===============================
function login() {

  const password =
    document.getElementById('adminPassword').value;


  if (password !== 'SHIVA7900') {

    alert(
      'Wrong admin password.'
    );

    return;
  }


  adminLogged = true;

  document.getElementById(
    'adminArea'
  ).hidden = false;

  renderAdmin();
}


// ===============================
// ADMIN PANEL
// ===============================
function renderAdmin() {

  const playersElement =
    document.getElementById('players');

  const scoresElement =
    document.getElementById('scores');


  if (!playersElement || !scoresElement) {
    return;
  }


  playersElement.innerHTML = data.map(
    (x, i) =>

      `<div class="panel">

        <b>${esc(x.name)}</b><br>

        UID:
        ${esc(x.uid)}<br>

        Team:
        ${esc(x.team || 'solo')}<br>

        Phone:
        ${esc(x.phone || '-')}<br>

        UTR:
        ${esc(x.utr || '-')}<br>

        Status:
        ${esc(x.status || 'Pending')}<br><br>

        <button onclick="approve(${i})">
          Approve
        </button>

        <button onclick="del(${i})">
          Delete
        </button>

      </div>`

  ).join('') ||

    '<p class="muted">No players.</p>';


  scoresElement.innerHTML = data.map(
    (x, i) =>

      `<div class="panel">

        <b>${esc(x.name)}</b>

        <input
          id="k${i}"
          type="number"
          min="0"
          value="${x.kills}"
          placeholder="Kills"
        >

        <input
          id="p${i}"
          type="number"
          min="0"
          value="${x.points}"
          placeholder="Points"
        >

        <button
          class="primary"
          onclick="score(${i})">
          Save Score
        </button>

      </div>`

  ).join('');
}


// ===============================
// APPROVE
// ===============================
function approve(i) {

  if (!data[i]) return;

  data[i].status = 'Approved';

  save();

  renderAdmin();

  renderBoard();

  alert(
    data[i].name +
    ' approved successfully.'
  );
}


// ===============================
// DELETE
// ===============================
function del(i) {

  if (!data[i]) return;

  const name = data[i].name;

  if (!confirm(
    'Delete ' + name + '?'
  )) {
    return;
  }


  data.splice(i, 1);

  save();

  renderAdmin();

  renderBoard();
}


// ===============================
// SAVE SCORE
// ===============================
function score(i) {

  if (!data[i]) return;


  const killsElement =
    document.getElementById('k' + i);

  const pointsElement =
    document.getElementById('p' + i);


  data[i].kills =
    Number(killsElement.value || 0);

  data[i].points =
    Number(pointsElement.value || 0);


  save();

  renderAdmin();

  renderBoard();

  alert('Score saved.');
}


// ===============================
// SAVE ROOM / ANNOUNCEMENT
// ===============================
function saveAdmin() {

  const roomId =
    document.getElementById('roomId');

  const roomPassword =
    document.getElementById('roomPassword');

  const announcement =
    document.getElementById('announcement');

  localStorage.setItem(
    'saa_room',
    roomId.value
  );

  localStorage.setItem(
    'saa_room_password',
    roomPassword.value
  );

  localStorage.setItem(
    'saa_notice',
    announcement.value
  );


  const notice =
    document.getElementById('notice');

  if (notice) {
    notice.textContent =
      announcement.value;
  }


  alert(
    'Match information saved.'
  );
}


// ===============================
// SECURITY / HTML ESCAPE
// ===============================
function esc(s) {

  return String(s || '')
    .replace(/[&<>"']/g, function(m) {

      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'

      }[m];

    });
}


// ===============================
// LOAD ANNOUNCEMENT
// ===============================
const savedNotice =
  localStorage.getItem('saa_notice') || '';

const noticeElement =
  document.getElementById('notice');

if (noticeElement) {
  noticeElement.textContent =
    savedNotice;
}


// ===============================
// START
// ===============================
loadPlayers();
