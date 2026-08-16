/* =========================================
   SAA TOURNAMENT - CORRECTED APP.JS
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

function get(id) {
  return document.getElementById(id);
}


function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
    const data = JSON.parse(
      localStorage.getItem(PLAYERS_KEY) || "[]"
    );

    players = Array.isArray(data) ? data : [];

  } catch (error) {
    players = [];
  }
}


/* =========================================
   GOOGLE SHEET - LOAD PLAYERS
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

      players = result.players.map(function(x) {

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
  }
}


/* =========================================
   PAGE NAVIGATION
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

    const name =
      get("name")?.value.trim() || "";

    const uid =
      get("uid")?.value.trim() || "";

    const phone =
      get("phone")?.value.trim() || "";

    const utr =
      get("utr")?.value.trim() || "";


    /* VALIDATION */

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


    /* 48 SLOT LIMIT */

    if (players.length >= 48) {
      alert("Tournament के सभी 48 slots भर चुके हैं.");
      return;
    }


    /* DUPLICATE UID */

    const alreadyExists = players.some(function(player) {

      return String(player.uid).trim() ===
             String(uid).trim();

    });


    if (alreadyExists) {
      alert("यह UID पहले से registered है.");
      return;
    }


    /* PLAYER OBJECT */

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


    /* BUTTON */

    const submitButton =
      form.querySelector("button[type='submit']");

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }


    try {

      /*
       * IMPORTANT:
       * Apps Script doPost() expects:
       * name, uid, phone, team, utr
       *
       * Not player:{...}
       */

      const response = await fetch(
        CONFIG.api,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body: JSON.stringify({
            action: "register",
            name: player.name,
            uid: player.uid,
            phone: player.phone,
            team: player.team,
            utr: player.utr
          })
        }
      );


      const result =
        await response.json();


      /* GOOGLE API ERROR */

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


      /* LOCAL SAVE */

      players.push(player);

      savePlayers();

      renderLeaderboard();


      const message =
        get("regMsg");

      if (message) {

        message.textContent =
          "Registration successful! Admin approval का इंतजार करें.";

      }


      alert(
        "Registration successful!"
      );


      form.reset();


    } catch (error) {

      console.log(
        "Registration error:",
        error
      );

      alert(
        "Registration failed. Internet और Google API check करें."
      );

    } finally {

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent =
          "Submit Registration";
      }

    }

  });
}


/* =========================================
   LEADERBOARD
   ========================================= */

function renderLeaderboard() {

  /*
   * HTML में ID:
   * leaderboardList
   */

  const board =
    get("leaderboardList");

  if (!board) {
    return;
  }


  const approved =
    players
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
      "<p>No approved players yet.</p>";

    return;
  }


  board.innerHTML =
    approved.map(function(player, index) {

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

    }).join("");
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

    alert(
      "Admin Login Successful!"
    );

    passwordInput.value = "";

    renderAdmin();

  } else {

    alert(
      "Wrong Admin Password."
    );

    passwordInput.value = "";
  }
}


/* =========================================
   ADMIN PANEL
   ========================================= */

function renderAdmin() {

  const loginArea =
    get("adminLoginArea");

  const area =
    get("adminArea");


  if (!area) {
    return;
  }


  if (!adminLogged) {

    area.hidden = true;

    if (loginArea) {
      loginArea.hidden = false;
    }

    return;
  }


  area.hidden = false;

  if (loginArea) {
    loginArea.hidden = true;
  }


  /* LOAD MATCH */

  loadMatchInfo();


  /* =====================================
     PLAYERS
     ===================================== */

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

              <b>
                ${esc(player.name)}
              </b>

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
                <b>
                  ${esc(player.status)}
                </b>
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


  /* =====================================
     SCORES
     ===================================== */

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

              <b>
                ${esc(player.name)}
              </b>

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


  players[index].status =
    "Approved";


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


  if (
    !confirm(
      name +
      " को delete करना है?"
    )
  ) {
    return;
  }


  players.splice(index, 1);

  savePlayers();

  renderAdmin();

  renderLeaderboard();


  alert(
    "Player deleted."
  );
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
    Number(
      killsInput?.value || 0
    );

  const points =
    Number(
      pointsInput?.value || 0
    );


  players[index].kills =
    Math.max(0, kills);


  players[index].points =
    Math.max(0, points);


  savePlayers();

  renderAdmin();

  renderLeaderboard();


  alert(
    "Score saved successfully."
  );
}


/* =========================================
   MATCH INFO - LOAD
   ========================================= */

function loadMatchInfo() {

  let info = {};

  try {

    info =
      JSON.parse(
        localStorage.getItem(
          MATCH_KEY
        ) || "{}"
      );

  } catch (error) {

    info = {};
  }


  if (get("roomId")) {

    get("roomId").value =
      info.roomId || "";

  }


  if (get("roomPassword")) {

    get("roomPassword").value =
      info.roomPassword || "";

  }


  /*
   * HTML में ID:
   * matchMessage
   */

  if (get("matchMessage")) {

    get("matchMessage").value =
      info.announcement ||
      "Room खुल गया है! सभी players समय पर join करें.";

  }


  renderMatchInfo();
}


/* =========================================
   SAVE MATCH INFO
   ========================================= */

function saveAdmin() {

  if (!adminLogged) {

    alert(
      "पहले Admin Login करो."
    );

    return;
  }


  const roomId =
    get("roomId")?.value.trim() || "";


  const roomPassword =
    get("roomPassword")?.value.trim() || "";


  /*
   * HTML में सही ID:
   * matchMessage
   */

  const announcement =
    get("matchMessage")
      ?.value.trim() || "";


  const match = {

    roomId: roomId,

    roomPassword:
      roomPassword,

    announcement:
      announcement

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
        localStorage.getItem(
          MATCH_KEY
        ) || "{}"
      );

  } catch (error) {

    info = {};
  }


  /*
   * HTML में:
   * showRoomId
   * showRoomPassword
   */

  const roomId =
    get("showRoomId");


  const roomPassword =
    get("showRoomPassword");


  if (roomId) {

    roomId.textContent =
      info.roomId ||
      "Room ID अभी नहीं आया";

  }


  if (roomPassword) {

    roomPassword.textContent =
      info.roomPassword ||
      "Password अभी नहीं आया";

  }


  const message =
    get("showMatchMessage");


  if (message) {

    message.textContent =
      info.announcement ||
      "Room खुलने का इंतजार करें.";

  }


  const roomBox =
    get("roomInfo");


  /*
   * Room details हमेशा दिखाई देंगे
   * लेकिन जानकारी नहीं होने पर
   * default message दिखेगा.
   */

  if (roomBox) {

    roomBox.hidden = false;

  }
}


/* =========================================
   LOGOUT
   ========================================= */

function logout() {

  adminLogged = false;

  renderAdmin();

  show("home");

  alert(
    "Admin Logout Successful."
  );
}


/* =========================================
   BUTTON EVENTS
   ========================================= */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    /* Local data */

    loadPlayersLocal();


    /* Registration */

    setupRegistration();


    /* Match */

    loadMatchInfo();


    /* Leaderboard */

    renderLeaderboard();


    /* Admin Login */

    const loginButton =
      get("adminLoginBtn");

    if (loginButton) {

      loginButton.addEventListener(
        "click",
        login
      );

    }


    /* Save Match */

    const saveMatchButton =
      get("saveMatchBtn");

    if (saveMatchButton) {

      saveMatchButton.addEventListener(
        "click",
        saveAdmin
      );

    }


    /* Logout */

    const logoutButton =
      get("adminLogoutBtn");

    if (logoutButton) {

      logoutButton.addEventListener(
        "click",
        logout
      );

    }


    /* Google Sheet */

    loadPlayersFromGoogle();

  }
);


/* =========================================
   GLOBAL FUNCTIONS
   ========================================= */

window.show =
  show;

window.login =
  login;

window.saveAdmin =
  saveAdmin;

window.logout =
  logout;

window.approvePlayer =
  approvePlayer;

window.deletePlayer =
  deletePlayer;

window.saveScore =
  saveScore;

window.renderLeaderboard =
  renderLeaderboard;
