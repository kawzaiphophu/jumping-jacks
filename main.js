const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

const counterElement = document.getElementById('counter');
const stateElement = document.getElementById('state');
const resetBtn = document.getElementById('reset-btn');
const toggleVideoBtn = document.getElementById('toggle-video-btn');
const bgm = document.getElementById('bgm');

let count = 0;
let stage = "down";
let jumpTimeout;

function keepPlaying() {
    if (bgm.paused) {
        bgm.play().catch(e => console.log("Audio play error:", e));
    }
    clearTimeout(jumpTimeout);
    jumpTimeout = setTimeout(() => {
        bgm.pause();
    }, 2000); // 2 seconds of no movement stops the music
}

// Reset button functionality
resetBtn.addEventListener('click', () => {
    count = 0;
    stage = "down";
    updateUI();
});

let showVideo = true;

toggleVideoBtn.addEventListener('click', () => {
    showVideo = !showVideo;
    toggleVideoBtn.innerText = showVideo ? "Hide Video" : "Show Video";
});

function updateUI() {
    counterElement.innerText = count;
    stateElement.innerText = `STATE: ${stage.toUpperCase()}`;
    
    if (stage === "up") {
        stateElement.classList.add("up");
    } else {
        stateElement.classList.remove("up");
    }
}

function onResults(results) {
    // Draw background
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Fill with black if no video, otherwise draw video
    if (results.image && showVideo) {
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    } else {
        canvasCtx.fillStyle = '#0f172a';
        canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
    }

    if (results.poseLandmarks) {
        // Draw landmarks
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                       {color: '#ffffff', lineWidth: 2});
        drawLandmarks(canvasCtx, results.poseLandmarks,
                      {color: '#10b981', lineWidth: 2, radius: 3});
                      
        // Logic for Jumping Jacks
        const lm = results.poseLandmarks;
        
        const leftWrist = lm[15]; // LEFT_WRIST
        const rightWrist = lm[16]; // RIGHT_WRIST
        const leftShoulder = lm[11]; // LEFT_SHOULDER
        const rightShoulder = lm[12]; // RIGHT_SHOULDER
        const leftAnkle = lm[27]; // LEFT_ANKLE
        const rightAnkle = lm[28]; // RIGHT_ANKLE
        
        if (leftWrist && rightWrist && leftShoulder && rightShoulder && leftAnkle && rightAnkle) {
            // Arms above shoulders (y goes down from top to bottom)
            const armsUp = (leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y);
            
            // Leg distance
            const legGap = Math.abs(leftAnkle.x - rightAnkle.x);
            
            const legsOpen = legGap > 0.20;
            const legsClosed = legGap < 0.15;
            
            if (armsUp && legsOpen) {
                if (stage !== "up") keepPlaying();
                stage = "up";
                updateUI();
            }
            
            if (stage === "up" && !armsUp && legsClosed) {
                stage = "down";
                count += 1;
                keepPlaying();
                
                // Animation bump
                counterElement.classList.add('bump');
                setTimeout(() => {
                    counterElement.classList.remove('bump');
                }, 150);
                
                updateUI();
            }
        }
    }
    canvasCtx.restore();
}

const pose = new Pose({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});

pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

pose.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await pose.send({image: videoElement});
    },
    width: 1280,
    height: 720
});

camera.start();
