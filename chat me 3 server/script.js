const SUPABASE_URL = 'https://hfnzcltouedgzcsykszq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmbnpjbHRvdWVkZ3pjc3lrc3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDg4MzksImV4cCI6MjA5ODcyNDgzOX0.YzzRX-XIRF40iMpA3GXXUvvUrahtTE7Ru6DCrn4ktFA';

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

var currentUser = '';
var currentUid = '';
var currentSessionId = '';
var onlineUsers = {};
var userAvatars = {};
var isAdmin = false;
var currentPrivateChat = null;
var currentPrivateChatName = null;
var bannedUsersList = [];
var pendingBanUsername = null;
var isPlayerOpen = false;
var isPlayerLoaded = false;
var isAvatarUploading = false;
var connectTime = 0;
var unreadPrivateMessages = {};
var pendingTrackData = null;

var channel = null;
var privateChannel = null;
var banChannel = null;
var presenceChannel = null;

if (!localStorage.getItem('chat_device_unique_id')) {
  var fixedId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  localStorage.setItem('chat_device_unique_id', fixedId);
}
currentSessionId = localStorage.getItem('chat_device_unique_id');

function showLoginError(message) {
  var err = document.getElementById('err');
  var loginBox = document.getElementById('loginBox');
  err.innerHTML = '<span>' + message + '</span>';
  err.style.display = 'flex';
  loginBox.classList.remove('shake');
  void loginBox.offsetWidth;
  loginBox.classList.add('shake');
  setTimeout(function() { loginBox.classList.remove('shake'); }, 500);
}

function togglePlayer() { if (isPlayerOpen) closePlayer(); else openPlayer(); }
function openPlayer() {
  if (!isPlayerLoaded) { document.getElementById('playerIframe').src = 'player/player.htm'; isPlayerLoaded = true; }
  document.getElementById('playerPanel').classList.add('show'); isPlayerOpen = true;
  document.getElementById('radioBtn').classList.add('playing');
}
function closePlayer() {
  document.getElementById('playerPanel').classList.remove('show'); isPlayerOpen = false;
  if (isPlayerLoaded) document.getElementById('radioBtn').classList.remove('playing');
}
function disconnectPlayer() {
  document.getElementById('playerPanel').classList.remove('show'); document.getElementById('playerIframe').src = '';
  isPlayerOpen = false; isPlayerLoaded = false; document.getElementById('radioBtn').classList.remove('playing');
}
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('show'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('show'); }

var notificationSound = new Audio('minima.mp3');
var soundVolume = 1.0;
var soundStates = [{ volume: 1.0, icon: '🔊' }, { volume: 0.3, icon: '🔉' }, { volume: 0, icon: '🔇' }];
var currentSoundState = 0;

function loadSoundSettings() {
  var saved = localStorage.getItem('chat_sound_volume');
  if (saved !== null) { currentSoundState = parseInt(saved); soundVolume = soundStates[currentSoundState].volume; notificationSound.volume = soundVolume; updateSoundButton(); }
}
function updateSoundButton() { document.getElementById('soundBtn').textContent = soundStates[currentSoundState].icon; }
function toggleSound() {
  currentSoundState = (currentSoundState + 1) % soundStates.length; soundVolume = soundStates[currentSoundState].volume;
  notificationSound.volume = soundVolume; localStorage.setItem('chat_sound_volume', currentSoundState); updateSoundButton();
}
function playNotificationSound() { if (soundVolume > 0) { notificationSound.currentTime = 0; notificationSound.play().catch(function(e) {}); } }

var emojiCategories = {
    smileys: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🥳','😏','😒','😞','😔','😟','😕','🙁','😖','😫','😩','🥺','😭','😤','😠','😡','🤬','😳','🥶','😨','😰','😥','😓','🤗','🤔','🤫','😶','😐','😑','😬','🙄','😯','😧','😮','😲','😴','🤤','😵','🤐','🥴','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','💩','💀','☠️','👽','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾','🙈','🙉','🙊'],
    animals: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🐣','🦆','🦅','🦉','🦇','🐺','🦄','🐝','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐈','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦦','🦥','🐁','🐀','🐿️','🦔','🐾','🐉','🐲'],
    food: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🥖','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🌭','🍔','🍟','🍕','🫓','🥙','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🫗','🍼','🫖','☕','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊','🥄','🍴','🍽️','🥣','🥡','🥢','🧂'],
    activities: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🎰','🧩'],
    travel: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛺','🚨','🚔','🚍','🚖','🚘','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚇','🚆','🚉','✈️','🛫','🛬','🛩️','💺','🛰️','🚀','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','🪝','⛽','🚧','🚦','🚥','🗺️','🗿','🗽','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛱️','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️','⛺','🛖','🏠','🏡','🏘️','🏚️','🏗️','🏭','🏢','🏬','🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏩','💒','🏛️','⛪','🕌','🕍','🛕','🕋','⛩️','🛤️','🛣️','🗾','🎑','🏞️','🌅','🌄','🌠','🎇','🎆','🌇','🌆','🏙️','🌃','🌌','🌉','🌁'],
    objects: ['⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗜️','💽','💾','💿','📀','📼','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','🪔','🧯','🛢️','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️','🪤','🧱','⛓️','🧲','🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','💈','⚗️','🔭','🔬','🕳️','🩹','🩺','💊','💉','🩸','🧬','🦠','🧫','🧪','🌡️','🧹','🪠','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🧼','🪥','🪒','🧽','🪣','🧴','🛎️','🔑','🗝️','🚪','🪑','🛋️','🛏️','🛌','🧸','🪆','🖼️','🪞','🪟','🛍️','🛒','🎁','🎈','🎏','🎀','🪄','🪅','🎊','🎉','🎎','🏮','🎐','🧧','✉️','📩','📨','📧','💌','📥','📤','📦','🏷️','🪧','📪','📫','📬','📭','📮','📯','📜','📃','📄','📑','🧾','📊','📈','📉','🗒️','🗓️','📆','📅','🗑️','📇','🗃️','🗳️','🗄️','📋','📁','📂','🗂️','🗞️','📰','📓','📔','📒','📕','📗','📘','📙','📚','📖','🔖','🧷','🔗','📎','🖇️','📐','📏','🧮','📌','📍','✂️','🖊️','🖋️','✒️','🖌️','🖍️','📝','✏️','🔍','🔎','🔏','🔐','🔒','🔓'],
    symbols: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','〽️','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','🈯','💹','❇️','✳️','❎','🌐','💠','Ⓜ️','🌀','💤','🏧','🚾','♿','🅿️','🛗','🈳','🈂️','🛂','🛃','🛄','🛅','🚹','🚺','🚼','⚧️','🚻','🚮','🎦','📶','🈁','🔣','ℹ️','🔤','🔡','🔠','🆖','🆗','🆙','🆒','🆕','🆓','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔢','#️⃣','*️⃣','⏏️','▶️','⏸️','⏯️','⏹️','⏺️','⏭️','⏮️','⏩','⏪','⏫','⏬','◀️','🔼','🔽','➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','↕️','↔️','↪️','↩️','⤴️','⤵️','🔀','🔁','🔂','🔄','🔃','🎵','🎶','➕','➖','➗','✖️','♾️','💲','💱','™️','©️','®️','👁️‍🗨️','🔚','🔙','🔛','🔝','🔜','〰️','➰','➿','✔️','☑️','🔘','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔸','🔹','🔶','🔷','🔳','🔲','▪️','▫️','◾','◽','◼️','◻️','🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜','🟫','🔈','🔇','🔉','🔊','🔔','🔕','📣','📢','👁️‍🗨️','💬','💭','🗯️','♠️','♣️','♥️','♦️','🃏','🎴','🀄','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚','🕛']
};

Object.keys(emojiCategories).forEach(function(category) {
  var container = document.getElementById(category);
  if (!container) return;
  emojiCategories[category].forEach(function(emoji) {
    var span = document.createElement('span'); span.className = 'emoji'; span.textContent = emoji;
    span.onclick = function() { document.getElementById('msgInput').value += emoji; document.getElementById('msgInput').focus(); };
    container.appendChild(span);
  });
});
document.querySelectorAll('.emoji-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.emoji-tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.emoji-category').forEach(function(c) { c.classList.remove('active'); });
    this.classList.add('active'); document.getElementById(this.dataset.category).classList.add('active');
  });
});

function toggleBgControls() {
  document.getElementById('bgControlsPanel').classList.toggle('show');
  document.getElementById('bannedPanel').classList.remove('show');
  document.getElementById('emojiPanel').classList.remove('show');
}
function updateBackground() {
  var posX = document.getElementById('bgPositionX').value; var brightness = document.getElementById('bgBrightness').value;
  var blur = document.getElementById('bgBlur').value; var overlay = document.getElementById('bgOverlay').value;
  document.getElementById('bgContainer').style.backgroundPosition = posX + '% center';
  document.getElementById('bgContainer').style.filter = 'brightness(' + brightness + '%) blur(' + blur + 'px)';
  document.querySelector('.bg-overlay').style.background = 'rgba(15, 15, 30, ' + (overlay / 100) + ')';
  document.getElementById('posValue').textContent = posX + '%'; document.getElementById('brightValue').textContent = brightness + '%';
  document.getElementById('blurValue').textContent = blur + 'px'; document.getElementById('overlayValue').textContent = overlay + '%';
  localStorage.setItem('bg_settings', JSON.stringify({ posX: posX, brightness: brightness, blur: blur, overlay: overlay }));
}
function loadBgSettings() {
  var saved = localStorage.getItem('bg_settings');
  if (saved) {
    var s = JSON.parse(saved); document.getElementById('bgPositionX').value = s.posX || 50;
    document.getElementById('bgBrightness').value = s.brightness || 100; document.getElementById('bgBlur').value = s.blur || 0;
    document.getElementById('bgOverlay').value = s.overlay || 70; updateBackground();
  }
}

async function uploadToImgur(file) {
  var formData = new FormData(); formData.append("image", file);
  var response = await fetch("https://api.imgur.com/3/image", { method: "POST", headers: { Authorization: "Client-ID 546c25a59c58ad7" }, body: formData });
  var result = await response.json();
  if (result.success) { return { link: result.data.link, deletehash: result.data.deletehash }; }
  else { throw new Error("Αποτυχία ανεβάσματος"); }
}

async function checkIfBanned(username) {
  try {
    var result = await client.from('banned_users').select('username').eq('username', username.toLowerCase()).maybeSingle();
    return !!result.data;
  } catch(e) { return false; }
}

async function banUser(username) {
  pendingBanUsername = username;
  document.getElementById('banTypeText').textContent = 'Θέλεις να μπανάρεις τον "' + username + '";';
  document.getElementById('banTypeOverlay').classList.add('show');
}
async function confirmBan() {
  if (!pendingBanUsername) return; document.getElementById('banTypeOverlay').classList.remove('show');
  var username = pendingBanUsername; pendingBanUsername = null;
  var res = await client.from('banned_users').insert([{ username: username.toLowerCase(), banned_by: currentUser }]);
  if (res.error) { alert('Σφάλμα: ' + res.error.message); return; }
  alert('🚫 Banned!'); loadBannedUsers();
}
function cancelBan() { pendingBanUsername = null; document.getElementById('banTypeOverlay').classList.remove('show'); }
async function unbanUser(username) {
  if (!confirm('Αφαίρεση ban;')) return;
  try {
    var res = await client.from('banned_users').delete().eq('username', username.toLowerCase());
    if (res.error) { alert('Σφάλμα: ' + res.error.message); return; }
    alert('✅ Αφαιρέθηκε!'); loadBannedUsers(); renderBannedUsersPanel();
  } catch(e) { alert('Σφάλμα: ' + e.message); }
}
async function loadBannedUsers() {
  try {
    var result = await client.from('banned_users').select('*');
    if (result.error) { alert('Σφάλμα λίστας ban: ' + result.error.message); bannedUsersList = []; return; }
    bannedUsersList = result.data || [];
    bannedUsersList.sort(function(a, b) { return String(b.banned_at || '').localeCompare(String(a.banned_at || '')); });
  } catch(e) { bannedUsersList = []; }
}
function renderBannedUsersPanel() {
  var list = document.getElementById('bannedUsersList'); list.innerHTML = '';
  if (bannedUsersList.length === 0) { list.innerHTML = '<div class="no-banned">Δεν υπάρχουν banned 🎉</div>'; return; }
  bannedUsersList.forEach(function(ban) {
    var div = document.createElement('div'); div.className = 'banned-user-item';
    var time = new Date(ban.banned_at).toLocaleString('el');
    div.innerHTML = '<div class="banned-user-info"><div class="banned-user-name">' + escapeHtml(ban.username) + '</div><div class="banned-user-time">' + time + '</div></div><button class="unban-btn" onclick="unbanUser(\'' + escapeHtml(ban.username).replace(/'/g, "\\'") + '\')">Unban</button>';
    list.appendChild(div);
  });
}
function toggleBannedPanel() {
  var panel = document.getElementById('bannedPanel'); panel.classList.toggle('show');
  document.getElementById('bgControlsPanel').classList.remove('show'); document.getElementById('emojiPanel').classList.remove('show');
  if (panel.classList.contains('show')) { loadBannedUsers().then(function() { renderBannedUsersPanel(); }); }
}
function handleBannedWhileOnline() {
  document.getElementById('banNotifOverlay').classList.add('show');
  setTimeout(async function() {
    try {
      await client.from('active_sessions').delete().eq('username', currentUser.toLowerCase());
      if (presenceChannel) { try { await presenceChannel.untrack(); } catch(e) {} }
      if (channel) { try { await channel.unsubscribe(); } catch(e) {} }
      if (privateChannel) { try { await privateChannel.unsubscribe(); } catch(e) {} }
      if (banChannel) { try { await banChannel.unsubscribe(); } catch(e) {} }
      localStorage.removeItem('chat_uid'); localStorage.removeItem('chat_username'); localStorage.removeItem('chat_password');
      currentUser = ''; currentUid = ''; isAdmin = false;
      document.getElementById('chatApp').style.display = 'none';
      document.getElementById('banNotifOverlay').classList.remove('show');
      document.getElementById('loginDiv').style.display = 'flex';
    } catch(e) {}
  }, 3000);
}
function subscribeToBans() {
  banChannel = client.channel('banned-users-channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'banned_users' }, function(payload) {
      if (payload.new.username.toLowerCase() === currentUser.toLowerCase()) { handleBannedWhileOnline(); }
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'banned_users' }, async function() {
      if (isAdmin && document.getElementById('bannedPanel').classList.contains('show')) {
        await loadBannedUsers(); renderBannedUsersPanel();
      }
    })
    .subscribe();
}

async function handleAvatarUpload(event) {
  var file = event.target.files[0]; if (!file) return;
  if (isAvatarUploading) { alert('⏳ Περιμένετε!'); event.target.value = ''; return; }
  if (file.size > 2 * 1024 * 1024) { alert('Max 2MB!'); event.target.value = ''; return; }
  isAvatarUploading = true;
  var reader = new FileReader();
  reader.onload = async function(e) {
    var base64 = e.target.result;
    try {
      await client.from('user_avatars').upsert([{ username: currentUser.toLowerCase(), avatar_url: base64 }]);
      userAvatars[currentUid] = base64;
      localStorage.setItem('user_avatar_' + currentUid, base64);
      pendingTrackData = { uid: currentUid, username: currentUser, avatar: base64 };
      if (presenceChannel) { try { await presenceChannel.track(pendingTrackData); } catch(e) {} }
      updateUserList(); alert('✅ Η φωτογραφία σου ενημερώθηκε!');
    } catch(err) { alert('Σφάλμα: ' + err.message); }
    finally { isAvatarUploading = false; event.target.value = ''; }
  };
  reader.readAsDataURL(file);
}

window.addEventListener('load', async function() {
  loadBgSettings(); loadSoundSettings();
  setupPresenceInitial();
  var savedUser = localStorage.getItem('chat_username'); var savedPass = localStorage.getItem('chat_password');
  if (savedUser && savedPass) { document.getElementById('userIn').value = savedUser; document.getElementById('passIn').value = savedPass; setTimeout(function() { goChat(true); }, 300); }
});

function escapeHtml(text) { var div = document.createElement('div'); div.textContent = text; return div.innerHTML.replace(/'/g, '&#39;').replace(/"/g, '&quot;'); }
function linkify(text) {
  var urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  return text.replace(urlRegex, function(url) {
    var fullUrl = url.startsWith('http') ? url : 'https://' + url;
    return '<a href="' + fullUrl + '" target="_blank" style="color:#60a5fa;text-decoration:underline;word-break:break-all;">' + url + '</a>';
  });
}
function getAvatarHtml(username, uid) {
  var avatarUrl = userAvatars[uid] || localStorage.getItem('user_avatar_' + uid);
  var isAdminUser = username.toLowerCase() === 'sakis';
  var avatarClass = isAdminUser ? 'msg-avatar admin-avatar' : 'msg-avatar';
  if (avatarUrl) { return '<div class="' + avatarClass + '"><img src="' + avatarUrl + '" alt=""></div>'; }
  return '<div class="' + avatarClass + '">' + username.charAt(0).toUpperCase() + '</div>';
}

async function loadMessages() {
  var container = document.getElementById('msgContainer'); container.innerHTML = '';
  try {
    var result = await client.from('messages').select('*').order('timestamp', { ascending: true }).limit(100);
    if (result.data) {
      result.data.forEach(function(msg) { addMessageToUI(msg, false); });
      setTimeout(function() { container.scrollTop = container.scrollHeight; }, 100);
    }
  } catch(e) { console.error('loadMessages error:', e); }
}

async function loadPrivateMessages(otherUid, otherName) {
  var container = document.getElementById('msgContainer'); container.innerHTML = '';
  try {
    var result = await client.from('private_messages')
      .select('*')
      .or('sender.eq.' + currentUid + ',receiver.eq.' + currentUid)
      .order('timestamp', { ascending: true })
      .limit(200);
    if (result.data) {
      var filtered = result.data.filter(function(msg) {
        return (msg.sender === currentUid && msg.receiver === otherUid) ||
               (msg.sender === otherUid && msg.receiver === currentUid);
      });
      filtered.forEach(function(msg) { addMessageToUI(msg, true); });
      container.scrollTop = container.scrollHeight;
      var unreadIds = filtered.filter(function(m) { return m.receiver === currentUid && !m.is_read; }).map(function(m) { return m.id; });
      if (unreadIds.length > 0) {
        await client.from('private_messages').update({ is_read: true }).in('id', unreadIds);
      }
    }
  } catch(e) { console.error('loadPrivateMessages error:', e); }
}

function addMessageToUI(msg, isPrivate) {
  var container = document.getElementById('msgContainer');
  var msgId = msg.id;
  if (msgId) { var existingMsg = container.querySelector('.msg[data-msg-id="' + msgId + '"]'); if (existingMsg) return; }
  var div = document.createElement('div');
  var senderName = msg.username || msg.sender_name || 'Άγνωστος';
  var senderUid = msg.sender || msg.user_id || 'unknown';
  var text = msg.text || msg.message || '';
  var img = msg.image || null;
  var deletehash = msg.image_deletehash || null;
  var isOwn = (senderUid === currentUid);
  div.className = 'msg' + (isOwn ? ' own' : '') + (isPrivate ? ' private' : '');
  if (msgId) { div.setAttribute('data-msg-id', msgId); }
  var avatarHtml = getAvatarHtml(senderName, senderUid);
  var time = new Date(msg.timestamp || Date.now()).toLocaleTimeString('el', { hour: '2-digit', minute: '2-digit' });
  var deleteButtonHtml = '';
  if (img && isAdmin && deletehash && msgId) {
    deleteButtonHtml = '<button class="delete-image-btn" data-msg-id="' + msgId + '" data-deletehash="' + deletehash + '" data-private="' + isPrivate + '">🗑️ Διαγραφή</button>';
  }
  var contentHtml = '';
  if (img) {
    contentHtml = '<div class="text"><img src="' + img + '" style="max-width:150px;border-radius:12px;display:block;margin:6px 0;cursor:pointer;" onclick="openImagePreview(this.src)">' + deleteButtonHtml + '</div>';
  } else if (msg.audio_url) {
    contentHtml = '<div class="text"><div class="msg-audio-wrapper"><audio controls src="' + msg.audio_url + '" preload="none"></audio></div></div>';
  } else {
    contentHtml = '<div class="text">' + linkify(escapeHtml(text)) + '</div>';
  }
  div.innerHTML = avatarHtml + '<div class="msg-content"><div class="user">' + escapeHtml(senderName) + '</div>' + contentHtml + '<div class="time">' + time + '</div></div>';
  container.appendChild(div);
  requestAnimationFrame(function() { container.scrollTop = container.scrollHeight; });
}

async function deleteImage(msgId, deletehash, buttonElement, isPrivate) {
  buttonElement.disabled = true; buttonElement.textContent = '⏳ Διαγραφή...';
  try {
    if (deletehash) {
      try { await fetch('https://api.imgur.com/3/image/' + deletehash, { method: 'DELETE', headers: { 'Authorization': 'Client-ID 546c25a59c58ad7' } }); } catch(e) {}
    }
  } catch(e) {}
  try {
    var tableName = isPrivate ? 'private_messages' : 'messages';
    var res = await client.from(tableName).delete().eq('id', msgId);
    if (res.error) { alert('Σφάλμα: ' + res.error.message); }
  } catch(e) { alert('Σφάλμα: ' + e.message); }
  var msgDiv = document.querySelector('.msg[data-msg-id="' + msgId + '"]');
  if (msgDiv) msgDiv.remove();
  buttonElement.disabled = false; buttonElement.textContent = '🗑️ Διαγραφή';
}

async function sendMsg() {
  var input = document.getElementById('msgInput'); var text = input.value.trim(); if (!text) return;
  try {
    if (currentPrivateChat) {
      await client.from('private_messages').insert([{ sender: currentUid, sender_name: currentUser, receiver: currentPrivateChat, message: text }]);
    } else {
      await client.from('messages').insert([{ user_id: currentUid, username: currentUser, text: text }]);
    }
    input.value = '';
  } catch(e) { alert('Σφάλμα: ' + e.message); }
}

function toggleEmoji() {
  document.getElementById('emojiPanel').classList.toggle('show');
  document.getElementById('bannedPanel').classList.remove('show');
  document.getElementById('bgControlsPanel').classList.remove('show');
}

function showToast(senderName, senderUid) {
  var container = document.getElementById('toastContainer');
  if (!container) return;
  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = '<div class="toast-icon">💬</div><div class="toast-content"><div class="toast-title">Νέο Ιδιωτικό Μήνυμα</div><div class="toast-message">Από: ' + escapeHtml(senderName) + '</div></div>';
  toast.onclick = function() {
    startPrivateChat(senderUid, senderName);
    if (toast.parentNode === container) { container.removeChild(toast); }
  };
  container.appendChild(toast);
  setTimeout(function() { if (toast.parentNode === container) { container.removeChild(toast); } }, 10000);
}

function updateUserList() {
  var list = document.getElementById('userList'); list.innerHTML = '';
  var usersArray = Object.keys(onlineUsers).map(function(uid) { return Object.assign({ uid: uid }, onlineUsers[uid]); });
  usersArray.sort(function(a, b) { return a.username.localeCompare(b.username); });
  usersArray.forEach(function(u) {
    var username = u.username;
    var uid = u.uid;
    var div = document.createElement('div'); div.className = 'user-item';
    var initial = username.charAt(0).toUpperCase();
    var isAdminUser = username.toLowerCase() === 'sakis';
    var avatarClass = isAdminUser ? 'avatar admin-avatar' : 'avatar';
    var adminBadge = isAdminUser ? '<span class="admin-badge">👑 ADMIN</span>' : '';
    var unreadBadge = unreadPrivateMessages[uid] ? '<span class="unread-badge">' + unreadPrivateMessages[uid] + '</span>' : '';
    var avatarHtml = userAvatars[uid]
      ? '<div class="' + avatarClass + '" onclick="triggerAvatarUpload(\'' + uid + '\')" data-uid="' + uid + '"><img src="' + userAvatars[uid] + '">' + (uid === currentUid ? '<div class="avatar-upload-hint">📷</div>' : '') + '</div>'
      : '<div class="' + avatarClass + '" onclick="triggerAvatarUpload(\'' + uid + '\')" data-uid="' + uid + '">' + initial + (uid === currentUid ? '<div class="avatar-upload-hint">📷</div>' : '') + '</div>';
    var lockBtn = ''; var banBtn = '';
    if (uid !== currentUid) {
      lockBtn = '<button class="private-lock-btn" onclick="startPrivateChat(\'' + uid + '\',\'' + escapeHtml(username).replace(/'/g, "\\'") + '\')" title="Ιδιωτικό">🔒</button>';
      if (isAdmin) { banBtn = '<button class="ban-user-btn show" onclick="banUser(\'' + escapeHtml(username).replace(/'/g, "\\'") + '\')" title="Ban">🚫</button>'; }
    }
    div.innerHTML = avatarHtml + '<div class="user-info"><div class="user-name">' + escapeHtml(username) + adminBadge + unreadBadge + '</div><div class="user-status">Online</div></div>' + lockBtn + banBtn;
    list.appendChild(div);
  });
  document.getElementById('onlineNum').textContent = usersArray.length;
  document.getElementById('userNum').textContent = usersArray.length;
}

function triggerAvatarUpload(uid) { if (isAvatarUploading) { alert('⏳ Περιμένετε!'); return; } if (uid === currentUid) document.getElementById('avatarInput').click(); }
function triggerImageUpload() { document.getElementById('imageUploadInput').click(); }

async function startPrivateChat(uid, username) {
  if (uid === currentUid) return;
  if (!onlineUsers[uid]) { alert('Ο χρήστης δεν είναι online!'); return; }
  currentPrivateChat = uid;
  currentPrivateChatName = username;
  if (unreadPrivateMessages[uid]) { delete unreadPrivateMessages[uid]; updateUserList(); }
  document.getElementById('chatMain').classList.add('private-mode');
  document.getElementById('privateHeader').classList.add('show'); document.getElementById('mainHeader').style.display = 'none';
  document.getElementById('privateWithUser').textContent = username; document.getElementById('msgInput').placeholder = 'Γράψε ιδιωτικό...';
  document.getElementById('emojiPanel').classList.remove('show');
  if (window.innerWidth <= 768) closeSidebar();
  loadPrivateMessages(uid, username);
}
function closePrivateChat() {
  currentPrivateChat = null; currentPrivateChatName = null;
  document.getElementById('chatMain').classList.remove('private-mode');
  document.getElementById('privateHeader').classList.remove('show'); document.getElementById('mainHeader').style.display = 'flex';
  document.getElementById('msgInput').placeholder = 'Γράψε ένα μήνυμα...'; loadMessages();
}

async function handleImageUpload(event) {
  var file = event.target.files[0]; if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) { alert('Μόνο JPG, PNG, GIF!'); event.target.value = ''; return; }
  if (file.size > 20 * 1024 * 1024) { alert('Max 20MB!'); event.target.value = ''; return; }
  var imageBtn = document.getElementById('imageBtn'); var originalHTML = imageBtn.innerHTML;
  imageBtn.innerHTML = '<div class="spinner"></div>'; imageBtn.classList.add('loading');
  try {
    var uploadResult = await uploadToImgur(file); var imageUrl = uploadResult.link; var deletehash = uploadResult.deletehash;
    if (currentPrivateChat) {
      await client.from('private_messages').insert([{ sender: currentUid, sender_name: currentUser, receiver: currentPrivateChat, message: '[📸 Εικόνα]', image: imageUrl, image_deletehash: deletehash }]);
    } else {
      await client.from('messages').insert([{ user_id: currentUid, username: currentUser, text: '[📸 Εικόνα]', image: imageUrl, image_deletehash: deletehash }]);
    }
  } catch(e) { alert('Σφάλμα: ' + e.message); }
  finally { imageBtn.innerHTML = originalHTML; imageBtn.classList.remove('loading'); event.target.value = ''; }
}

function subscribeToMessages() {
  channel = client.channel('radiochat-messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, function(payload) {
      var msg = payload.new;
      if (msg.timestamp && msg.timestamp < connectTime) return;
      if (!currentPrivateChat) { addMessageToUI(msg, false); if (msg.user_id !== currentUid) { playNotificationSound(); } }
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, function(payload) {
      if (!currentPrivateChat && payload.old && payload.old.id) {
        var msgDiv = document.querySelector('.msg[data-msg-id="' + payload.old.id + '"]');
        if (msgDiv) msgDiv.remove();
      }
    })
    .subscribe();

  privateChannel = client.channel('radiochat-private')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, function(payload) {
      var msg = payload.new;
      if (msg.timestamp && msg.timestamp < connectTime) return;
      var isForMe = msg.receiver === currentUid;
      var isFromMe = msg.sender === currentUid;
      if (isForMe && !(currentPrivateChat && currentPrivateChat === msg.sender)) {
        if (!unreadPrivateMessages[msg.sender]) unreadPrivateMessages[msg.sender] = 0;
        unreadPrivateMessages[msg.sender]++;
        showToast(msg.sender_name, msg.sender);
        playNotificationSound();
        updateUserList();
      }
      if (currentPrivateChat && (isForMe || isFromMe)) {
        addMessageToUI(msg, true);
        if (isForMe) { client.from('private_messages').update({ is_read: true }).eq('id', msg.id); }
      }
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'private_messages' }, function(payload) {
      if (payload.old && payload.old.id) {
        var msgDiv = document.querySelector('.msg[data-msg-id="' + payload.old.id + '"]');
        if (msgDiv) msgDiv.remove();
      }
    })
    .subscribe();
}

function setupPresenceInitial() {
  presenceChannel = client.channel('presence-garifalo')
    .on('presence', { event: 'sync' }, function() {
      var state = presenceChannel.presenceState();
      onlineUsers = {};
      Object.keys(state).forEach(function(key) {
        state[key].forEach(function(p) {
          if (p.username && p.uid) {
            onlineUsers[p.uid] = { username: p.username, avatar: p.avatar || null };
            if (p.avatar) {
              userAvatars[p.uid] = p.avatar;
              localStorage.setItem('user_avatar_' + p.uid, p.avatar);
            }
          }
        });
      });
      updateUserList();
    })
    .subscribe(async function(status) {
      if (status === 'SUBSCRIBED' && pendingTrackData) {
        try { await presenceChannel.track(pendingTrackData); } catch(e) {}
      }
    });
}

async function registerUser() {
  var username = document.getElementById('userIn').value.trim();
  var password = document.getElementById('passIn').value.trim();
  if (!username || !password) { showLoginError('⚠️ Συμπλήρωσε όνομα και κωδικό!'); return; }
  if (username.includes(':')) { showLoginError('⚠️ Το όνομα δεν μπορεί να περιέχει ":"'); return; }
  if (password.length < 3) { showLoginError('⚠️ Ο κωδικός πρέπει να είναι τουλάχιστον 3 χαρακτήρες!'); return; }
  var isBanned = await checkIfBanned(username);
  if (isBanned) { showLoginError('🚫 Αυτό το όνομα είναι banned!'); return; }
  try {
    var existing = await client.from('registered_users').select('uid').eq('username', username.toLowerCase()).maybeSingle();
    if (existing.data) { showLoginError('❌ Αυτό το όνομα είναι ήδη κατοχυρωμένο!'); return; }
    var newUid = 'uid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    await client.from('registered_users').insert([{ uid: newUid, username: username.toLowerCase(), password: password, avatar: null, created_at: Date.now() }]);
    localStorage.setItem('chat_uid', newUid);
    localStorage.setItem('chat_username', username);
    localStorage.setItem('chat_password', password);
    alert('✅ Ο λογαριασμός δημιουργήθηκε.');
    window.location.reload();
  } catch(e) { showLoginError('Σφάλμα: ' + e.message); }
}

async function goChat(isAutoLogin) {
  var username = document.getElementById('userIn').value.trim();
  var password = document.getElementById('passIn').value.trim();
  if (!username || !password) { showLoginError('⚠️ Συμπλήρωσε όνομα και κωδικό!'); return; }

  if (username.toLowerCase() === 'sakis') {
    if (password !== '019630') {
      showLoginError('❌ Λάθος κωδικός!');
      if (isAutoLogin) { localStorage.removeItem('chat_username'); localStorage.removeItem('chat_password'); localStorage.removeItem('chat_uid'); }
      return;
    }
    try { await client.from('active_sessions').delete().eq('username', 'sakis'); } catch(e) {}
    localStorage.setItem('chat_uid', 'sakis_uid');
    localStorage.setItem('chat_username', username);
    localStorage.setItem('chat_password', password);
    await enterChat(username, 'sakis_uid');
    return;
  }

  var isBanned = await checkIfBanned(username);
  if (isBanned) {
    showLoginError('🚫 Αυτό το όνομα είναι banned!');
    if (isAutoLogin) { localStorage.removeItem('chat_username'); localStorage.removeItem('chat_password'); localStorage.removeItem('chat_uid'); }
    return;
  }

  var regData = null;
  try {
    var result = await client.from('registered_users').select('*').eq('username', username.toLowerCase()).maybeSingle();
    regData = result.data;
  } catch(e) { regData = null; }

  if (!regData) {
    showLoginError('❌ Δεν υπάρχει λογαριασμός. Κάνε εγγραφή!');
    if (isAutoLogin) { localStorage.removeItem('chat_username'); localStorage.removeItem('chat_password'); localStorage.removeItem('chat_uid'); }
    return;
  }

  if (regData.password !== password) {
    showLoginError('❌ Λάθος κωδικός!');
    if (isAutoLogin) { localStorage.removeItem('chat_username'); localStorage.removeItem('chat_password'); localStorage.removeItem('chat_uid'); }
    return;
  }

  var targetUid = regData.uid;

  try {
    var sessionResult = await client.from('active_sessions').select('*').eq('username', username.toLowerCase()).maybeSingle();
    if (sessionResult.data) {
      if (sessionResult.data.session_id !== currentSessionId) {
        showLoginError('⚠️ Ο λογαριασμός είναι ήδη συνδεδεμένος σε άλλη συσκευή!');
        if (isAutoLogin) { localStorage.removeItem('chat_username'); localStorage.removeItem('chat_password'); localStorage.removeItem('chat_uid'); }
        return;
      }
    }
    await client.from('active_sessions').upsert([{ username: username.toLowerCase(), session_id: currentSessionId, timestamp: Date.now() }]);
    localStorage.setItem('chat_uid', targetUid);
    localStorage.setItem('chat_username', username);
    localStorage.setItem('chat_password', password);
    await enterChat(username, targetUid);
  } catch(e) { showLoginError('Σφάλμα: ' + e.message); }
}

async function enterChat(username, uid) {
  currentUser = username; currentUid = uid; connectTime = Date.now();
  if (currentUser.toLowerCase() === 'sakis') {
    isAdmin = true;
    document.getElementById('adminClearBtn').classList.add('show');
    document.getElementById('bannedBtn').classList.add('show');
    document.getElementById('clearBtn').classList.add('show');
  } else {
    isAdmin = false;
    document.getElementById('clearBtn').classList.remove('show');
    document.getElementById('bannedBtn').classList.remove('show');
  }

  var avatarUrl = localStorage.getItem('user_avatar_' + currentUid);
  if (!avatarUrl) {
    try {
      var avatarResult = await client.from('user_avatars').select('*').eq('username', currentUser.toLowerCase()).maybeSingle();
      if (avatarResult.data && avatarResult.data.avatar_url) {
        avatarUrl = avatarResult.data.avatar_url;
        userAvatars[currentUid] = avatarUrl;
        localStorage.setItem('user_avatar_' + currentUid, avatarUrl);
      }
    } catch(e) { console.error('avatar load error:', e); }
  } else {
    userAvatars[currentUid] = avatarUrl;
  }

  var trackData = { uid: currentUid, username: currentUser };
  if (avatarUrl) { trackData.avatar = avatarUrl; }

  pendingTrackData = trackData;
  try { presenceChannel.track(trackData).catch(function(e) {}); } catch(e) {}

  document.getElementById('loginDiv').style.display = 'none';
  document.getElementById('chatApp').style.display = 'flex';
  document.getElementById('msgInput').focus();
  await loadMessages();
  subscribeToMessages();
  subscribeToBans();
}

async function adminClearAll() {
  if (!isAdmin) return;
  if (!confirm('⚠️ Διαγραφή ΟΛΩΝ των λογαριασμών ΕΚΤΟΣ από εσένα (sakis);\n\nΘα χαθούν ονόματα, κωδικοί, φωτογραφίες.\n\nΕσύ θα παραμείνεις!')) return;
  try {
    var usersResult = await client.from('registered_users').select('uid, username');
    if (usersResult.data) {
      for (var i = 0; i < usersResult.data.length; i++) {
        if (usersResult.data[i].username.toLowerCase() !== 'sakis') {
          await client.from('registered_users').delete().eq('uid', usersResult.data[i].uid);
          await client.from('user_avatars').delete().eq('username', usersResult.data[i].username);
        }
      }
    }
    await client.from('active_sessions').delete();
    alert('✅ Καθαρισμός ολοκληρώθηκε!');
  } catch(e) { alert('Σφάλμα: ' + e.message); }
}

async function logoutChat() {
  if (!confirm("⚠️ Χρειάζεται πραγματικά να αποσυνδεθείτε;\n\nΗ αποσύνδεση είναι απαραίτητη μόνο αν θέλετε να συνδεθείτε από άλλον browser ή συσκευή.\n\nΑν αποσυνδεθείτε, η αυτόματη είσοδος θα απενεργοποιηθεί και θα χρειαστεί να βάλετε ξανά το όνομα χρήστη και τον κωδικό σας.\n\nΘέλετε να συνεχίσετε;")) return; 
  document.getElementById('playerIframe').src = '';
  document.getElementById('playerPanel').classList.remove('show');
  isPlayerOpen = false;
  var uname = currentUser.toLowerCase();
  currentUser = ''; currentUid = '';
  document.getElementById('chatApp').style.display = 'none';
  document.getElementById('loginDiv').style.display = 'flex';
  document.getElementById('userIn').value = '';
  document.getElementById('passIn').value = '';
  localStorage.removeItem('chat_uid');
  localStorage.removeItem('chat_username');
  localStorage.removeItem('chat_password');
  (async function() {
    try { await client.from('active_sessions').delete().eq('username', uname); } catch(e) {}
    try { if (presenceChannel) await presenceChannel.untrack(); } catch(e) {}
    try { if (channel) await channel.unsubscribe(); } catch(e) {}
    try { if (privateChannel) await privateChannel.unsubscribe(); } catch(e) {}
    try { if (banChannel) await banChannel.unsubscribe(); } catch(e) {}
  })();
}

function showClearConfirmation() { if (!isAdmin) return; document.getElementById('clearConfirmationOverlay').classList.add('show'); }
function hideClearConfirmation() { document.getElementById('clearConfirmationOverlay').classList.remove('show'); }
async function confirmClearMessages() {
  if (!isAdmin) return; 
  hideClearConfirmation();
  
  try {
    // Διαγραφή ΟΛΩΝ των δημόσιων μηνυμάτων 
    // Το .not('id', 'is', 'null') είναι ασφαλές και λειτουργεί είτε το id είναι αριθμός είτε UUID
    const { error: err1 } = await client.from('messages').delete().not('id', 'is', 'null');
    
    if (err1) {
      console.error('Σφάλμα messages:', err1);
      alert('Σφάλμα διαγραφής: ' + err1.message);
      return;
    }

    // Διαγραφή και των ιδιωτικών μηνυμάτων για πλήρη καθαρισμό
    const { error: err2 } = await client.from('private_messages').delete().not('id', 'is', 'null');
    if (err2) {
      console.error('Σφάλμα private_messages:', err2);
    }

    alert('✅ Όλα τα μηνύματα διαγράφηκαν επιτυχώς!');
    
    // Άμεσος καθαρισμός της οθόνης για άμεση οπτική επιβεβαίωση
    document.getElementById('msgContainer').innerHTML = '';
    
  } catch(e) { 
    console.error('Εξαίρεση:', e);
    alert('Σφάλμα: ' + e.message); 
  }
}

function openImagePreview(imgSrc) { var overlay = document.getElementById('imagePreviewOverlay'); var img = document.getElementById('imagePreviewImg'); img.src = imgSrc; overlay.classList.add('show'); }
function closeImagePreview(event) { if (event.target.id === 'imagePreviewOverlay' || event.target.classList.contains('image-preview-close')) { document.getElementById('imagePreviewOverlay').classList.remove('show'); } }
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { document.getElementById('imagePreviewOverlay').classList.remove('show'); } });
document.addEventListener('click', function(e) {
  var btn = (e.target.closest) ? e.target.closest('.delete-image-btn') : null;
  if (!btn) return;
  deleteImage(btn.getAttribute('data-msg-id'), btn.getAttribute('data-deletehash'), btn, btn.getAttribute('data-private') === 'true');
});
document.getElementById('userIn').addEventListener('keypress', function(e) { if (e.key === 'Enter') document.getElementById('passIn').focus(); });
document.getElementById('passIn').addEventListener('keypress', function(e) { if (e.key === 'Enter') goChat(false); });
document.getElementById('msgInput').addEventListener('keypress', function(e) { if (e.key === 'Enter') sendMsg(); });

window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'RADIO_TITLE_UPDATE') {
    var titleText = event.data.title || 'Radio Synnefa Live';
    var titleEl = document.getElementById('radioNowPlayingText');
    if (titleEl) {
      var textarea = document.createElement('textarea'); textarea.innerHTML = titleText; var decodedText = textarea.value;
      titleEl.innerHTML = '<span class="radio-text-scroll">' + decodedText + '</span>';
    }
  }
});

var mediaRecorder = null;
var audioChunks = [];
var recordingInterval = null;
var recordingSeconds = 0;
var currentAudioBlob = null;
var currentAudioUrl = null;
var CLOUDINARY_CLOUD_NAME = 'ceu1jpxy';
var CLOUDINARY_UPLOAD_PRESET = 'radiochat_audio';

async function toggleRecording() { if (!mediaRecorder || mediaRecorder.state === 'inactive') { await startRecording(); } else { stopRecording(); } }

async function startRecording() {
  try {
    var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream); audioChunks = []; recordingSeconds = 0;
    mediaRecorder.ondataavailable = function(event) { if (event.data.size > 0) { audioChunks.push(event.data); } };
    mediaRecorder.onstop = function() {
      currentAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      currentAudioUrl = URL.createObjectURL(currentAudioBlob);
      document.getElementById('previewAudioPlayer').src = currentAudioUrl;
      document.getElementById('audioPreviewOverlay').classList.add('show');
      stream.getTracks().forEach(function(track) { track.stop(); });
    };
    mediaRecorder.start();
    document.getElementById('micBtn').classList.add('recording');
    document.getElementById('recordingTimer').style.display = 'flex';
    recordingInterval = setInterval(function() {
      recordingSeconds++;
      var mins = Math.floor(recordingSeconds / 60);
      var secs = recordingSeconds % 60;
      document.getElementById('recTimeText').textContent = mins + ':' + (secs < 10 ? '0' : '') + secs + ' / 0:30';
      if (recordingSeconds >= 30) { stopRecording(); }
    }, 1000);
  } catch (err) {
    alert('Δεν ήταν δυνατή η πρόσβαση στο μικρόφωνο.\nΠαρακαλώ επέτρεψε την πρόσβαση στις ρυθμίσεις του browser.');
    console.error('Mic error:', err);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    clearInterval(recordingInterval);
    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(function(track) { track.stop(); track.enabled = false; });
    }
    mediaRecorder = null;
    document.getElementById('micBtn').classList.remove('recording');
    document.getElementById('recordingTimer').style.display = 'none';
  }
}

function cancelRecording() {
  document.getElementById('audioPreviewOverlay').classList.remove('show');
  if (currentAudioUrl) { URL.revokeObjectURL(currentAudioUrl); currentAudioUrl = null; }
  currentAudioBlob = null;
}

async function sendAudioMessage() {
  if (!currentAudioBlob) return;
  var sendBtn = document.querySelector('.preview-btn.send');
  var originalText = sendBtn.textContent;
  sendBtn.textContent = '⏳ Αποστολή...'; sendBtn.disabled = true;
  try {
    var formData = new FormData();
    formData.append('file', currentAudioBlob, 'recording.webm');
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    var response = await fetch('https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/auto/upload', { method: 'POST', body: formData });
    var data = await response.json();
    if (data.secure_url) {
      var audioUrl = data.secure_url;
      if (currentPrivateChat) {
        await client.from('private_messages').insert([{ sender: currentUid, sender_name: currentUser, receiver: currentPrivateChat, message: '[🎙️ Ηχητικό Μήνυμα]', audio_url: audioUrl }]);
      } else {
        await client.from('messages').insert([{ user_id: currentUid, username: currentUser, text: '[🎙️ Ηχητικό Μήνυμα]', audio_url: audioUrl }]);
      }
      cancelRecording();
    } else { throw new Error('Αποτυχία μεταφόρτωσης στο Cloudinary'); }
  } catch (err) { alert('Σφάλμα κατά την αποστολή: ' + err.message); }
  finally { sendBtn.textContent = originalText; sendBtn.disabled = false; }
}

document.addEventListener('DOMContentLoaded', function() {
  var passIn = document.getElementById('passIn');
  var passHint = document.getElementById('passHint');
  if (passIn && passHint) {
    passIn.addEventListener('focus', function() { passHint.style.display = 'block'; });
    passIn.addEventListener('blur', function() { setTimeout(function() { passHint.style.display = 'none'; }, 250); });
  }
});