import { initUI, initFooterFormInteraction } from './ui.js';
import { initCountdown } from './countdown.js';
import { initPresaleConverter } from './presale.js';
import { translations } from './translations.js';

/* @tweakable The destination wallet address for direct transfers */
const DESTINATION_WALLET = "C2n9YYisQ7CrVCzeUVAv8TtVx8pcdf5LywFAwJWkgER4";

/* --- DOM Ready --- */
function initializeApp() {
    initUI();
    initCountdown();
    initPresaleConverter();
    initFooterFormInteraction();

    // Populate the destination wallet address in the modal
    const transferAddressEl = document.getElementById('transfer-address');
    if (transferAddressEl) {
        transferAddressEl.textContent = DESTINATION_WALLET;
    }

    // Set up modal trigger buttons
    const heroBuyBtn = document.getElementById('hero-buy-btn');
    const presaleBuyBtn = document.getElementById('presale-buy-btn');
    const modal = document.getElementById('transfer-modal');

    const openModal = () => {
        if (modal) modal.classList.remove('hidden');
    };

    if (heroBuyBtn) {
        heroBuyBtn.addEventListener('click', openModal);
    }
    if (presaleBuyBtn) {
        presaleBuyBtn.addEventListener('click', openModal);
    }
}

document.addEventListener("DOMContentLoaded", initializeApp);