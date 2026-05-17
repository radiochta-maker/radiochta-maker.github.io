const iframe = document.getElementById('vdoPlayer');
const hlsPlayer = document.getElementById('hlsPlayer');
const picartoPlayer = document.getElementById('picartoPlayer');
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
let isHlsActive = false;
let isPicartoActive = false;

let lastPicartoTime = -1;
let picartoFreezeCounter = 0;

const m3u8Url = "https://lbgo.bozztv.com/ssh101/ssh101/radiotvtrela/playlist.m3u8";
let hlsInstance = null;

const playlist = [
    "https://res.cloudinary.com/dtiuiw8sp/video/upload/v1778706107/spot_radio_sinefa_tv_xatuhk.mp4", 
    "https://res.cloudinary.com/dtiuiw8sp/video/upload/v1778689946/dokimisakis_rouvlp.mp4",        
    "https://res.cloudinary.com/dtiuiw8sp/video/upload/v1756023318/spot2_djefej.mp4",                
    "https://res.cloudinary.com/dtiuiw8sp/video/upload/v1755723079/download_l6ccgd.mp4",             
    "https://video.gumlet.io/676da5bee52b1079305dbcd3/677839eaabb26867fdbf5938/download.mp4",       
    "https://video.gumlet.io/676da5bee52b1079305dbcd3/67dc0c9d4c720203cbdded25/download.mp4"         
];
let currentVideoIndex = 0;

// Ψηφιακό Ρολόι
const updateClock = () => {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('el-GR');
};
setInterval(updateClock, 1000);
updateClock();

backupVideo.addEventListener('ended', () => {
    currentVideoIndex++;
    if (currentVideoIndex >= playlist.length) { currentVideoIndex = 0; }
    backupVideo.src = playlist[currentVideoIndex];
    if (currentMode === "backup") {
        backupVideo.play().catch(e => console.log(e));
    }
});

// Έξυπνη Εμφάνιση/Εξαφάνιση UI (Μένει μόνιμα ανοιχτό αν ο ήχος είναι 0)
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

function initHlsPlayer() {
    if (Hls.isSupported()) {
        if (hlsInstance) { hlsInstance.destroy(); }
        hlsInstance = new Hls({
            manifestLoadingTimeOut: 4000,
            manifestLoadingMaxRetry: 1,
            liveDurationInfinity: true
        });
        hlsInstance.loadSource(m3u8Url);
        hlsInstance.attachMedia(hlsPlayer);
        
        hlsInstance.on(Hls.Events.FRAG_CHANGED, () => {
            isHlsActive = true;
            evaluateStreamPriority();
        });

        hlsInstance.on(Hls.Events.ERROR, () => {
            isHlsActive = false;
            evaluateStreamPriority();
        });
    }
}

iframe.addEventListener('load', () => {
    sendVdoCommand('mute', true);
    initHlsPlayer();
    picartoPlayer.play().catch(() => {});
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

picartoPlayer.addEventListener('playing', () => {
    isPicartoActive = true;
    picartoFreezeCounter = 0; 
    evaluateStreamPriority();
});

picartoPlayer.addEventListener('error', () => {
    isPicartoActive = false;
    evaluateStreamPriority();
});

setInterval(() => {
    if (currentMode === "live-picarto") {
        if (picartoPlayer.currentTime === lastPicartoTime) {
            picartoFreezeCounter++;
            if (picartoFreezeCounter >= 3) {
                isPicartoActive = false;
                picartoFreezeCounter = 0;
                evaluateStreamPriority(); 
            }
        } else {
            picartoFreezeCounter = 0; 
        }
        lastPicartoTime = picartoPlayer.currentTime;
    }
}, 1000);

function evaluateStreamPriority() {
    if (isVdoActive) {
        if (currentMode !== "live-vdo") {
            currentMode = "live-vdo";
            document.body.className = "show-live-vdo";
            backupVideo.pause();
            hlsPlayer.pause();
            picartoPlayer.pause();
            isFirstLoad = false;
        }
        return;
    }

    if (isHlsActive) {
        if (currentMode !== "live-hls") {
            currentMode = "live-hls";
            document.body.className = "show-live-hls";
            backupVideo.pause();
            picartoPlayer.pause();
            hlsPlayer.play().catch(() => {});
            isFirstLoad = false;
        }
        return;
    }

    if (isPicartoActive) {
        if (currentMode !== "live-picarto") {
            currentMode = "live-picarto";
            document.body.className = "show-live-picarto";
            backupVideo.pause();
            hlsPlayer.pause();
            picartoPlayer.play().catch(() => {});
            isFirstLoad = false;
        }
        return;
    }

    if (currentMode !== "backup") {
        document.body.className = "show-loading";
        switchToBackup();
    }
}

function switchToBackup() {
    currentMode = "backup";
    document.body.className = "show-backup";
    hlsPlayer.pause();
    picartoPlayer.pause();

    if (isFirstLoad) {
        currentVideoIndex = 0;
        backupVideo.src = playlist[0];
        isFirstLoad = false; 
    } else {
        const randomIndex = Math.floor(Math.random() * playlist.length);
        currentVideoIndex = randomIndex;
        backupVideo.src = playlist[currentVideoIndex];
    }

    backupVideo.play().catch(err => console.log("Autoplay block:", err));
}

setTimeout(() => {
    if (currentMode === "loading" && !isVdoActive && !isHlsActive && !isPicartoActive) {
        switchToBackup();
    }
}, 3500);

setInterval(() => {
    sendVdoCommand('get_state', true);
    if (currentMode === "live-vdo" && (Date.now() - lastMessageTime > 4000)) {
        isVdoActive = false;
        evaluateStreamPriority();
    }
}, 2000);

setInterval(() => {
    if (!isVdoActive && currentMode === "backup") {
        initHlsPlayer();
        picartoPlayer.load();
        picartoPlayer.play().catch(() => {});
    }
}, 12000);

// Διαχείριση Έντασης Ήχου & Δυναμικό Χρώμα Μπάρας
function updateAllVolumes(volumeValue) {
    const volumeRatio = volumeValue / 100;

    const percentage = volumeValue;
    volumeSlider.style.background = `linear-gradient(to right, #ffffff 0%, #ffffff ${percentage}%, rgba(255, 255, 255, 0.3) ${percentage}%, rgba(255, 255, 255, 0.3) 100%)`;

    if (volumeValue > 0) {
        sendVdoCommand('mute', false);
        sendVdoCommand('volume', volumeRatio);
        
        backupVideo.muted = false;
        backupVideo.volume = volumeRatio;

        hlsPlayer.muted = false;
        hlsPlayer.volume = volumeRatio;

        picartoPlayer.muted = false;
        picartoPlayer.volume = volumeRatio;
        
        if (volumeValue < 40) volumeIcon.innerHTML = '<i class="fas fa-volume-down"></i>';
        else if (volumeValue < 80) volumeIcon.innerHTML = '<i class="fas fa-volume-up"></i>';
        else volumeIcon.innerHTML = '<i class="fas fa-volume-up" style="color:#fff;"></i>';

        const warning = document.getElementById('muteWarning');
        if (warning) { warning.style.display = 'none'; }
    } else {
        sendVdoCommand('mute', true);
        backupVideo.muted = true;
        hlsPlayer.muted = true;
        picartoPlayer.muted = true;
        volumeIcon.innerHTML = '<i class="fas fa-volume-mute"></i>';
        
        let warning = document.getElementById('muteWarning');
        if (!warning) {
            warning = document.createElement('div');
            warning.id = 'muteWarning';
            // ΔΙΟΡΘΩΣΗ: Προσθήκη στυλ "margin-right: 12px" στο εικονίδιο για να μην κολλάει με τα γράμματα
            warning.innerHTML = '<i class="fas fa-volume-mute" style="margin-right: 12px;"></i> Ο ήχος είναι απενεργοποιημένος. Δυναμώστε την ένταση από τα χειριστήρια.';
            warning.style = 'position: absolute; top: 125px; left: 50%; transform: translateX(-50%); background: rgba(239, 68, 68, 0.95); color: white; padding: 14px 28px; border-radius: 12px; font-weight: 700; z-index: 9999; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-size: 15px; border: 1px solid rgba(255,255,255,0.2); transition: all 0.3s ease; display: flex; align-items: center;';
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

// Κλικ για Mute/Unmute
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

// Ξεκινάει με 0 ένταση
updateAllVolumes(0);