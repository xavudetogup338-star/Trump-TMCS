import { translations } from './translations.js';

function translatePage(lang) {
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        if (translations[lang] && translations[lang][key]) {
            const translation = translations[lang][key];
            if (el.hasAttribute('data-translate-placeholder')) {
                el.placeholder = translation;
            } else if (key === 'presale_tokens_sold') {
                const soldTokensEl = document.getElementById('sold-tokens');
                const soldTokensCount = soldTokensEl ? soldTokensEl.innerText : '0';
                el.innerHTML = `<span id="sold-tokens">${soldTokensCount}</span> ${translation}`;
            } else {
                el.innerHTML = translation;
            }
        }
    });

    // Handle data-translate-aria-label attributes
    document.querySelectorAll('[data-translate-aria-label]').forEach(el => {
        const key = el.getAttribute('data-translate-aria-label');
        if (translations[lang] && translations[lang][key]) {
            el.setAttribute('aria-label', translations[lang][key]);
        }
    });

    // Special case for badge icons (if they were still used)
    document.querySelectorAll('.badge i').forEach(iconEl => {
        const parent = iconEl.parentElement;
        if (parent.hasAttribute('data-translate')) {
             parent.prepend(iconEl);
        }
    });
    // Special case for footer item icons (if they were still used)
    document.querySelectorAll('.footer-item i').forEach(iconEl => {
        const p = iconEl.parentElement;
         if (p.hasAttribute('data-translate')) {
            p.append(iconEl);
        }
    });
    document.querySelectorAll('.footer-item p:first-child').forEach(pEl => {
        const strong = pEl.querySelector('strong');
        const button = pEl.querySelector('button');
        if (strong && button) {
            pEl.innerHTML = '';
            pEl.appendChild(strong);
            pEl.appendChild(button);
        }
    });
}

function initHeaderScroll() {
    const header = document.getElementById('main-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

function initMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const body = document.querySelector('body');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-overlay a');
    
    if (!mobileMenuToggle || !body) return;

    mobileMenuToggle.addEventListener('click', () => {
        body.classList.toggle('menu-open');
    });

    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            body.classList.remove('menu-open');
        });
    });
}

function initLanguageSwitcher() {
    const languageSwitcher = document.querySelector('.language-switcher');
    if (!languageSwitcher) return;
    
    const langBtn = languageSwitcher.querySelector('.lang-btn');
    const langOptions = languageSwitcher.querySelectorAll('.lang-dropdown li');
    const langBtnText = langBtn.querySelector('span');

    langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        languageSwitcher.classList.toggle('open');
    });

    langOptions.forEach(option => {
        option.addEventListener('click', () => {
            const selectedLang = option.getAttribute('data-lang');
            langBtnText.textContent = selectedLang.substring(0, 2).toUpperCase();
            languageSwitcher.classList.remove('open');
            translatePage(selectedLang);
        });
    });

    document.addEventListener('click', (e) => {
        if (!languageSwitcher.contains(e.target)) {
            languageSwitcher.classList.remove('open');
        }
    });
}

function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            const currentlyActive = document.querySelector('.faq-item.active');
            if (currentlyActive && currentlyActive !== item) {
                currentlyActive.classList.remove('active');
                currentlyActive.querySelector('.faq-answer').style.maxHeight = 0;
            }

            item.classList.toggle('active');
            const answer = item.querySelector('.faq-answer');
            if (item.classList.contains('active')) {
                answer.style.maxHeight = answer.scrollHeight + 'px';
            } else {
                answer.style.maxHeight = 0;
            }
        });
    });
}

function initCopyButtons() {
    const copyConfigs = [
        { buttonId: 'copy-tech-stack-contract', targetId: 'tech-stack-contract-address' }
    ];

    copyConfigs.forEach(config => {
        const copyBtn = document.getElementById(config.buttonId);
        
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                let textToCopy = config.text;
                if (!textToCopy && config.targetId) {
                    const targetEl = document.getElementById(config.targetId);
                    if (targetEl) {
                        textToCopy = targetEl.textContent.trim();
                    }
                }

                if (textToCopy) {
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        const originalIcon = copyBtn.innerHTML;
                        copyBtn.innerHTML = '<i data-feather="check"></i>';
                        feather.replace({ width: 16, height: 16 });
                        copyBtn.classList.add('copied');
                        
                        setTimeout(() => {
                            copyBtn.innerHTML = originalIcon;
                            feather.replace({ width: 16, height: 16 });
                            copyBtn.classList.remove('copied');
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy: ', err);
                    });
                }
            });
        }
    });
}

function initTransferModal() {
    const modal = document.getElementById('transfer-modal');
    const openBtn = document.getElementById('transfer-purchase-btn');
    const closeBtn = document.getElementById('transfer-modal-close');
    const copyBtn = document.getElementById('copy-transfer-address');
    const addressEl = document.getElementById('transfer-address');

    if (!modal || !openBtn || !closeBtn || !copyBtn || !addressEl) return;

    const openModal = () => modal.classList.remove('hidden');
    const closeModal = () => modal.classList.add('hidden');

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    copyBtn.addEventListener('click', () => {
        const address = addressEl.textContent.trim();
        navigator.clipboard.writeText(address).then(() => {
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i data-feather="check"></i>';
            feather.replace({ width: 16, height: 16 });
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
                feather.replace({ width: 16, height: 16 });
                copyBtn.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy transfer address: ', err);
        });
    });
}

function initMobileWalletNoticeModal() {
    const modal = document.getElementById('mobile-wallet-notice');
    if (!modal) return;
    
    const closeBtn = document.getElementById('mobile-wallet-notice-close');
    const copyBtn = document.getElementById('copy-website-url');
    const urlEl = document.getElementById('website-url-display');

    const closeModal = () => modal.classList.add('hidden');

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    copyBtn.addEventListener('click', () => {
        const urlToCopy = urlEl.textContent.trim();
        navigator.clipboard.writeText(urlToCopy).then(() => {
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i data-feather="check"></i>';
            feather.replace({ width: 16, height: 16 });
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
                feather.replace({ width: 16, height: 16 });
                copyBtn.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy URL: ', err);
        });
    });
}

function initMarqueeInteraction() {
    const marqueeTrack = document.querySelector('.marquee-track');
    if (!marqueeTrack) return;

    // Handle touch events for mobile
    let touchStarted = false;

    marqueeTrack.addEventListener('touchstart', () => {
        touchStarted = true;
        marqueeTrack.style.animationPlayState = 'paused';
    });

    marqueeTrack.addEventListener('touchend', () => {
        if (touchStarted) {
            marqueeTrack.style.animationPlayState = 'running';
            touchStarted = false;
        }
    });

    // Ensure animation resumes if touch is cancelled
    marqueeTrack.addEventListener('touchcancel', () => {
        if (touchStarted) {
            marqueeTrack.style.animationPlayState = 'running';
            touchStarted = false;
        }
    });
}

// New function for footer form interaction
export function initFooterFormInteraction() {
    const subscribeInput = document.getElementById('email-subscribe');
    const inputWrapper = subscribeInput?.parentElement;
    const subscribeForm = document.getElementById('subscribe-form');

    if (subscribeInput && inputWrapper && subscribeForm) {
        subscribeInput.addEventListener('focus', () => {
            inputWrapper.classList.add('is-focused');
        });
        subscribeInput.addEventListener('blur', () => {
            inputWrapper.classList.remove('is-focused');
        });

        subscribeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Subscribed email:', subscribeInput.value);
            // Optional: clear input and provide feedback
            subscribeInput.value = '';
            alert('Thank you for subscribing to Trump Media Group CRO Strategy updates!');
        });
    }
}

export function initUI() {
    initHeaderScroll();
    initMobileMenu();
    initLanguageSwitcher();
    initFaqAccordion();
    initCopyButtons();
    initTransferModal();
    initMarqueeInteraction();
    initMobileWalletNoticeModal();
    
    // As wallet connection is removed, ensure "Connect Wallet" buttons are static.
    // They will inherit their default `data-translate` text.
    // Their `addEventListener`s are removed by the deletion of wallet.js.
}