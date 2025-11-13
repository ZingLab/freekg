/**
 * Audio Processor Module
 * Handles microphone access, recording, and signal processing
 */

class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.mediaStream = null;
        this.analyser = null;
        this.dataArray = null;
        this.recordingData = [];
        this.isRecording = false;
        this.sampleRate = 44100;
        this.scriptProcessor = null;
        this.cachedAudioBuffer = null; // For debugging
    }

    /**
     * Request microphone access
     */
    async requestMicrophone() {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    /**
     * Initialize audio context and analyser
     */
    initializeAudioContext() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.sampleRate = this.audioContext.sampleRate;
        
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.3;
        
        source.connect(this.analyser);
        
        // Use ScriptProcessor for actual sample-rate recording
        this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
        this.analyser.connect(this.scriptProcessor);
        this.scriptProcessor.connect(this.audioContext.destination);
        
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    /**
     * Start recording audio data at proper sample rate
     */
    startRecording(durationSeconds = 15) {
        if (!this.audioContext) {
            this.initializeAudioContext();
        }

        this.recordingData = [];
        this.isRecording = true;

        return new Promise((resolve) => {
            // Use the scriptProcessor to capture raw PCM data
            this.scriptProcessor.onaudioprocess = (event) => {
                if (!this.isRecording) return;

                const inputData = event.inputBuffer.getChannelData(0);
                
                // Store the actual audio samples (float32)
                this.recordingData.push(...Array.from(inputData));
                
                console.log(`Recording: ${(this.recordingData.length / this.sampleRate).toFixed(1)}s`);
            };

            // Stop recording after specified duration
            setTimeout(() => {
                this.stopRecording();
                console.log(`Total samples recorded: ${this.recordingData.length}`);
                console.log(`Duration: ${(this.recordingData.length / this.sampleRate).toFixed(2)}s`);
                
                // Cache for debugging - convert to WAV and allow download
                this.createAudioCache();
                
                resolve(this.recordingData);
            }, durationSeconds * 1000);
        });
    }

    /**
     * Create downloadable audio cache for debugging
     */
    createAudioCache() {
        if (this.recordingData.length === 0) return;

        // Convert float32 array to wav blob
        const wavBlob = this.encodeWAV(this.recordingData, this.sampleRate);
        const url = URL.createObjectURL(wavBlob);
        
        // Store for potential download
        this.cachedAudioBuffer = {
            url: url,
            blob: wavBlob,
            duration: this.recordingData.length / this.sampleRate,
            sampleRate: this.sampleRate,
            samples: this.recordingData.length
        };

        console.log('Audio cached - download link:', url);
        console.log('Cache info:', this.cachedAudioBuffer);

        // Optional: Create download button for debugging
        this.addDownloadButton(url);
    }

    /**
     * Encode raw PCM data to WAV format
     */
    encodeWAV(samples, sampleRate) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);
        
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, samples.length * 2, true);

        let offset = 44;
        for (let i = 0; i < samples.length; i++) {
            view.setInt16(offset, Math.max(-1, Math.min(1, samples[i])) * 0x7FFF, true);
            offset += 2;
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }

    /**
     * Add download button to UI for debugging
     */
    addDownloadButton(url) {
        let downloadBtn = document.getElementById('downloadAudioBtn');
        if (!downloadBtn) {
            downloadBtn = document.createElement('button');
            downloadBtn.id = 'downloadAudioBtn';
            downloadBtn.textContent = '🔊 Download Recording (Debug)';
            downloadBtn.style.cssText = 'display:block; margin:10px auto; padding:10px 20px; background:#999; color:white; border:none; border-radius:5px; cursor:pointer;';
            document.querySelector('main').appendChild(downloadBtn);
        }
        
        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = url;
            a.download = `freekg-recording-${Date.now()}.wav`;
            a.click();
        };
    }

    /**
     * Stop recording
     */
    stopRecording() {
        this.isRecording = false;
        if (this.scriptProcessor) {
            this.scriptProcessor.onaudioprocess = null;
        }
    }

    /**
     * Apply bandpass filter to isolate heart rate frequencies
     */
    bandpassFilter(data) {
        // Data is already float32 (-1 to 1 range)
        const normalized = data.map(val => 
            typeof val === 'number' ? val : (val - 128) / 128
        );

        // Simple moving average to remove high frequency noise
        const windowSize = 20;
        const smoothed = [];
        
        for (let i = 0; i < normalized.length; i++) {
            let sum = 0;
            let count = 0;
            
            for (let j = Math.max(0, i - windowSize); j <= Math.min(normalized.length - 1, i + windowSize); j++) {
                sum += normalized[j];
                count++;
            }
            
            smoothed.push(sum / count);
        }

        return smoothed;
    }

    /**
     * Detect heart rate from filtered audio data
     */
    detectHeartRate(data) {
        const filtered = this.bandpassFilter(data);
        
        // Find peaks in the signal
        const peaks = this.findPeaks(filtered);
        
        console.log(`Peaks found: ${peaks.length}`, peaks.slice(0, 10));

        if (peaks.length < 2) {
            return { bpm: 0, confidence: 'low', peaks: [] };
        }

        // Calculate intervals between peaks (in samples)
        const intervals = [];
        for (let i = 1; i < peaks.length; i++) {
            intervals.push(peaks[i] - peaks[i - 1]);
        }

        // Calculate average interval in samples
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        
        // Convert to BPM: (samples per beat / samples per second) * 60
        const bpm = Math.round((60 * this.sampleRate) / (avgInterval));

        console.log(`Average interval: ${avgInterval.toFixed(2)} samples`);
        console.log(`Calculated BPM: ${bpm}`);

        // Validate BPM is in reasonable range (40-200)
        const confidence = (bpm >= 40 && bpm <= 200) ? 'high' : 'low';

        return {
            bpm: Math.max(40, Math.min(200, bpm)),
            confidence: confidence,
            peaks: peaks,
            waveform: filtered
        };
    }

    /**
     * Find peaks in signal data
     */
    findPeaks(data) {
        const peaks = [];
        const threshold = 0.01;
        const minDistance = Math.floor(this.sampleRate / 10); // At least 0.1s between peaks

        for (let i = 1; i < data.length - 1; i++) {
            if (data[i] > data[i - 1] && 
                data[i] > data[i + 1] && 
                data[i] > threshold) {
                
                if (peaks.length === 0 || i - peaks[peaks.length - 1] > minDistance) {
                    peaks.push(i);
                }
            }
        }

        return peaks;
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.scriptProcessor) {
            this.scriptProcessor.disconnect();
            this.scriptProcessor.onaudioprocess = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}
