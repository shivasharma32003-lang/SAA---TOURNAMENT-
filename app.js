/* =========================================
   SAA TOURNAMENT - FINAL APP.JS
   ========================================= */

const CONFIG = {
  entry: 20,
  prize: 500,
  upi: "shivaysharma52@ybl",

  // GOOGLE APPS SCRIPT WEB APP URL
  api: "https://script.google.com/macros/s/AKfycbwtBcOrcXx_gyaUWDd5lPECVQdB893M--4j7gPbuiV7TRlSBkmLkww6cephpl5H1agy/exec",

  // ADMIN PASSWORD
  adminPassword: "123456789"
};

const PLAYERS_KEY = "saa_players";
const MATCH_KEY = "saa_match_info";

let players = [];
let adminLogged = false;


/* =========================================
   BASIC HELPERS
   ========================================= */

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function get(id) {
  return document.getElementById(id);
}


/* =========================================
   LOCAL STORAGE
   ========================================= */

function savePlayers() {
  localStorage.setItem(
    PLAYERS_KEY,
    JSON.stringify(players)
  );
}


function loadPlayersLocal() {
  try {
    players = JSON.parse(
      localStorage.getItem(PLAYERS_KEY) || "[]"
    );

    if (!Array.isArray(players)) {
      players = [];
    }

  } catch (e) {
    players = [];
  }
}


/* =========================================
   GOOGLE SHEET - LOAD
   ========================================= */

async function loadPlayersFromGoogle() {

  if (!CONFIG.api) {
    return;
  }

  try {

    const response = await fetch(CONFIG.api);

    if (!response.ok) {
      throw new Error("Google API error");
    }

    const result = await response.json();

    if (
      result &&
      result.success &&
      Array.isArray(result.players)
    ) {

      players = result.players.map(function (x) {

        return {
          name: x.Name || x.name || "",
          uid: x.UID || x.uid || "",
          phone: x.Phone || x.phone || "",
          team: x.Team || x.team || "solo",
          utr: x.UTR || x.utr || "",
          status: x.Status || x.status || "Pending",
          kills: Number(x.Kills || x.kills || 0),
          points: Number(x.Points || x.points || 0)
        };

      });

      savePlayers();
      renderLeaderboard();

      if (adminLogged) {
        renderAdmin();
      }
    }

  } catch (error) {

    console.log(
      "Google Sheet load failed:",
      error
    );

    // Website local data se continue karegi
  }
}


/* =========================================
   PAGE SHOW
   ========================================= */

function show(id) {

  document
    .querySelectorAll(".page")
    .forEach(function(page) {
      page.classList.remove("active");
    });

  const page = get(id);

  if (page) {
    page.classList.add("active");
  }

  if (id === "leaderboard") {
    renderLeaderboard();
  }

  if (id === "admin") {
    renderAdmin();
  }

  if (id === "home") {
    renderMatchInfo();
  }
}


/* =========================================
   REGISTRATION
   ========================================= */

function setupRegistration() {

  const form = get("regForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async function(e) {

    e.preventDefault();

    const name = get("name")?.value.trim() || "";
    const uid = get("uid")?.value.trim() || "";
    const phone = get("phone")?.value.trim() || "";
    const utr = get("utr")?.value.trim() || "";

    if (!name) {
      alert("Player Name डालें.");
      return;
    }

    if (!uid) {
      alert("Free Fire UID डालें.");
      return;
    }

    if (!phone) {
      alert("WhatsApp Number डालें.");
      return;
    }

    if (!utr) {
      alert("Payment UTR / Transaction ID डालें.");
      return;
    }


    /* Check duplicate UID */

    const alreadyExists = players.some(function(player) {
      return String(player.uid) === String(uid);
    });

    if (alreadyExists) {
      alert("यह UID पहले से registered है.");
      return;
    }


    /* Slot limit */

    if (players.length >= 48) {
      alert("Tournament के सभी 48 slots भर चुके हैं.");
      return;
    }


    const player = {
      name: name,
      uid: uid,
      phone: phone,
      team: "solo",
      utr: utr,
      status: "Pending",
      kills: 0,
      points: 0
    };


    /* Local save */

    players.push(player);
    savePlayers();
    renderLeaderboard();


    /* Google Sheet */

    try {

      const response = await fetch(
        CONFIG.api,
        {
          method: "POST",

          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },

          body: JSON.stringify({
            action: "register",
            player: player
          })
        }
      );

      const result = await response.json();

      if (
        result &&
        result.success === false
      ) {

        alert(
          result.error ||
          "Registration में समस्या हुई."
        );

        return;
      }

    } catch (error) {

      console.log(
        "Google registration error:",
        error
      );

      /*
        Local registration already saved.
        इसलिए user का data खोएगा नहीं.
      */
    }


    const message = get("regMsg");

    if (message) {
      message.textContent =
        "Registration successful! Admin approval का इंतजार करें.";
    }

    alert(
      "Registration successful!"
    );

    form.reset();

  });
}


/* =========================================
   LEADERBOARD
   ========================================= */

function renderLeaderboard() {

  const board = get("board");

  if (!board) {
    return;
  }


  const approved = players
    .filter(function(player) {

      return String(
        player.status || ""
      ).toLowerCase() === "approved";

    })
    .sort(function(a, b) {

      return (
        Number(b.points || 0) -
        Number(a.points || 0)
      );

    });


  if (approved.length === 0) {

    board.innerHTML =
      '<p>No approved players yet.</p>';

    return;
  }


  board.innerHTML = approved
    .map(function(player, index) {

      return `
        <div class="panel">

          <h3>
            #${index + 1}
            ${esc(player.name)}
          </h3>

          <p>
            UID:
            ${esc(player.uid)}
          </p>

          <p>
            Kills:
            <b>${Number(player.kills || 0)}</b>
          </p>

          <p>
            Points:
            <b>${Number(player.points || 0)}</b>
          </p>

        </div>
      `;

    })
    .join("");
}


/* =========================================
   ADMIN LOGIN
   ========================================= */

function login() {

  const passwordInput =
    get("adminPassword");

  if (!passwordInput) {
    return;
  }

  const password =
    passwordInput.value.trim();


  if (
    password ===
    CONFIG.adminPassword
  ) {

    adminLogged = true;

    alert("Admin Login Successful!");

    passwordInput.value = "";

    renderAdmin();

  } else {

    alert("Wrong Admin Password.");

    passwordInput.value = "";
  }
}


/* =========================================
   ADMIN PANEL
   ========================================= */

function renderAdmin() {

  const area = get("adminArea");

  if (!area) {
    return;
  }


  if (!adminLogged) {

    area.hidden = true;

    return;
  }


  area.hidden = false;


  /* Room fields */

  loadMatchInfo();


  /* Players */

  const playersBox =
    get("players");

  if (playersBox) {

    if (players.length === 0) {

      playersBox.innerHTML =
        "<p>No players registered.</p>";

    } else {

      playersBox.innerHTML =
        players.map(function(player, index) {

          return `
            <div class="panel">

              <b>${esc(player.name)}</b>

              <p>
                UID:
                ${esc(player.uid)}
              </p>

              <p>
                Phone:
                ${esc(player.phone)}
              </p>

              <p>
                UTR:
                ${esc(player.utr)}
              </p>

              <p>
                Status:
                <b>${esc(player.status)}</b>
              </p>

              <button
                onclick="approvePlayer(${index})">
                Approve
              </button>

              <button
                onclick="deletePlayer(${index})">
                Delete
              </button>

            </div>
          `;

        }).join("");
    }
  }


  /* Scores */

  const scoresBox =
    get("scores");

  if (scoresBox) {

    if (players.length === 0) {

      scoresBox.innerHTML =
        "<p>No players.</p>";

    } else {

      scoresBox.innerHTML =
        players.map(function(player, index) {

          return `
            <div class="panel">

              <b>${esc(player.name)}</b>

              <input
                id="kills_${index}"
                type="number"
                min="0"
                value="${Number(player.kills || 0)}"
                placeholder="Kills"
              >

              <input
                id="points_${index}"
                type="number"
                min="0"
                value="${Number(player.points || 0)}"
                placeholder="Points"
              >

              <button
                onclick="saveScore(${index})">
                Save Score
              </button>

            </div>
          `;

        }).join("");
    }
  }
}


/* =========================================
   APPROVE PLAYER
   ========================================= */

function approvePlayer(index) {

  if (!adminLogged) {
    alert("Admin login required.");
    return;
  }

  if (!players[index]) {
    return;
  }

  players[index].status = "Approved";

  savePlayers();

  renderAdmin();
  renderLeaderboard();

  alert(
    players[index].name +
    " approved successfully."
  );
}


/* =========================================
   DELETE PLAYER
   ========================================= */

function deletePlayer(index) {

  if (!adminLogged) {
    alert("Admin login required.");
    return;
  }

  if (!players[index]) {
    return;
  }


  const name =
    players[index].name;


  const confirmDelete =
    confirm(
      name +
      " को delete करना है?"
    );


  if (!confirmDelete) {
    return;
  }


  players.splice(index, 1);

  savePlayers();

  renderAdmin();
  renderLeaderboard();

  alert("Player deleted.");
}


/* =========================================
   SAVE SCORE
   ========================================= */

function saveScore(index) {

  if (!adminLogged) {
    alert("Admin login required.");
    return;
  }

  if (!players[index]) {
    return;
  }


  const killsInput =
    get("kills_" + index);

  const pointsInput =
    get("points_" + index);


  const kills =
    Number(killsInput?.value || 0);

  const points =
    Number(pointsInput?.value || 0);


  players[index].kills =
    Math.max(0, kills);

  players[index].points =
    Math.max(0, points);


  savePlayers();

  renderAdmin();
  renderLeaderboard();

  alert("Score saved successfully.");
}


/* =========================================
   MATCH INFO
   ========================================= */

function loadMatchInfo() {

  try {

    const info =
      JSON.parse(
        localStorage.getItem(MATCH_KEY) ||
        "{}"
      );


    if (get("roomId")) {
      get("roomId").value =
        info.roomId || "";
    }

    if (get("roomPassword")) {
      get("roomPassword").value =
        info.roomPassword || "";
    }

    if (get("announcement")) {
      get("announcement").value =
        info.announcement || "";
    }


  } catch (error) {

    console.log(
      "Match info error:",
      error
    );
  }


  renderMatchInfo();
}


/* =========================================
   SAVE ADMIN / MATCH INFO
   ========================================= */

function saveAdmin() {

  if (!adminLogged) {
    alert("पहले Admin Login करो.");
    return;
  }


  const roomId =
    get("roomId")?.value.trim() || "";

  const roomPassword =
    get("roomPassword")?.value.trim() || "";

  const announcement =
    get("announcement")?.value.trim() || "";


  const match = {
    roomId: roomId,
    roomPassword: roomPassword,
    announcement: announcement
  };


  localStorage.setItem(
    MATCH_KEY,
    JSON.stringify(match)
  );


  renderMatchInfo();

  alert(
    "Match information saved successfully."
  );
}


/* =========================================
   SHOW MATCH INFO ON HOME
   ========================================= */

function renderMatchInfo() {

  let info = {};

  try {

    info =
      JSON.parse(
        localStorage.getItem(MATCH_KEY) ||
        "{}"
      );

  } catch {
    info = {};
  }


  const roomBox =
    get("roomInfo");


  const roomId =
    get("homeRoomId");

  const roomPassword =
    get("homeRoomPassword");


  if (
    roomBox &&
    info.roomId &&
    info.roomPassword
  ) {

    roomBox.hidden = false;

  } else if (roomBox) {

    roomBox.hidden = true;
  }


  if (roomId) {

    roomId.textContent =
      info.roomId || "-";
  }


  if (roomPassword) {

    roomPassword.textContent =
      info.roomPassword || "-";
  }


  const notice =
    get("notice");


  if (notice) {

    notice.textContent =
      info.announcement || "";
  }
}


/* =========================================
   INITIALIZE
   ========================================= */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    loadPlayersLocal();

    setupRegistration();

    loadMatchInfo();

    renderLeaderboard();

    loadPlayersFromGoogle();

  }
);


/* =========================================
   GLOBAL FUNCTIONS
   ========================================= */

window.show = show;

window.login = login;

window.saveAdmin = saveAdmin;

window.approvePlayer =
  approvePlayer;

window.deletePlayer =
  deletePlayer;

window.saveScore =
  saveScore;

window.renderLeaderboard =
  renderLeaderboard;
