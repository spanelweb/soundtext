/*
    27 September 2026
    Suryo DwiJayanto
*/
const state = {
    audioCtx: null,
    analyser: null,
    audioSource: null,
    audioElement: null,
    eqFilters: [],
    isPlaying: false,
    isDemo: true,
    
    // Settings Parameters
    text: "Silakan Unggah JSON Lirik",
    lyricsData: [],
    colorMode: "gradient",
    solidColor: "#45f3ff",
    visualStyle: "textWave",
    sensitivity: 1.5,
    speed: 1.0,
    
    dataArray: null,
    bufferLength: 0
};

const canvas = document.getElementById('visualizerCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const btnSettings = document.getElementById('btnSettings');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const settingsPanel = document.getElementById('settingsPanel');

// Tab system logic
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
    });
});

btnSettings.addEventListener('click', () => settingsPanel.classList.toggle('active'));
btnCloseSettings.addEventListener('click', () => settingsPanel.classList.remove('active'));

const colorModeSelect = document.getElementById('colorModeSelect');
const solidColorGroup = document.getElementById('solidColorGroup');
const solidColorInput = document.getElementById('solidColorInput');
const colorHexText = document.getElementById('colorHexText');
const visualStyleSelect = document.getElementById('visualStyleSelect');
const sensitivityRange = document.getElementById('sensitivityRange');
const sensVal = document.getElementById('sensVal');
const speedRange = document.getElementById('speedRange');
const speedVal = document.getElementById('speedVal');

colorModeSelect.addEventListener('change', (e) => {
    state.colorMode = e.target.value;
    solidColorGroup.style.display = state.colorMode === 'solid' ? 'flex' : 'none';
});

solidColorInput.addEventListener('input', (e) => {
    state.solidColor = e.target.value;
    colorHexText.textContent = e.target.value;
});

visualStyleSelect.addEventListener('change', (e) => {
    state.visualStyle = e.target.value;
});

sensitivityRange.addEventListener('input', (e) => {
    state.sensitivity = parseFloat(e.target.value);
    sensVal.textContent = `${state.sensitivity.toFixed(1)}x`;
});

speedRange.addEventListener('input', (e) => {
    state.speed = parseFloat(e.target.value);
    speedVal.textContent = `${state.speed.toFixed(1)}x`;
});

// Equalizer Sliders Handling
const eqSliders = document.querySelectorAll('.eq-slider');
const eqValElements = [
    document.getElementById('eqLowVal'),
    document.getElementById('eqMidLowVal'),
    document.getElementById('eqMidVal'),
    document.getElementById('eqMidHighVal'),
    document.getElementById('eqHighVal')
];

eqSliders.forEach((slider, idx) => {
    slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        eqValElements[idx].textContent = `${val > 0 ? '+' : ''}${val} dB`;
        if (state.eqFilters[idx]) {
            state.eqFilters[idx].gain.value = val;
        }
    });
});

const btnPlayPause = document.getElementById('btnPlayPause');
const playIcon = document.getElementById('playIcon');
const btnUploadAudio = document.getElementById('btnUploadAudio');
const audioInput = document.getElementById('audioInput');
const btnUploadLyrics = document.getElementById('btnUploadLyrics');
const lyricsInput = document.getElementById('lyricsInput');
const trackTitle = document.getElementById('trackTitle');

function initAudioContext() {
    if (!state.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        state.audioCtx = new AudioContext();
        
        state.analyser = state.audioCtx.createAnalyser();
        state.analyser.fftSize = 256;
        state.bufferLength = state.analyser.frequencyBinCount;
        state.dataArray = new Uint8Array(state.bufferLength);

        // Setup 5-Band Equalizer filters (BiquadFilterNode)
        const frequencies = [60, 230, 910, 3600, 14000];
        state.eqFilters = frequencies.map((freq, i) => {
            const filter = state.audioCtx.createBiquadFilter();
            filter.type = i === 0 ? 'lowshelf' : (i === frequencies.length - 1 ? 'highshelf' : 'peaking');
            filter.frequency.value = freq;
            filter.gain.value = parseFloat(eqSliders[i].value);
            if (filter.type === 'peaking') filter.Q.value = 1.0;
            return filter;
        });
    }
    if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
    }
}

btnPlayPause.addEventListener('click', () => {
    if (state.isDemo) return;
    initAudioContext();

    if (state.audioElement) {
        if (state.audioElement.paused) {
            state.audioElement.play();
            state.isPlaying = true;
        } else {
            state.audioElement.pause();
            state.isPlaying = false;
        }
        updatePlayButton();
    }
});

function updatePlayButton() {
    playIcon.className = state.isPlaying ? "fas fa-pause" : "fas fa-play";
}

// Handle Upload JSON Lirik
btnUploadLyrics.addEventListener('click', () => lyricsInput.click());
lyricsInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const jsonContent = JSON.parse(event.target.result);
            if (jsonContent && Array.isArray(jsonContent.lyrics)) {
                state.lyricsData = jsonContent.lyrics;
                btnUploadAudio.disabled = false;
                trackTitle.textContent = "Silakan Unggah Lagu MP3";
                state.text = "Lirik Siap, Silakan Unggah MP3";
                alert("File lirik JSON berhasil dimuat! Silakan unggah file MP3.");
            } else {
                alert("Format JSON tidak valid. Pastikan ada array 'lyrics'.");
            }
        } catch (err) {
            alert("Gagal membaca file JSON: " + err.message);
        }
    };
    reader.readAsText(file);
});

// Handle Upload MP3
btnUploadAudio.addEventListener('click', () => {
    if (!btnUploadAudio.disabled) audioInput.click();
});

audioInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    initAudioContext();
    if (state.audioElement) state.audioElement.pause();

    const url = URL.createObjectURL(file);
    state.audioElement = new Audio(url);
    
    if (state.audioSource) state.audioSource.disconnect();

    state.audioSource = state.audioCtx.createMediaElementSource(state.audioElement);
    
    // Sambungkan audio node melalui rantai Equalizer filters -> Analyser -> Destination
    let lastNode = state.audioSource;
    state.eqFilters.forEach(filter => {
        lastNode.connect(filter);
        lastNode = filter;
    });
    lastNode.connect(state.analyser);
    state.analyser.connect(state.audioCtx.destination);

    state.isDemo = false;
    trackTitle.textContent = file.name;

    state.audioElement.play();
    state.isPlaying = true;
    updatePlayButton();

    state.audioElement.onended = () => {
        state.isPlaying = false;
        updatePlayButton();
    };
});

function updateActiveLyrics() {
    if (state.isDemo || !state.audioElement || state.lyricsData.length === 0) return;

    const currentTimeMs = state.audioElement.currentTime * 1000;
    let currentLine = "";

    for (let i = 0; i < state.lyricsData.length; i++) {
        const item = state.lyricsData[i];
        if (currentTimeMs >= item.time) {
            currentLine = item.line;
        } else {
            break;
        }
    }

    if (currentLine !== "") {
        state.text = currentLine;
    }
}

function generateDemoFrequencies() {
    if (!state.dataArray) {
        state.bufferLength = 128;
        state.dataArray = new Uint8Array(state.bufferLength);
    }
    
    for (let i = 0; i < state.bufferLength; i++) {
        state.dataArray[i] = Math.max(0, state.dataArray[i] - 5);
    }
}

function getStyleColor(index, total, time) {
    if (state.colorMode === 'solid') {
        return state.solidColor;
    } else if (state.colorMode === 'neon') {
        const hue = (index / total * 180 + time * 50) % 360;
        return `hsl(${hue}, 100%, 60%)`;
    } else if (state.colorMode === 'gold') {
        const hue = 20 + (index / total) * 30;
        return `hsl(${hue}, 100%, 55%)`;
    } else {
        const hue = (index / total * 360 + time * 40) % 360;
        return `hsl(${hue}, 90%, 65%)`;
    }
}

let renderTime = 0;

function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);

    renderTime += 0.02 * state.speed;

    updateActiveLyrics();

    if (state.isDemo || !state.isPlaying) {
        generateDemoFrequencies();
    } else if (state.analyser && state.isPlaying) {
        state.analyser.getByteFrequencyData(state.dataArray);
    }

    ctx.fillStyle = 'rgba(11, 12, 16, 0.25)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const baseFontSize = Math.min(canvas.width / (state.text.length * 0.75 + 2), 64);
    ctx.font = `900 ${baseFontSize}px 'Poppins', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const characters = state.text.split('');
    const numChars = characters.length;
    
    let totalTextWidth = 0;
    const charWidths = characters.map(char => {
        const w = ctx.measureText(char).width;
        totalTextWidth += w;
        return w;
    });

    let startX = centerX - (totalTextWidth / 2);

    if (state.visualStyle === 'textWave') {
        let currentX = startX;
        characters.forEach((char, i) => {
            const charW = charWidths[i];
            const charCenterX = currentX + charW / 2;

            const freqIndex = Math.floor((i / Math.max(1, numChars)) * (state.bufferLength / 2));
            const audioVal = state.dataArray[freqIndex] || 0;
            
            const amp = (audioVal / 255) * 80 * state.sensitivity;
            const waveOffset = Math.sin(renderTime * 3 + i * 0.4) * amp;

            const color = getStyleColor(i, numChars, renderTime);

            ctx.save();
            ctx.translate(charCenterX, centerY + waveOffset);
            ctx.shadowColor = color;
            ctx.shadowBlur = 15 + (audioVal / 255) * 20;
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#000000';
            ctx.strokeText(char, 0, 0);
            ctx.fillStyle = color;
            ctx.fillText(char, 0, 0);
            ctx.restore();

            currentX += charW;
        });
    }
    else if (state.visualStyle === 'textBars') {
        let currentX = startX;
        characters.forEach((char, i) => {
            const charW = charWidths[i];
            const charCenterX = currentX + charW / 2;

            const freqIndex = Math.floor((i / Math.max(1, numChars)) * (state.bufferLength / 1.5));
            const audioVal = state.dataArray[freqIndex] || 0;
            const barHeight = (audioVal / 255) * 120 * state.sensitivity;

            const color = getStyleColor(i, numChars, renderTime);

            ctx.save();
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            
            const barWidth = Math.max(3, charW * 0.4);
            ctx.fillRect(charCenterX - barWidth / 2, centerY - baseFontSize/2 - barHeight, barWidth, barHeight);
            ctx.fillRect(charCenterX - barWidth / 2, centerY + baseFontSize/2, barWidth, barHeight);
            ctx.restore();

            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(255,255,255,0.8)';

            ctx.shadowBlur = 15 + (audioVal / 255) * 20;
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#000000';
            ctx.strokeText(char, 0, 0);

            ctx.fillText(char, charCenterX, centerY);
            ctx.restore();

            currentX += charW;
        });
    }
    else if (state.visualStyle === 'hybrid') {
        ctx.save();
        ctx.beginPath();
        const sliceWidth = canvas.width / state.bufferLength;
        let x = 0;

        for (let i = 0; i < state.bufferLength; i++) {
            const v = state.dataArray[i] / 255.0;
            const y = centerY + Math.sin(i * 0.2 + renderTime) * (v * 100 * state.sensitivity);

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
        }

        const waveColor = getStyleColor(0, 1, renderTime);
        ctx.strokeStyle = waveColor;
        ctx.lineWidth = 4;
        ctx.shadowColor = waveColor;
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.restore();

        let currentX = startX;
        characters.forEach((char, i) => {
            const charW = charWidths[i];
            const charCenterX = currentX + charW / 2;

            const freqIndex = Math.floor((i / Math.max(1, numChars)) * (state.bufferLength / 2));
            const audioVal = state.dataArray[freqIndex] || 0;
            const scale = 1 + (audioVal / 255) * 0.3 * state.sensitivity;

            const color = getStyleColor(i, numChars, renderTime);

            ctx.save();
            ctx.translate(charCenterX, centerY);
            ctx.scale(scale, scale);
            ctx.fillStyle = color;
            ctx.shadowColor = color;

            ctx.shadowBlur = 15 + (audioVal / 255) * 20;
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#000000';
            ctx.strokeText(char, 0, 0);

            ctx.fillText(char, 0, 0);
            ctx.restore();

            currentX += charW;
        });
    }
}

drawVisualizer();
