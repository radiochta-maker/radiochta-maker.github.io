const iframe = document.getElementById('vdoPlayer');
const backupVideo = document.getElementById('backupVideo');
const controls = document.getElementById('playerControls');
const header = document.getElementById('playerHeader');
const tracker = document.getElementById('tracker');
const container = document.getElementById('mainContainer');
const notice = document.getElementById('noticeMessage');
const volumeSlider = document.getElementById('volumeSlider');
const volumeIcon = document.getElementById('volumeIcon');
const fsButton = document.getElementById('fsToggle');
const fsIcon = document.getElementById('fsIcon');
const fsText = document.getElementById('fsText');
const volumeContainer = document.getElementById('volumeContainer');
const clockEl = document.getElementById('digitalClock');

let hideTimeout;
const HIDE_DELAY_MS = 3500; 
let currentMode = "loading";
let lastMessageTime = Date.now();
let isFirstLoad = true; 
let previousVolume = 50; 
let isVdoActive = false;

let backupHlsInstance = null; // Κρατάμε αυτό για να παίζει τα backup βίντεο (m3u8)

const playlist = [
    "https://video.gumlet.io/6a0b01fcdedba6b7ad6e20c4/6a0b060e506e4b0c8e0c0df3/main.m3u8", 
    "https://video.gumlet.io/6a0b01fcdedba6b7ad6e20c4/6a0b0873cf982fff3c1e29f6/main.m3u8",        
    "https://video.gumlet.io/6a0b01fcdedba6b7ad6e20c4/6a0b1b8dfa3d02a4ac547ef1/main.m3u8",                
    "https://video.gumlet.io/6a0b01fcdedba6b7ad6e20c4/6a22e37ffc147469958536a8/main.m3u8",             
    "https://video.gumlet.io/6a0b01fcdedba6b7ad6e20c4/6a231d9927da16ac8c3efeaf/main.m3u8",        
    "https://παράδειγμα.com/stream6/playlist.m3u8"         
];
let currentVideoIndex = 0;

// Ψηφιακό Ρολόι
const updateClock = () => {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('el-GR');
};
setInterval(updateClock, 1000);
updateClock();

backupVideo.addEventListener('ended', loadNextBackupVideo);

function loadNextBackupVideo() {
    currentVideoIndex++;
    if (currentVideoIndex >= playlist.length) { currentVideoIndex = 0; }
    
    if (currentMode === "backup") {
        playBackupStream(playlist[currentVideoIndex]);
    }
}

// Έξυπνη Εμφάνιση/Εξαφάνιση UI
const showUI = () => {
    controls.classList.add('visible');
    header.classList.add('visible');
    document.body.classList.remove('hide-cursor'); 
    
    clearTimeout(hideTimeout);
    
    if (parseInt(volumeSlider.value) === 0) {
        return; 
    }
    
    hideTimeout = setTimeout(() => { 
        controls.classList.remove('visible'); 
        header.classList.remove('visible'); 
        document.body.classList.add('hide-cursor'); 
    }, HIDE_DELAY_MS);
};

tracker.addEventListener('mousemove', showUI);
controls.addEventListener('mousemove', showUI);
container.addEventListener('mousemove', showUI);
window.addEventListener('keydown', showUI); 
showUI();

setTimeout(() => { notice.style.opacity = "0"; }, 6000);

const sendVdoCommand = (command, value) => {
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ [command]: value }, '*');
    }
};

iframe.addEventListener('load', () => {
    sendVdoCommand('mute', true);
    checkVdoState();
});

window.addEventListener('message', (e) => {
    if (!e.data) return;
    lastMessageTime = Date.now();

    if (e.data.action === 'video-loaded' || e.data.event === 'wfs-video-loaded' || e.data.streamID) {
        isVdoActive = true;
        evaluateStreamPriority();
    }

    if (e.data.action === 'stream-dropped' || e.data.event === 'video-removed' || e.data.action === 'stopped') {
        isVdoActive = false;
        evaluateStreamPriority();
    }
});

function checkVdoState() {
    sendVdoCommand('get_state', true);
    if (currentMode === "live" && (Date.now() - lastMessageTime > 4000)) {
        isVdoActive = false;
        evaluateStreamPriority();
    }
}

function evaluateStreamPriority() {
    if (isVdoActive) {
        if (currentMode !== "live") {
            currentMode = "live";
            document.body.className = "show-live";
            stopBackupStream();
            isFirstLoad = false;
        }
        return;
    }

    if (currentMode !== "backup") {
        document.body.className = "show-loading";
        switchToBackup();
    }
}

// Αναπαραγωγή M3U8 στο backupVideo (Με απενεργοποίηση υποτίτλων)
function playBackupStream(url) {
    if (Hls.isSupported()) {
        if (backupHlsInstance) { backupHlsInstance.destroy(); }
        backupHlsInstance = new Hls({
            manifestLoadingTimeOut: 5000,
            manifestLoadingMaxRetry: 2
        });
        backupHlsInstance.loadSource(url);
        backupHlsInstance.attachMedia(backupVideo);
        
        backupHlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            if (backupHlsInstance.subtitleTracks && backupHlsInstance.subtitleTracks.length > 0) {
                backupHlsInstance.subtitleDisplay = false;
                backupHlsInstance.subtitleTrack = -1;
            }
            for (let i = 0; i < backupVideo.textTracks.length; i++) {
                backupVideo.textTracks[i].mode = 'disabled';
            }
            backupVideo.play().catch(err => console.log("Autoplay block:", err));
        });

        backupHlsInstance.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                console.log("Backup HLS Fatal Error, switching to next...");
                loadNextBackupVideo(); 
            }
        });
    } else if (backupVideo.canPlayType('application/vnd.apple.mpegurl')) {
        backupVideo.src = url;
        backupVideo.addEventListener('loadedmetadata', () => {
            for (let i = 0; i < backupVideo.textTracks.length; i++) {
                backupVideo.textTracks[i].mode = 'disabled';
            }
        });
        backupVideo.play().catch(err => console.log("Autoplay block:", err));
    }
}

function stopBackupStream() {
    backupVideo.pause();
    if (backupHlsInstance) {
        backupHlsInstance.destroy();
        backupHlsInstance = null;
    }
}

// Έξυπνη εναλλαγή σε Backup (1ο βίντεο στην αρχή, τυχαία μετά το live)
function switchToBackup() {
    currentMode = "backup";
    document.body.className = "show-backup";

    if (isFirstLoad) {
        currentVideoIndex = 0; // Ξεκινάει αναγκαστικά από το 1ο βίντεο της λίστας
        isFirstLoad = false; 
    } else {
        currentVideoIndex = Math.floor(Math.random() * playlist.length); // Τυχαίο βίντεο αν έπεσε το live
    }

    playBackupStream(playlist[currentVideoIndex]);
}

// Αν μετά από 3.5 δευτερόλεπτα δεν έχει συνδεθεί το VDO, πάμε σε backup
setTimeout(() => {
    if (currentMode === "loading" && !isVdoActive) {
        switchToBackup();
    }
}, 3500);

// Έλεγχος κατάστασης VDO κάθε 2 δευτερόλεπτα
setInterval(() => {
    checkVdoState();
}, 2000);

// Διαχείριση Έντασης Ήχου (Μόνο για VDO και Backup Video πλέον)
function updateAllVolumes(volumeValue) {
    const volumeRatio = volumeValue / 100;
    const percentage = volumeValue;
    volumeSlider.style.background = `linear-gradient(to right, #ffffff 0%, #ffffff ${percentage}%, rgba(255, 255, 255, 0.3) ${percentage}%, rgba(255, 255, 255, 0.3) 100%)`;

    if (volumeValue > 0) {
        sendVdoCommand('mute', false);
        sendVdoCommand('volume', volumeRatio);
        
        backupVideo.muted = false;
        backupVideo.volume = volumeRatio;
        
        if (volumeValue < 40) volumeIcon.innerHTML = '<i class="fas fa-volume-down"></i>';
        else if (volumeValue < 80) volumeIcon.innerHTML = '<i class="fas fa-volume-up"></i>';
        else volumeIcon.innerHTML = '<i class="fas fa-volume-up" style="color:#fff;"></i>';

        const warning = document.getElementById('muteWarning');
        if (warning) { warning.style.display = 'none'; }
    } else {
        sendVdoCommand('mute', true);
        backupVideo.muted = true;
        volumeIcon.innerHTML = '<i class="fas fa-volume-mute"></i>';
        
        let warning = document.getElementById('muteWarning');
        if (!warning) {
            warning = document.createElement('div');
            warning.id = 'muteWarning';
            warning.innerHTML = '<i class="fas fa-volume-mute" style="margin-right: 12px;"></i> Ο ήχος είναι απενεργοποιημένος. Κάντε κλικ εδώ ή δυναμώστε την ένταση.';
            warning.style = 'position: absolute; top: 125px; left: 50%; transform: translateX(-50%); background: rgba(239, 68, 68, 0.95); color: white; padding: 14px 28px; border-radius: 12px; font-weight: 700; z-index: 9999; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-size: 15px; border: 1px solid rgba(255,255,255,0.2); transition: all 0.3s ease; display: flex; align-items: center; cursor: pointer;';
            
            warning.addEventListener('click', () => {
                volumeSlider.value = 50;
                updateAllVolumes(50);
            });

            document.getElementById('mainContainer').appendChild(warning);
        }
        warning.style.display = 'block';
    }
    
    showUI();
}

volumeSlider.addEventListener('input', (e) => {
    e.stopPropagation();
    updateAllVolumes(volumeSlider.value);
});

volumeIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    if (volumeSlider.value > 0) {
        previousVolume = volumeSlider.value;
        volumeSlider.value = 0;
        updateAllVolumes(0);
    } else {
        volumeSlider.value = previousVolume;
        updateAllVolumes(previousVolume);
    }
});

volumeSlider.addEventListener('click', (e) => { e.stopPropagation(); });

fsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => console.log(err.message));
    } else {
        document.exitFullscreen();
    }
    showUI();
});

document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        fsIcon.innerHTML = '<i class="fas fa-compress"></i>';
        fsText.textContent = "Έξοδος";
    } else {
        fsIcon.innerHTML = '<i class="fas fa-expand"></i>';
        fsText.textContent = "Πλήρης Οθόνη";
    }
});

updateAllVolumes(0);