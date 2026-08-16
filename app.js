/* =========================================
   SAA TOURNAMENT - APP.JS
   ========================================= */

const CONFIG = {
  entry: 20,
  prize: 500,
  upi: "shivaysharma52@ybl",

  // APNA CURRENT GOOGLE APPS SCRIPT URL YAHAN PASTE KARO
  api: "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE",

  // Admin password
  adminPassword: "123456789"
};

const KEY = "saa_players";
const MATCH_KEY = "saa_match_info";

let data = [];
let adminLogged = false;


/* =========================================
   HELPERS
   ========================================= */

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function getValue(id, fallback = "") {
  const el = document.getElementById(id);
  return el ? el.value.trim() : fallback;
}


function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.value = value ?? "";
  }
}


/* =========================================
   LOCAL STORAGE
   ========================================= */

function save() {
  localStorage.setItem(
    KEY,
    JSON.stringify(data)
  );
}


function loadLocal() {
  try {
    data = JSON.parse(
      localStorage.getItem(KEY) || "[]"
    );

    if (!Array.isArray(data)) {
      data = [];
    }

  } catch (error) {
    console.log("Local data error:", error);
    data = [];
  }
}


/* =========================================
   LOAD PLAYERS FROM GOOGLE SHEET
   ========================================= */

async function loadPlayers() {

  if (
    !CONFIG.api ||
    CONFIG.api === "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE"
  ) {
    loadLocal();
    renderBoard();

    if (adminLogged) {
      renderAdmin();
    }

    return;
  }

  try {

    const res = await fetch(CONFIG.api);

    if (!res.ok) {
      throw new Error("API response error");
    }

    const json = await res.json();

    if (
      json.success &&
      Array.isArray(json.players)
    ) {

      data = json.players.map(x => ({
        name: x.Name || x.name || "",
        uid: x.UID || x.uid || "",
        team: x.Team || x.team || "solo",
        phone: x.Phone || x.phone || "",
        utr: x.UTR || x.utr || "",
        status: x.Status || x.status || "Pending",
        kills: Number(
          x.Kills || x.kills || 0
        ),
        points: Number(
          x.Points || x.points || 0
        )
      }));

      save();

      renderBoard();

      if (adminLogged) {
        renderAdmin();
      }

      return;
    }

    throw new Error("Invalid API data");

  } catch (err) {

    console.log("API error:", err);

    loadLocal();
    renderBoard();

    if (adminLogged) {
      renderAdmin();
    }
  }
}


/* =========================================
   MATCH INFO
   ========================================= */

function loadMatchInfo() {

  try {

    const saved = JSON.parse(
      localStorage.getItem(MATCH_KEY) || "{}"
    );

    setValue(
      "roomId",
      saved.roomId || ""
    );

    setValue(
      "roomPassword",
      saved.roomPassword || ""
    );

    setValue(
      "matchMessage",
      saved.matchMessage ||
      "Room खुल गया है! सभी players समय पर join करें।"
    );

  } catch (error) {
    console.log("Match info error:", error);
  }

  renderMatchInfo();
}


function saveMatchInfo() {

  const roomId = getValue("roomId");
  const roomPassword = getValue("roomPassword");
  const matchMessage = getValue(
    "matchMessage",
    "Room खुल गया है! सभी players समय पर join करें।"
  );

  const match = {
    roomId,
    roomPassword,
    matchMessage
  };

  localStorage.setItem(
    MATCH_KEY,
    JSON.stringify(match)
  );

  renderMatchInfo();

  alert("Match information saved successfully.");
}


function renderMatchInfo() {

  let info;

  try {
    info = JSON.parse(
      localStorage.getItem(MATCH_KEY) || "{}"
    );
  } catch {
    info = {};
  }

  const roomIdEl =
    document.getElementById("showRoomId");

  const roomPassEl =
    document.getElementById("showRoomPassword");

  const messageEl =
    document.getElementById("showMatchMessage");

  if (roomIdEl) {
    roomIdEl.textContent =
      info.roomId || "Room ID अभी नहीं आया";
  }

  if (roomPassEl) {
    roomPassEl.textContent =
      info.roomPassword || "Password अभी नहीं आया";
  }

  if (messageEl) {
    messageEl.textContent =
      info.matchMessage ||
      "Room खुलने का इंतजार करें।";
  }
}


/* =========================================
   PAGE SWITCH
   ========================================= */

function show(id) {

  document
    .querySelectorAll(".page")
    .forEach(page => {
      page.classList.remove("active");
    });

  const page =
    document.getElementById(id);

  if (page) {
    page.classList.add("active");
  }


  if (id === "leaderboard") {
    renderBoard();
  }


  if (id === "admin") {

    if (!adminLogged) {
      return;
    }

    renderAdmin();
  }


  if (id === "home") {
    loadMatchInfo();
  }
}


/* =========================================
   ADMIN LOGIN
   ========================================= */

function adminLogin() {

  const passwordEl =
    document.getElementById("adminPassword");

  if (!passwordEl) {
    alert(
      "adminPassword input नहीं मिला।"
    );
    return;
  }

  const password =
    passwordEl.value.trim();

  if (
    password === CONFIG.adminPassword
  ) {

    adminLogged = true;

    alert("Admin login successful.");

    show("admin");
    renderAdmin();

  } else {

    alert("Wrong admin password.");

    passwordEl.value = "";
  }
}


function adminLogout() {

  adminLogged = false;

  alert("Admin logout.");

  show("home");
}


/* =========================================
   REGISTRATION
   ========================================= */

function setupRegistration() {

  const form =
    document.getElementById("regForm");

  if (!form) {
    return;
  }

  form.onsubmit = async function(e) {

    e.preventDefault();


    const nameValue =
      getValue("name");

    const uidValue =
      getValue("uid");

    const phoneValue =
      getValue("phone");

    const utrValue =
      getValue("utr");

    const teamValue =
      getValue("team", "solo");


    if (!nameValue) {
      alert("Name डालें।");
      return;
    }


    if (!uidValue) {
      alert("UID डालें।");
      return;
    }


    if (!utrValue) {
      alert("UTR डालें।");
      return;
    }


    const exists =
      data.some(
        x =>
          String(x.uid) ===
          String(uidValue)
      );


    if (exists) {

      alert(
        "यह UID पहले से registered है।"
      );

      return;
    }


    const player = {

      name: nameValue,

      uid: uidValue,

      team:
        teamValue || "solo",

      phone:
        phoneValue,

      utr:
        utrValue,

      status:
        "Pending",

      kills: 0,

      points: 0
    };


    data.push(player);

    save();

    renderBoard();


    try {

      if (
        CONFIG.api &&
        CONFIG.api !==
        "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE"
      ) {

        await fetch(CONFIG.api, {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            action: "register",
            player: player
          })
        });
      }

    } catch (error) {

      console.log(
        "Registration API error:",
        error
      );
    }


    alert(
      "Registration successful. Admin approval का इंतजार करें।"
    );


    form.reset();
  };
}


/* =========================================
   ADMIN PANEL
   ========================================= */

function renderAdmin() {

  if (!adminLogged) {
    return;
  }


  const playersElement =
    document.getElementById("players");

  const scoresElement =
    document.getElementById("scores");


  if (
    !playersElement ||
    !scoresElement
  ) {
    return;
  }


  /* PLAYERS */

  if (data.length === 0) {

    playersElement.innerHTML =
      '<p class="muted">No players.</p>';

  } else {

    playersElement.innerHTML =
      data.map((x, i) => {

        return `

          <div class="panel">

            <b>${esc(x.name)}</b><br><br>

            UID:
            ${esc(x.uid)}<br>

            Team:
            ${esc(x.team || "solo")}<br>

            Phone:
            ${esc(x.phone || "-")}<br>

            UTR:
            ${esc(x.utr || "-")}<br>

            Status:
            <b>${esc(
              x.status || "Pending"
            )}</b>

            <br><br>


            <button
              onclick="approve(${i})">
              Approve
            </button>


            <button
              onclick="del(${i})">
              Delete
            </button>

          </div>
        `;

      }).join("");
  }


  /* SCORES */

  if (data.length === 0) {

    scoresElement.innerHTML =
      '<p class="muted">No players.</p>';

  } else {

    scoresElement.innerHTML =
      data.map((x, i) => {

        return `

          <div class="panel">

            <b>${esc(x.name)}</b>

            <br><br>


            <input
              id="k${i}"
              type="number"
              min="0"
              value="${Number(
                x.kills || 0
              )}"
              placeholder="Kills"
            >


            <input
              id="p${i}"
              type="number"
              min="0"
              value="${Number(
                x.points || 0
              )}"
              placeholder="Points"
            >


            <button
              onclick="saveScore(${i})">
              Save Score
            </button>

          </div>

        `;

      }).join("");
  }
}


/* =========================================
   APPROVE PLAYER
   ========================================= */

async function approve(index) {

  if (!adminLogged) {
    alert("Admin login required.");
    return;
  }


  if (!data[index]) {
    return;
  }


  data[index].status =
    "Approved";


  save();

  renderAdmin();

  renderBoard();


  try {

    if (
      CONFIG.api &&
      CONFIG.api !==
      "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE"
    ) {

      await fetch(CONFIG.api, {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          action: "approve",

          uid: data[index].uid

        })
      });
    }

  } catch (error) {

    console.log(
      "Approve API error:",
      error
    );
  }


  alert(
    "Player approved successfully."
  );
}


/* =========================================
   DELETE PLAYER
   ========================================= */

async function del(index) {

  if (!adminLogged) {
    alert("Admin login required.");
    return;
  }


  if (!data[index]) {
    return;
  }


  const player =
    data[index];


  const confirmDelete =
    confirm(
      `क्या ${player.name || player.uid} को delete करना है?`
    );


  if (!confirmDelete) {
    return;
  }


  data.splice(index, 1);

  save();

  renderAdmin();

  renderBoard();


  try {

    if (
      CONFIG.api &&
      CONFIG.api !==
      "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE"
    ) {

      await fetch(CONFIG.api, {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          action: "delete",

          uid: player.uid

        })
      });
    }

  } catch (error) {

    console.log(
      "Delete API error:",
      error
    );
  }


  alert(
    "Player deleted successfully."
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


  if (!data[index]) {
    return;
  }


  const killsInput =
    document.getElementById(
      `k${index}`
    );

  const pointsInput =
    document.getElementById(
      `p${index}`
    );


  if (
    !killsInput ||
    !pointsInput
  ) {
    return;
  }


  const kills =
    Number(killsInput.value) || 0;

  const points =
    Number(pointsInput.value) || 0;


  data[index].kills =
    Math.max(0, kills);

  data[index].points =
    Math.max(0, points);


  save();

  renderAdmin();

  renderBoard();


  alert(
    "Score saved successfully."
  );
}


/* =========================================
   LEADERBOARD
   ========================================= */

function renderBoard() {

  const board =
    document.getElementById(
      "leaderboardList"
    );

  if (!board) {
    return;
  }


  const approved =
    data
      .filter(
        x =>
          String(
            x.status
          ).toLowerCase() ===
          "approved"
      )
      .sort(
        (a, b) =>
          Number(b.points || 0) -
          Number(a.points || 0)
      );


  if (approved.length === 0) {

    board.innerHTML =
      '<p class="muted">No approved players yet.</p>';

    return;
  }


  board.innerHTML =
    approved.map((x, i) => {

      return `

        <div class="panel">

          <h3>
            #${i + 1}
            ${esc(x.name)}
          </h3>

          UID:
          ${esc(x.uid)}

          <br>

          Team:
          ${esc(x.team || "solo")}

          <br>

          Kills:
          <b>${Number(
            x.kills || 0
          )}</b>

          <br>

          Points:
          <b>${Number(
            x.points || 0
          )}</b>

        </div>

      `;

    }).join("");
}


/* =========================================
   AUTO LOAD
   ========================================= */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    loadLocal();

    setupRegistration();

    loadMatchInfo();

    renderBoard();


    /* Admin login button */

    const loginButton =
      document.getElementById(
        "adminLoginBtn"
      );

    if (loginButton) {

      loginButton.onclick =
        adminLogin;
    }


    /* Save match button */

    const saveMatchButton =
      document.getElementById(
        "saveMatchBtn"
      );

    if (saveMatchButton) {

      saveMatchButton.onclick =
        saveMatchInfo;
    }


    /* Logout button */

    const logoutButton =
      document.getElementById(
        "adminLogoutBtn"
      );

    if (logoutButton) {

      logoutButton.onclick =
        adminLogout;
    }


    /*
      Google Sheet se fresh data
    */

    loadPlayers();

  }
);


/* =========================================
   GLOBAL FUNCTIONS
   ========================================= */

window.show =
  show;

window.adminLogin =
  adminLogin;

window.adminLogout =
  adminLogout;

window.approve =
  approve;

window.del =
  del;

window.saveScore =
  saveScore;

window.saveMatchInfo =
  saveMatchInfo;

window.renderBoard =
  renderBoard;

window.renderAdmin =
  renderAdmin;
