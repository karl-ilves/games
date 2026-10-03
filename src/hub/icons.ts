import { yardService } from '../shared/yardService';

export function setupIcons() {
    const navYardIcon = document.getElementById('nav-yard-icon');
    if (navYardIcon) navYardIcon.innerHTML = yardService.renderYardSvg(36);

    const headerYardIcon = document.getElementById('header-yard-icon');
    if (headerYardIcon) headerYardIcon.innerHTML = yardService.renderYardSvg(34);

    const cardRacingYardIcon = document.getElementById('card-racing-yard-icon');
    if (cardRacingYardIcon) cardRacingYardIcon.innerHTML = yardService.renderYardSvg(22);

    const cardCookingYardIcon = document.getElementById('card-cooking-yard-icon');
    if (cardCookingYardIcon) cardCookingYardIcon.innerHTML = yardService.renderYardSvg(22);

    const cardWarYardIcon = document.getElementById('card-war-yard-icon');
    if (cardWarYardIcon) cardWarYardIcon.innerHTML = yardService.renderYardSvg(22);

    const cardTrainYardIcon = document.getElementById('card-train-yard-icon');
    if (cardTrainYardIcon) cardTrainYardIcon.innerHTML = yardService.renderYardSvg(22);

    const cardObbyYardIcon = document.getElementById('card-obby-yard-icon');
    if (cardObbyYardIcon) cardObbyYardIcon.innerHTML = yardService.renderYardSvg(22);

    const cardMetroYardIcon = document.getElementById('card-metro-yard-icon');
    if (cardMetroYardIcon) cardMetroYardIcon.innerHTML = yardService.renderYardSvg(22);

    const cardMmp1YardIcon = document.getElementById('card-mmp1-yard-icon');
    if (cardMmp1YardIcon) cardMmp1YardIcon.innerHTML = yardService.renderYardSvg(22);

    const cardRocketYardIcon = document.getElementById('card-rocket-yard-icon');
    if (cardRocketYardIcon) cardRocketYardIcon.innerHTML = yardService.renderYardSvg(22);
}
