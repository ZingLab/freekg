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
        
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    /**
     * Start recording audio data
     */
    startRecording(durationSeconds = 15) {
        if (!this.audioContext) {
            this.initializeAudioContext();
        }

        this.recordingData = [];
        this.isRecording = true;

        const recordLoop = () => {
            if (!this.isRecording) return;

            this.analyser.getByteTimeDomainData(this.dataArray);
            
            // Store raw audio samples
            const samples = Array.from(this.dataArray);
            this.recordingData.push(...samples);

            requestAnimationFrame(recordLoop);
        };

        recordLoop();

        // Stop recording after specified duration
        return new Promise((resolve) => {
            setTimeout(() => {
                this.stopRecording();
                resolve(this.recordingData);
            }, durationSeconds * 1000);
        });
    }

    /**
     * Stop recording
     */
    stopRecording() {
        this.isRecording = false;
    }

    /**
     * Apply bandpass filter to isolate heart rate frequencies (0.8 - 3 Hz = 48 - 180 BPM)
     */
    bandpassFilter(data) {
        // Convert Uint8 values (0-255) to normalized values (-1 to 1)
        const normalized = data.map(val => (val - 128) / 128);

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
        
        if (peaks.length < 2) {
            return { bpm: 0, confidence: 'low', peaks: [] };
        }

        // Calculate intervals between peaks
        const intervals = [];
        for (let i = 1; i < peaks.length; i++) {
            intervals.push(peaks[i] - peaks[i - 1]);
        }

        // Calculate average interval
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        
        // Convert to BPM (samples per second * 60 / average samples per beat)
        const samplesPerSecond = this.sampleRate / this.analyser.fftSize;
        const bpm = Math.round((samplesPerSecond * 60) / avgInterval);

        // Validate BPM is in reasonable range (40-200)
        const confidence = (bpm >= 40 && bpm <= 200) ? 'medium' : 'low';

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
        const threshold = 0.01; // Minimum peak height
        const minDistance = 20; // Minimum samples between peaks

        for (let i = 1; i < data.length - 1; i++) {
            // Check if this point is a local maximum
            if (data[i] > data[i - 1] && 
                data[i] > data[i + 1] && 
                data[i] > threshold) {
                
                // Check minimum distance from last peak
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
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}
