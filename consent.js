
window.dataLayer = window.dataLayer || [];
function gtag() {
    dataLayer.push(arguments);
}
gtag('js', new Date());

gtag('consent', 'default', {
    'analytics_storage': 'denied'
});

gtag('config', 'G-4RTLM6HX39');

function showPopup() {
    document.getElementById('legalPopup').style.display = 'flex';
}

function closePopup() {
    document.getElementById('legalPopup').style.display = 'none';
}

function acceptDisclaimer() {
    localStorage.setItem('disclaimerAccepted', 'true');
    gtag('consent', 'update', {
        'analytics_storage': 'granted'
    });
    dataLayer.push({
        'event': 'cookie_consent_accepted',
        'consent_type': 'functionality_and_analytics'
    });
    closePopup();
    generateMindmap();
}

window.onload = function() {
    if (localStorage.getItem('disclaimerAccepted') !== "true" && !localStorage.getItem('mindmap-history')) {
        document.getElementById('legalPopup').style.display = 'flex';
    }
};
