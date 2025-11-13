/**
 * UI Controller Module
 * Manages interface state, transitions, and visual feedback
 */

class UIController {
    constructor() {
        this.currentStep = 1;
        this.beepSound = null;
        this.initializeBeepSound();
    }

    /**
     * Initialize beep sound for completion notification
     */
    initializeBeepSound() {
        // Create a simple beep using Web Audio API
        this.beepSound = () => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        };
    }

    /**
     * Navigate to a specific step
     */
    goToStep(stepNumber) {
        // Hide all steps
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });

        // Show target step
        const targetStep = document.getElementById(`step${stepNumber}`) || 
                          document.getElementById('results');
        if (targetStep) {
            targetStep.classList.add('active');
            this.currentStep = stepNumber;
        }
    }

    /**
     * Update status text
     */
    updateStatus(elementId, message, isError = false) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.color = isError ? '#dc3545' : '#888';
        }
    }

    /**
     * Update progress bar
     */
    updateProgress(percentage) {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }

    /**
     * Animate progress over duration
     */
    animateProgress(durationSeconds) {
        const startTime = Date.now();
        const duration = durationSeconds * 1000;

        const updateProgress = () => {
            const elapsed = Date.now() - startTime;
            const percentage = Math.min((elapsed / duration) * 100, 100);
            
            this.updateProgress(percentage);

            if (percentage < 100) {
                requestAnimationFrame(updateProgress);
            }
        };

        updateProgress();
    }

    /**
     * Play completion beep
     */
    playBeep() {
        if (this.beepSound) {
            try {
                this.beepSound();
            } catch (error) {
                console.warn('Could not play beep sound:', error);
            }
        }
    }

    /**
     * Display results
     */
    displayResults(bpm, waveformData) {
        // Update BPM display
        const bpmValue = document.getElementById('bpmValue');
        if (bpmValue) {
            bpmValue.textContent = bpm;
        }

        // Update result message
        const resultMessage = document.getElementById('resultMessage');
        if (resultMessage) {
            if (bpm >= 40 && bpm <= 200) {
                if (bpm < 60) {
                    resultMessage.textContent = 'Lower than average resting heart rate';
                } else if (bpm <= 100) {
                    resultMessage.textContent = 'Normal resting heart rate range';
                } else {
                    resultMessage.textContent = 'Higher than average resting heart rate';
                }
            } else {
                resultMessage.textContent = 'Reading may be inaccurate - try again with better positioning';
                resultMessage.style.background = '#fff3cd';
                resultMessage.style.color = '#856404';
            }
        }

        // Draw waveform
        this.drawWaveform(waveformData);

        // Navigate to results
        this.goToStep('results');
        
        // Play beep
        this.playBeep();
    }

    /**
     * Draw waveform on canvas
     */
    drawWaveform(data) {
        const canvas = document.getElementById('waveformCanvas');
        if (!canvas || !data || data.length === 0) {
            console.warn('Canvas or data missing:', { canvas: !!canvas, dataLength: data?.length });
            return;
        }

        const ctx = canvas.getContext('2d');
        const width = canvas.offsetWidth || 600;  // Fallback width
        const height = canvas.offsetHeight || 150; // Fallback height
        
        canvas.width = width;
        canvas.height = height;

        // Clear canvas
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, width, height);

        // Draw waveform
        ctx.beginPath();
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;

        // Sample data to fit canvas width
        const step = Math.ceil(data.length / width);
        const sampledData = [];
        
        for (let i = 0; i < data.length; i += step) {
            sampledData.push(data[i]);
        }

        // Draw the waveform
        for (let i = 0; i < sampledData.length; i++) {
            const x = (i / sampledData.length) * width;
            const y = ((sampledData[i] + 1) / 2) * height; // Normalize -1 to 1 -> 0 to height

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();

        // Draw center line
        ctx.beginPath();
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    /**
     * Show error message
     */
    showError(message) {
        alert(`Error: ${message}\n\nPlease try again or check your browser permissions.`);
    }

    /**
     * Reset to initial state
     */
    reset() {
        this.goToStep(1);
        this.updateProgress(0);
        this.updateStatus('micStatus', '');
        this.updateStatus('recordingStatus', 'Recording for 15 seconds...');
        
        const bpmValue = document.getElementById('bpmValue');
        if (bpmValue) {
            bpmValue.textContent = '--';
        }
    }
}
