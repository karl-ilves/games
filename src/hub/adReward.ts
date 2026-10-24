import { yardService } from '../shared/yardService';
import { getAdvertisedGames, AdvertisedGame } from '../shared/advertisedGames';

export function setupAdRewardModal() {
    const btnWatchAd = document.getElementById('btn-watch-ad-pbx');
    const modalBuyPbx = document.getElementById('modal-buy-playbux');
    const modalAdPlayer = document.getElementById('modal-ad-player');
    const btnCloseAd = document.getElementById('btn-close-ad-player') as HTMLButtonElement | null;
    const timerTextEl = document.getElementById('ad-timer-text');
    const closeCountdownEl = document.getElementById('ad-close-countdown');
    const progressBar = document.getElementById('ad-progress-bar');
    const slideContainer = document.getElementById('ad-screen-slide');
    const celebrationContainer = document.getElementById('ad-reward-celebration');
    const slideIcon = document.getElementById('ad-slide-icon');
    const slideTitle = document.getElementById('ad-slide-title');
    const slideSubtitle = document.getElementById('ad-slide-subtitle');
    const slideFeaturePill = document.getElementById('ad-slide-feature-pill');
    const footerStatus = document.getElementById('ad-footer-status');

    if (!btnWatchAd || !modalAdPlayer) return;

    let countdownInterval: any = null;
    let slideInterval: any = null;
    let isAdFinished = false;

    const AD_SLIDES = [
        {
            icon: '🏎️',
            title: '3D City Car & Racing Simulator',
            subtitle: 'Kihuta tänavatel, tuuni superautosid ja tee trikke!',
            pill: '🚗 3D Füüsika · ⚡ Nitrokiirendus · 🌃 Öine linn'
        },
        {
            icon: '⚔️',
            title: 'MMP1 Multi-Map Battle Arena',
            subtitle: 'Võitle teiste mängijatega ja ava legendaarsed kastid!',
            pill: '🛡️ Relvad & Soomused · 👑 Top edetabel · 💥 Reaalajas multiplayer'
        },
        {
            icon: '🚇',
            title: 'Last Metro 3D Survival',
            subtitle: 'Ela üle hirmutav teekond pimedas metroorongis!',
            pill: '🔦 Taskulamp & Mõõk · 👁️ Varjatud olendid · 🔊 Ruumiline heli'
        },
        {
            icon: '✈️',
            title: '3D Flight Simulator & F-22 Fighter',
            subtitle: 'Tõuse õhku, lenda läbi trikirõngaste ja maandu lennujaamas!',
            pill: '🛩️ Aerodünaamika · 🕹️ Autopiloot · ☁️ Suur avatud maailm'
        },
        {
            icon: '💎',
            title: 'Playard 3D Avatar Shop & Emoted',
            subtitle: 'Loo kordumatu tegelane, osta esemeid ja tantsi!',
            pill: '🎩 280+ Eset · 🕺 Liikumisstiilid · 🎁 Päevased boonused'
        }
    ];

    const finishAdReward = () => {
        if (isAdFinished) return;
        isAdFinished = true;
        clearInterval(countdownInterval);
        clearInterval(slideInterval);

        if (timerTextEl) timerTextEl.textContent = '0s';
        if (closeCountdownEl) closeCountdownEl.textContent = '0';
        if (progressBar) progressBar.style.width = '100%';

        if (slideContainer) slideContainer.style.display = 'none';
        if (celebrationContainer) celebrationContainer.style.display = 'flex';

        if (footerStatus) {
            footerStatus.innerHTML = '🎉 Auhind välja antud: <strong style="color: #2ecc71;">+15 PBX lisatud!</strong>';
        }

        // Award +15 PBX
        const newTotal = yardService.addYards(15, '20-sekundiline reklaam: +15 PBX');
        window.dispatchEvent(new CustomEvent('playard_yards_updated', { detail: { yards: newTotal } }));

        if (btnCloseAd) {
            btnCloseAd.disabled = false;
            btnCloseAd.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
            btnCloseAd.style.color = '#0b1118';
            btnCloseAd.style.borderColor = '#2ecc71';
            btnCloseAd.style.boxShadow = '0 4px 15px rgba(46, 204, 113, 0.4)';
            btnCloseAd.style.cursor = 'pointer';
            btnCloseAd.innerHTML = '✅ Võta vastu +15 PBX ja Sule';
        }
    };

    const startAdPlayback = () => {
        if (modalBuyPbx) modalBuyPbx.style.display = 'none';
        modalAdPlayer.style.display = 'flex';
        isAdFinished = false;

        let timeLeft = 20;
        let slideIndex = 0;

        const advertisedGames = getAdvertisedGames();
        let activeSponsoredGame: AdvertisedGame | null = null;

        if (advertisedGames.length === 1) {
            activeSponsoredGame = advertisedGames[0];
        } else if (advertisedGames.length > 1) {
            const randIdx = Math.floor(Math.random() * advertisedGames.length);
            activeSponsoredGame = advertisedGames[randIdx];
        }

        if (slideContainer) slideContainer.style.display = 'flex';
        if (celebrationContainer) celebrationContainer.style.display = 'none';
        if (progressBar) progressBar.style.width = '0%';
        if (timerTextEl) timerTextEl.textContent = '20s';
        if (closeCountdownEl) closeCountdownEl.textContent = '20';
        if (footerStatus) {
            footerStatus.innerHTML = 'Vaata reklaam lõpuni, et saada auhind: <strong style="color: #2ecc71;">+15 PBX</strong>';
        }

        if (btnCloseAd) {
            btnCloseAd.disabled = true;
            btnCloseAd.style.background = 'rgba(255, 255, 255, 0.06)';
            btnCloseAd.style.color = '#718093';
            btnCloseAd.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            btnCloseAd.style.boxShadow = 'none';
            btnCloseAd.style.cursor = 'not-allowed';
            btnCloseAd.innerHTML = '🔒 Reklaami saab sulgeda: <span id="ad-close-countdown">20</span>s';
        }

        const updateSlideUI = () => {
            if (activeSponsoredGame) {
                if (slideIcon) {
                    if (activeSponsoredGame.thumbnail) {
                        slideIcon.innerHTML = `<img src="${activeSponsoredGame.thumbnail}" alt="${activeSponsoredGame.title}" style="width: 140px; height: 90px; object-fit: cover; border-radius: 10px; border: 1.5px solid #ffd32a; box-shadow: 0 4px 15px rgba(255,211,42,0.4);">`;
                    } else {
                        slideIcon.textContent = '🎮';
                    }
                }
                if (slideTitle) slideTitle.textContent = activeSponsoredGame.title;
                if (slideSubtitle) slideSubtitle.textContent = activeSponsoredGame.description || 'Mängi seda uut mängu Playardis!';
                if (slideFeaturePill) slideFeaturePill.innerHTML = `🔥 <strong>REKLAAMITUD MÄNG</strong> · Looja: @${activeSponsoredGame.creator || 'Creator'}`;
            } else {
                const slide = AD_SLIDES[slideIndex % AD_SLIDES.length];
                if (slideIcon) slideIcon.textContent = slide.icon;
                if (slideTitle) slideTitle.textContent = slide.title;
                if (slideSubtitle) slideSubtitle.textContent = slide.subtitle;
                if (slideFeaturePill) slideFeaturePill.textContent = slide.pill;
            }
        };

        updateSlideUI();
        clearInterval(slideInterval);
        if (!activeSponsoredGame) {
            slideInterval = setInterval(() => {
                slideIndex++;
                updateSlideUI();
            }, 4000);
        }

        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            timeLeft--;
            if (timerTextEl) timerTextEl.textContent = `${Math.max(0, timeLeft)}s`;
            const cdEl = document.getElementById('ad-close-countdown');
            if (cdEl) cdEl.textContent = `${Math.max(0, timeLeft)}`;
            if (progressBar) {
                const percent = Math.min(100, Math.round(((20 - timeLeft) / 20) * 100));
                progressBar.style.width = `${percent}%`;
            }

            if (timeLeft <= 0) {
                finishAdReward();
            }
        }, 1000);
    };

    btnWatchAd.addEventListener('click', (e) => {
        e.stopPropagation();
        startAdPlayback();
    });

    if (btnCloseAd) {
        btnCloseAd.addEventListener('click', () => {
            if (!isAdFinished && btnCloseAd.disabled) return;
            modalAdPlayer.style.display = 'none';
            clearInterval(countdownInterval);
            clearInterval(slideInterval);
        });
    }

    // Expose for testing
    (window as any).__startAdReward = startAdPlayback;
    (window as any).__finishAdRewardForTest = finishAdReward;
}
