document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration & State ---
    const CONFIG = {
        canvasWidth: 2000,
        canvasHeight: 1157
    };

    const state = {
        toneMode: 'colour',
        waveform: 'sine',
        volume: -10,
        scale: Tonal.Scale.get('C major').notes,
        canvasReady: false,
        oscillator: null
    };

    // --- UI Elements ---
    const UI = {
        imageContainer: document.querySelector('.image-container'),
        hexDisplay: document.getElementById('hexValue'),
        rgbDisplay: document.getElementById('rgbValue'),
        coordsDisplay: document.getElementById('coordsValue'),
        colourSwatch: document.getElementById('colourSwatch'),
        uploadBtn: document.getElementById('uploadBtn'),
        fileInput: document.getElementById('fileInput'),
        randomImageBtn: document.getElementById('randomImageBtn'),
        randomToneBtn: document.getElementById('randomToneBtn'),
        btnColourMode: document.getElementById('btnColourMode'),
        btnCoordMode: document.getElementById('btnCoordMode'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        toneOverlay: document.getElementById('toneOverlay'),
        visualizerCanvas: document.getElementById('visualizer'),
        settingsBtn: document.getElementById('settingsBtn'),
        settingsPanel: document.getElementById('settingsPanel'),
        volSlider: document.getElementById('volSlider'),
        waveSelect: document.getElementById('waveSelect'),
        scaleSelect: document.getElementById('scaleSelect'),
        delaySlider: document.getElementById('delaySlider'),
        reverbSlider: document.getElementById('reverbSlider')
    };

    // Verify all elements exist
    const missingElements = Object.entries(UI).filter(([k, v]) => !v);
    if (missingElements.length > 0) {
        console.error('Initialisation failed. Missing:', missingElements.map(([k]) => k).join(', '));
        return;
    }

    // --- Audio Engine ---
    const Audio = {
        waveform: new Tone.Waveform(64),
        feedbackDelay: new Tone.FeedbackDelay("8n", 0.5).toDestination(),
        reverb: new Tone.Reverb({ decay: 1.5, preDelay: 0.01, wet: 0.5 }).toDestination(),

        init() {
            this.feedbackDelay.wet.value = 0;
            this.reverb.generate();
        },

        async startContext() {
            if (Tone.context.state !== 'running') {
                await Tone.start();
            }
        },

        createOscillator() {
            if (state.oscillator) return state.oscillator;
            
            const osc = new Tone.Oscillator({
                type: state.waveform,
                frequency: 440,
                volume: state.volume
            });
            osc.connect(this.waveform);
            osc.connect(this.feedbackDelay);
            osc.connect(this.reverb);
            osc.start();
            state.oscillator = osc;
            return osc;
        },

        stopOscillator() {
            if (state.oscillator) {
                state.oscillator.stop();
                state.oscillator.dispose();
                state.oscillator = null;
            }
        },

        async playRandomNote(ctx, canvas) {
            if (!state.canvasReady) return;
            await this.startContext();

            const x = Math.floor(Math.random() * canvas.width);
            const y = Math.floor(Math.random() * canvas.height);

            let freq;
            if (state.toneMode === 'coordinate') {
                const noteIndex = Math.floor((x / canvas.width) * state.scale.length);
                const note = state.scale[noteIndex % state.scale.length];
                const octave = Math.round(6 - (y / canvas.height) * 4);
                freq = Tonal.Note.freq(`${note}${octave}`);
            } else {
                const pixel = ctx.getImageData(x, y, 1, 1).data;
                freq = this.colourToFrequency(pixel[0], pixel[1], pixel[2]);
            }

            if (freq) {
                const synth = new Tone.MonoSynth({
                    oscillator: { type: state.waveform },
                    envelope: { attack: 0.1, decay: 0.2, sustain: 0.3, release: 0.8 }
                }).connect(this.waveform).connect(this.feedbackDelay).connect(this.reverb);
                
                synth.volume.value = state.volume;
                synth.triggerAttackRelease(freq, "8n");
                setTimeout(() => synth.dispose(), 2000);
            }
        },

        async playRandomSequence(ctx, canvas, useOverlay = true) {
            if (useOverlay) UI.toneOverlay.classList.remove('hidden');
            for (let i = 0; i < 4; i++) {
                this.playRandomNote(ctx, canvas);
                await new Promise(r => setTimeout(r, 200));
            }
            if (useOverlay) UI.toneOverlay.classList.add('hidden');
        },

        colourToFrequency(r, g, b) {
            const brightness = (r + g + b) / 3;
            return (brightness / 255) * (1000 - 100) + 100;
        }
    };

    Audio.init();

    // --- Image Engine ---
    const ImageEngine = {
        canvas: document.createElement('canvas'),
        ctx: null,
        img: new Image(),
        colorThief: new ColorThief(),
        isCustomUpload: false,

        init() {
            this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
            this.img.crossOrigin = "Anonymous";

            const container = document.createElement('div');
            container.classList.add('canvas-container');
            container.appendChild(this.canvas);
            UI.imageContainer.appendChild(container);

            this.img.onload = () => this.onLoad();
            this.img.onerror = () => this.onError();
            this.load('images/cosmic_tarantula.png');
        },

        load(src, isUpload = false) {
            state.canvasReady = false;
            this.isCustomUpload = isUpload;
            UI.loadingOverlay.classList.remove('hidden');
            this.img.src = src;
        },

        onLoad() {
            if (this.isCustomUpload) {
                // Resize canvas to match uploaded image dimensions (capped at 2000px)
                const maxDim = 2000;
                const scale = Math.min(1, maxDim / Math.max(this.img.width, this.img.height));
                this.canvas.width = Math.round(this.img.width * scale);
                this.canvas.height = Math.round(this.img.height * scale);
            } else {
                // Use default CONFIG dimensions for internal/random images
                this.canvas.width = CONFIG.canvasWidth;
                this.canvas.height = CONFIG.canvasHeight;
            }

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.img, 0, 0, this.canvas.width, this.canvas.height);
            
            state.canvasReady = true;
            UI.loadingOverlay.classList.add('hidden');
            
            try {
                if (this.img.complete && this.img.width > 0) {
                    const dominantColour = this.colorThief.getColor(this.img);
                    const rgbString = `rgb(${dominantColour[0]}, ${dominantColour[1]}, ${dominantColour[2]})`;
                    UI.randomImageBtn.style.backgroundColor = rgbString;
                    const yiq = ((dominantColour[0] * 299) + (dominantColour[1] * 587) + (dominantColour[2] * 114)) / 1000;
                    UI.randomImageBtn.style.color = (yiq >= 128) ? '#000' : '#fff';
                }
            } catch (e) {
                console.warn("Colour extraction failed:", e);
            }
            
            Audio.playRandomSequence(this.ctx, this.canvas, false);
        },

        onError() {
            UI.loadingOverlay.classList.add('hidden');
            alert("Failed to load image. Please try again.");
        }
    };

    ImageEngine.init();

    // --- Visualizer ---
    function drawVisualizer() {
        requestAnimationFrame(drawVisualizer);
        const buffer = Audio.waveform.getValue();
        const visCtx = UI.visualizerCanvas.getContext('2d');
        visCtx.clearRect(0, 0, UI.visualizerCanvas.width, UI.visualizerCanvas.height);
        visCtx.beginPath();
        visCtx.lineJoin = 'round';
        visCtx.lineWidth = 2;
        visCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#ef4444'; 
        
        if (buffer.length > 0) {
            const sliceWidth = UI.visualizerCanvas.width / buffer.length;
            let x = 0;
            for (let i = 0; i < buffer.length; i++) {
                const y = (buffer[i] + 1) / 2 * UI.visualizerCanvas.height;
                i === 0 ? visCtx.moveTo(x, y) : visCtx.lineTo(x, y);
                x += sliceWidth;
            }
        }
        visCtx.stroke();
    }
    drawVisualizer();

    // --- Helper Functions ---
    function rgbToHex(r, g, b) {
        return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join("").toUpperCase();
    }

    function randomiseSettings() {
        const waveforms = ['sine', 'triangle', 'square', 'sawtooth'];
        state.waveform = waveforms[Math.floor(Math.random() * waveforms.length)];
        UI.waveSelect.value = state.waveform;

        const scaleOptions = Array.from(UI.scaleSelect.options).map(opt => opt.value);
        const randomScaleName = scaleOptions[Math.floor(Math.random() * scaleOptions.length)];
        UI.scaleSelect.value = randomScaleName;
        state.scale = Tonal.Scale.get(randomScaleName === 'chromatic' ? 'C chromatic' : randomScaleName).notes;

        const randomDelay = (Math.random() * 0.8).toFixed(1);
        UI.delaySlider.value = randomDelay;
        Audio.feedbackDelay.wet.value = parseFloat(randomDelay);

        const randomReverb = (Math.random() * 8).toFixed(1);
        UI.reverbSlider.value = randomReverb;
        Audio.reverb.decay = parseFloat(randomReverb);
        Audio.reverb.generate();
    }

    // --- Event Listeners ---
    UI.uploadBtn.addEventListener('click', () => UI.fileInput.click());

    UI.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                ImageEngine.load(event.target.result, true);
                UI.fileInput.value = ''; // Reset for same file re-upload
            };
            reader.readAsDataURL(file);
        }
    });

    UI.randomImageBtn.addEventListener('click', () => {
        const randomId = Math.floor(Math.random() * 1000);
        ImageEngine.load(`https://picsum.photos/${CONFIG.canvasWidth}/${CONFIG.canvasHeight}?random=${randomId}`);
    });

    UI.randomToneBtn.addEventListener('click', () => {
        randomiseSettings();
        Audio.playRandomSequence(ImageEngine.ctx, ImageEngine.canvas, true);
    });

    UI.settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        UI.settingsPanel.classList.toggle('hidden');
        UI.settingsBtn.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!UI.settingsPanel.classList.contains('hidden') && !UI.settingsPanel.contains(e.target) && e.target !== UI.settingsBtn) {
            UI.settingsPanel.classList.add('hidden');
            UI.settingsBtn.classList.remove('active');
        }
    });

    UI.delaySlider.addEventListener('input', (e) => Audio.feedbackDelay.wet.value = parseFloat(e.target.value));
    UI.reverbSlider.addEventListener('input', (e) => {
        Audio.reverb.decay = parseFloat(e.target.value);
        Audio.reverb.generate();
    });
    UI.volSlider.addEventListener('input', (e) => {
        state.volume = parseFloat(e.target.value);
        if (state.oscillator) state.oscillator.volume.rampTo(state.volume, 0.1);
    });
    UI.waveSelect.addEventListener('change', (e) => {
        state.waveform = e.target.value;
        if (state.oscillator) state.oscillator.type = state.waveform;
    });
    UI.scaleSelect.addEventListener('change', (e) => {
        const name = e.target.value;
        state.scale = Tonal.Scale.get(name === 'chromatic' ? 'C chromatic' : name).notes;
    });

    UI.btnColourMode.addEventListener('click', () => {
        state.toneMode = 'colour';
        UI.btnColourMode.classList.add('active');
        UI.btnCoordMode.classList.remove('active');
        Audio.playRandomSequence(ImageEngine.ctx, ImageEngine.canvas, false);
    });

    UI.btnCoordMode.addEventListener('click', () => {
        state.toneMode = 'coordinate';
        UI.btnCoordMode.classList.add('active');
        UI.btnColourMode.classList.remove('active');
        Audio.playRandomSequence(ImageEngine.ctx, ImageEngine.canvas, false);
    });

    ImageEngine.canvas.addEventListener('mouseenter', async () => {
        await Audio.startContext();
        Audio.createOscillator();
    });

    ImageEngine.canvas.addEventListener('mousemove', async (e) => {
        if (!state.canvasReady) return;
        await Audio.startContext();
        const osc = Audio.createOscillator();

        const rect = ImageEngine.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) * (ImageEngine.canvas.width / rect.width));
        const y = Math.floor((e.clientY - rect.top) * (ImageEngine.canvas.height / rect.height));

        UI.coordsDisplay.textContent = `${x}, ${y}`;
        const pixel = ImageEngine.ctx.getImageData(x, y, 1, 1).data;
        const [r, g, b] = pixel;

        UI.rgbDisplay.textContent = `(${r}, ${g}, ${b})`;
        const hex = rgbToHex(r, g, b);
        UI.hexDisplay.textContent = hex;
        UI.colourSwatch.style.backgroundColor = hex;

        let freq;
        if (state.toneMode === 'coordinate') {
            const noteIndex = Math.floor((x / ImageEngine.canvas.width) * state.scale.length);
            const note = state.scale[noteIndex % state.scale.length];
            const octave = Math.round(6 - (y / ImageEngine.canvas.height) * 4);
            freq = Tonal.Note.freq(`${note}${octave}`);
        } else {
            freq = Audio.colourToFrequency(r, g, b);
        }

        if (freq) osc.frequency.rampTo(freq, 0.05);
    });

    ImageEngine.canvas.addEventListener('mouseleave', () => {
        Audio.stopOscillator();
        UI.hexDisplay.textContent = '#------';
        UI.rgbDisplay.textContent = '(---, ---, ---)';
        UI.coordsDisplay.textContent = '---, ---';
        UI.colourSwatch.style.backgroundColor = '';
    });
});