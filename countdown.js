// --- Countdown Timer & Dynamic Stats ---
// The first presale cycle starts on August 31, 2025, 00:00 Beijing time (UTC+8).
// Each cycle lasts for 72 hours and repeats.
const firstCycleStartTime = new Date('2025-08-31T00:00:00+08:00').getTime();
const CYCLE_DURATION = 72 * 60 * 60 * 1000; 

// Stats configuration (will reset each cycle)
const startParticipants = 12906;
const endParticipants = 291098;
const startProgress = 53.21;
const endProgress = 100;

let lastCycleIndex = -1;

function getCycleInfo() {
    const now = Date.now();
    let cycleStartTime, cycleEndTime;

    if (now < firstCycleStartTime) {
        cycleStartTime = firstCycleStartTime - CYCLE_DURATION;
        cycleEndTime = firstCycleStartTime;
    } else {
        const timeSinceEpoch = now - firstCycleStartTime;
        const cycleIndex = Math.floor(timeSinceEpoch / CYCLE_DURATION);
        
        if (lastCycleIndex !== -1 && cycleIndex > lastCycleIndex) {
            document.getElementById('countdown')?.classList.add('cycle-reset');
            setTimeout(() => document.getElementById('countdown')?.classList.remove('cycle-reset'), 500);
        }
        lastCycleIndex = cycleIndex;

        cycleStartTime = firstCycleStartTime + cycleIndex * CYCLE_DURATION;
        cycleEndTime = cycleStartTime + CYCLE_DURATION;
    }
    return { now, cycleStartTime, cycleEndTime };
}

function updateCountdown() {
    const { now, cycleEndTime } = getCycleInfo();
    const distance = cycleEndTime - now;

    // Update countdown display
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById('days').innerText = (days > 0 ? days : 0).toString().padStart(2, '0');
    document.getElementById('hours').innerText = (hours > 0 ? hours : 0).toString().padStart(2, '0');
    document.getElementById('minutes').innerText = (minutes > 0 ? minutes : 0).toString().padStart(2, '0');
    document.getElementById('seconds').innerText = (seconds > 0 ? seconds : 0).toString().padStart(2, '0');
    
    const sidebarCountdown = document.getElementById('sidebar-countdown');
    if (sidebarCountdown) {
         const totalHours = (days > 0 ? days : 0) * 24 + (hours > 0 ? hours : 0);
         sidebarCountdown.innerText = `${totalHours.toString().padStart(2, '0')}:${(minutes > 0 ? minutes : 0).toString().padStart(2, '0')}:${(seconds > 0 ? seconds : 0).toString().padStart(2, '0')}`;
    }

    if (distance < 0 && now < firstCycleStartTime) {
        document.getElementById('countdown').innerHTML = "<div><span>00</span><small>Days</small></div><div><span>00</span><small>Hours</small></div><div><span>00</span><small>Minutes</small></div><div><span>00</span><small>Seconds</small></div>";
        if (sidebarCountdown) sidebarCountdown.innerText = "00:00:00";
    }
}

function updateStats() {
    const { now, cycleStartTime } = getCycleInfo();

    const elapsedTimeInCycle = now - cycleStartTime;
    const progressRatio = Math.min(elapsedTimeInCycle / CYCLE_DURATION, 1);

    const currentParticipants = Math.round(startParticipants + (endParticipants - startParticipants) * progressRatio);
    document.getElementById('participants-count').innerText = currentParticipants.toLocaleString('en-US');

    const currentProgress = startProgress + (endProgress - startProgress) * progressRatio;
    document.getElementById('progress-bar-fill').style.width = `${Math.min(currentProgress, 100).toFixed(2)}%`;
    document.getElementById('progress-percentage').innerText = `${Math.min(currentProgress, 100).toFixed(2)}%`;
    
    const totalTokens = 100000000000;
    const soldTokens = Math.round(totalTokens * (Math.min(currentProgress, 100) / 100));
    const soldTokensEl = document.getElementById('sold-tokens');
    if (soldTokensEl) soldTokensEl.innerText = soldTokens.toLocaleString('en-US');

    const totalTokensEl = document.getElementById('total-tokens');
    if (totalTokensEl) {
        totalTokensEl.innerText = totalTokens.toLocaleString('en-US');
    }
}

export function initCountdown() {
    updateCountdown();
    updateStats();
    setInterval(updateCountdown, 1000);
    setInterval(updateStats, 10000);
}