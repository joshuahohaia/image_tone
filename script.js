document.addEventListener('DOMContentLoaded', () => {
    const imageContainer = document.querySelector('.image-container');
    const loadingText = document.querySelector('.loading-text');
    const hexDisplay = document.getElementById('hexValue');
    const rgbDisplay = document.getElementById('rgbValue');
    const coordsDisplay = document.getElementById('coordsValue');
    const colourSwatch = document.getElementById('colourSwatch');
    const randomImageBtn = document.getElementById('randomImageBtn');
    const randomToneBtn = document.getElementById('randomToneBtn');
    const btnColourMode = document.getElementById('btnColourMode');
    const btnCoordMode = document.getElementById('btnCoordMode');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const toneOverlay = document.getElementById('toneOverlay');
    const visualizerCanvas = document.getElementById('visualizer');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const volSlider = document.getElementById('volSlider');
    const waveSelect = document.getElementById('waveSelect');
    const scaleSelect = document.getElementById('scaleSelect');
    const delaySlider = document.getElementById('delaySlider');
    const reverbSlider = document.getElementById('reverbSlider');

    if (!imageContainer || !hexDisplay || !rgbDisplay || !coordsDisplay || !colourSwatch || !randomImageBtn || !randomToneBtn || !btnColourMode || !btnCoordMode || !loadingOverlay || !toneOverlay || !visualizerCanvas || !settingsBtn || !settingsPanel || !volSlider || !waveSelect || !scaleSelect || !delaySlider || !reverbSlider || !loadingText) {
        console.error('Initialisation failed: Could not find all required UI elements.');
        return;
    }

    const feedbackDelay = new Tone.FeedbackDelay("8n", 0.5).toDestination();
    feedbackDelay.wet.value = 0;

    const reverb = new Tone.Reverb({
        decay: 1.5,
        preDelay: 0.01,
        wet: 0.5
    }).toDestination();
    reverb.generate();

    let loadingInterval;
    const loadingPhrases = [
        "INITIALISING SEQUENCE...",
        "ANALYSING FREQUENCIES...",
        "DECODING TRANSMISSION...",
        "EXTRACTING HARMONICS...",
        "CALIBRATING SENSORS..."
    ];

    function startLoadingText() {
        let index = 0;
        updateText(loadingPhrases[0]);
        loadingInterval = setInterval(() => {
            index = (index + 1) % loadingPhrases.length;
            updateText(loadingPhrases[index]);
        }, 800);
    }

    function stopLoadingText() {
        clearInterval(loadingInterval);
        updateText("INITIALISING SEQUENCE...");
    }

    function updateText(text) {
        if (loadingText) {
            loadingText.textContent = text;
            loadingText.setAttribute('data-text', text);
        }
    }

    async function playRandomNote() {
        if (!canvasReady) return;
        await startAudio();

        const x = Math.floor(Math.random() * canvas.width);
        const y = Math.floor(Math.random() * canvas.height);

        let freq;
        if (toneMode === 'coordinate') {
            const noteIndex = Math.floor((x / canvas.width) * currentScale.length);
            const note = currentScale[noteIndex % currentScale.length];
            const octave = Math.round(6 - (y / canvas.height) * 4);
            const newNote = `${note}${octave}`;
            freq = Tonal.Note.freq(newNote);
        } else {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            freq = colourToFrequency(pixel[0], pixel[1], pixel[2]);
        }

        if (freq) {
            const synth = new Tone.MonoSynth({
                oscillator: { type: currentWaveform },
                envelope: { attack: 0.1, decay: 0.2, sustain: 0.3, release: 0.8 }
            })
            .connect(waveform)
            .connect(feedbackDelay)
            .connect(reverb); 
            
            synth.volume.value = currentVolume;
            synth.triggerAttackRelease(freq, "8n");
            setTimeout(() => synth.dispose(), 2000);
        }
    }

    async function playRandomSequence(useOverlay = true) {
        if (useOverlay) toneOverlay.classList.remove('hidden');
         for (let i = 0; i < 4; i++) {
            playRandomNote();
            await new Promise(r => setTimeout(r, 200));
        }
        if (useOverlay) toneOverlay.classList.add('hidden');
    }

    function randomiseSettings() {
        const waveforms = ['sine', 'triangle', 'square', 'sawtooth'];
        currentWaveform = waveforms[Math.floor(Math.random() * waveforms.length)];
        waveSelect.value = currentWaveform;

        const scaleOptions = Array.from(scaleSelect.options).map(opt => opt.value);
        const randomScaleName = scaleOptions[Math.floor(Math.random() * scaleOptions.length)];
        scaleSelect.value = randomScaleName;
        
        if (randomScaleName === 'chromatic') {
            currentScale = Tonal.Scale.get('C chromatic').notes;
        } else {
            currentScale = Tonal.Scale.get(randomScaleName).notes;
        }

        const randomDelay = (Math.random() * 0.8).toFixed(1);
        delaySlider.value = randomDelay;
        feedbackDelay.wet.value = parseFloat(randomDelay);

        const randomReverb = (Math.random() * 8).toFixed(1);
        reverbSlider.value = randomReverb;
        reverb.decay = parseFloat(randomReverb);
        reverb.generate();
    }

    randomToneBtn.addEventListener('click', () => {
        randomiseSettings();
        playRandomSequence(true);
    });

    let currentWaveform = 'sine';
    let currentVolume = -10;
    let currentScale = Tonal.Scale.get('C major').notes;

    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsPanel.classList.toggle('hidden');
        settingsBtn.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!settingsPanel.classList.contains('hidden') && !settingsPanel.contains(e.target) && e.target !== settingsBtn) {
            settingsPanel.classList.add('hidden');
            settingsBtn.classList.remove('active');
        }
    });

    delaySlider.addEventListener('input', (e) => {
        feedbackDelay.wet.value = parseFloat(e.target.value);
    });

    reverbSlider.addEventListener('input', (e) => {
        reverb.decay = parseFloat(e.target.value);
        reverb.generate(); 
    });

    volSlider.addEventListener('input', (e) => {
        currentVolume = parseFloat(e.target.value);
        if (oscillator) {
            oscillator.volume.rampTo(currentVolume, 0.1);
        }
    });

    waveSelect.addEventListener('change', (e) => {
        currentWaveform = e.target.value;
        if (oscillator) {
            oscillator.type = currentWaveform;
        }
    });

    scaleSelect.addEventListener('change', (e) => {
        const scaleName = e.target.value;
        if (scaleName === 'chromatic') {
            currentScale = Tonal.Scale.get('C chromatic').notes;
        } else {
            currentScale = Tonal.Scale.get(scaleName).notes;
        }
    });

    const visCtx = visualizerCanvas.getContext('2d');
    const waveform = new Tone.Waveform(64);
    
    function drawVisualizer() {
        requestAnimationFrame(drawVisualizer);
        const buffer = waveform.getValue();
        visCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
        visCtx.beginPath();
        visCtx.lineJoin = 'round';
        visCtx.lineWidth = 2;
        const primaryColour = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
        visCtx.strokeStyle = primaryColour || '#ef4444'; 
        
        if (buffer.length > 0) {
            const sliceWidth = visualizerCanvas.width / buffer.length;
            let x = 0;
            for (let i = 0; i < buffer.length; i++) {
                const v = buffer[i]; 
                const y = (v + 1) / 2 * visualizerCanvas.height;
                if (i === 0) {
                    visCtx.moveTo(x, y);
                } else {
                    visCtx.lineTo(x, y);
                }
                x += sliceWidth;
            }
        }
        visCtx.stroke();
    }
    drawVisualizer();

    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 1157;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let canvasReady = false;

    const canvasContainer = document.createElement('div');
    canvasContainer.classList.add('canvas-container');
    imageContainer.appendChild(canvasContainer);

    const img = new Image();
    img.crossOrigin = "Anonymous";
    const colorThief = new ColorThief();

    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        if (!canvasContainer.contains(canvas)) {
            canvasContainer.innerHTML = '';
            canvasContainer.appendChild(canvas);
        }
        
        canvasReady = true;
        loadingOverlay.classList.add('hidden');
        stopLoadingText();
        
        try {
            if (img.complete) {
                const dominantColour = colorThief.getColor(img);
                const rgbString = `rgb(${dominantColour[0]}, ${dominantColour[1]}, ${dominantColour[2]})`;
                randomImageBtn.style.backgroundColor = rgbString;
                const yiq = ((dominantColour[0] * 299) + (dominantColour[1] * 587) + (dominantColour[2] * 114)) / 1000;
                randomImageBtn.style.color = (yiq >= 128) ? '#000' : '#fff';
            }
        } catch (e) {
            console.warn("Colour extraction failed:", e);
        }
        
        playRandomSequence(false);
    };

    img.onerror = () => {
        loadingOverlay.classList.add('hidden');
        stopLoadingText();
        alert("Failed to load image. Please try again.");
    };

    img.src = 'images/cosmic_tarantula.png';

    randomImageBtn.addEventListener('click', () => {
        canvasReady = false;
        loadingOverlay.classList.remove('hidden');
        startLoadingText();
        const randomId = Math.floor(Math.random() * 1000);
        img.src = `https://picsum.photos/2000/1157?random=${randomId}`;
    });

    let oscillator = null;
    let toneMode = 'colour';

    const startAudio = async () => {
        if (Tone.context.state !== 'running') {
            try {
                await Tone.start();
            } catch (e) {
                console.error('Could not start AudioContext:', e);
            }
        }
    };

    btnColourMode.addEventListener('click', () => {
        toneMode = 'colour';
        btnColourMode.classList.add('active');
        btnCoordMode.classList.remove('active');
        playRandomSequence(false);
    });

    btnCoordMode.addEventListener('click', () => {
        toneMode = 'coordinate';
        btnCoordMode.classList.add('active');
        btnColourMode.classList.remove('active');
        playRandomSequence(false);
    });

    canvas.addEventListener('mouseenter', async () => {
        await startAudio();
        if (Tone.context.state !== 'running') return;

        if (!oscillator) {
            oscillator = new Tone.Oscillator({ type: currentWaveform, frequency: 440, volume: currentVolume });
            oscillator.connect(waveform);
            oscillator.connect(feedbackDelay);
            oscillator.connect(reverb);
            oscillator.start();
        }
    });

    canvas.addEventListener('mousemove', async (e) => {
        if (!canvasReady) return;

        if (!oscillator) {
            await startAudio();
            if (Tone.context.state !== 'running') return;
            if (!oscillator) {
                oscillator = new Tone.Oscillator({ type: currentWaveform, frequency: 440, volume: currentVolume });
                oscillator.connect(waveform);
                oscillator.connect(feedbackDelay);
                oscillator.connect(reverb);
                oscillator.start();
            }
        }

        const rect = canvas.getBoundingClientRect();
        const x = Math.floor(e.clientX - rect.left);
        const y = Math.floor(e.clientY - rect.top);

        coordsDisplay.textContent = `${x}, ${y}`;

        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];

        rgbDisplay.textContent = `(${r}, ${g}, ${b})`;
        const hex = rgbToHex(r, g, b);
        hexDisplay.textContent = hex;
        colourSwatch.style.backgroundColor = hex;

        let freq;
        if (toneMode === 'coordinate') {
            const noteIndex = Math.floor((x / canvas.width) * currentScale.length);
            const note = currentScale[noteIndex % currentScale.length];
            const octave = Math.round(6 - (y / canvas.height) * 4);
            const newNote = `${note}${octave}`;
            freq = Tonal.Note.freq(newNote);
        } else {
            freq = colourToFrequency(r, g, b);
        }

        if (freq && oscillator) {
            oscillator.frequency.rampTo(freq, 0.05);
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (oscillator) {
            oscillator.stop();
            oscillator.dispose();
            oscillator = null;
        }
        hexDisplay.textContent = '#------';
        rgbDisplay.textContent = '(---, ---, ---)';
        coordsDisplay.textContent = '---, ---';
        colourSwatch.style.backgroundColor = '';
    });

    function rgbToHex(r, g, b) {
        return "#" + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }).join("").toUpperCase();
    }

    function colourToFrequency(r, g, b) {
        const brightness = (r + g + b) / 3;
        const minFreq = 100;
        const maxFreq = 1000;
        return (brightness / 255) * (maxFreq - minFreq) + minFreq;
    }
});