(function () {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    if (!isChrome) return;

    const chromeMatch = navigator.userAgent.match(/Chrome\/(\d+)/);
    if (!chromeMatch || parseInt(chromeMatch[1]) < 139) return;

    const style = document.createElement('style');
    style.textContent = `
        *:not(#svg-output):not(#svg-output *):not(.mindmap-item-loading-spinner):not(.mindmap-item-loading-spinner *):not(.button-loading-spinner):not(.button-loading-spinner *):not(.loading-spinner):not(.loading-spinner *):not(.saving-spinner):not(.saving-spinner *):not(.sync-save-spinner):not(.sync-save-spinner *):not(.video-container):not(.video-container *):not(.expand-spinner):not(.expand-spinner *):not(.chat-bubble):not(.chat-bubble *) {
            corner-shape: squircle !important;
        }
    `;
    document.head.appendChild(style);

    function adjustRadiusValue(radius) {
        if (!radius || radius === '0' || radius === '0px' || radius.includes('%')) return radius;
        if (radius.includes('var(') || radius.includes('calc(')) return radius;

        return radius.replace(/(\d*\.?\d+)([a-zA-Z]*)/g, (match, value, unit) => {
            const numericValue = parseFloat(value);
            const finalUnit = unit.toLowerCase();
            
            if (finalUnit === 'px' || finalUnit === '') {
                if (numericValue >= 50) return match;
                let newValue = numericValue + 20;
                if (newValue > 50) newValue = 50;
                return newValue + 'px';
            } else {
                return `calc(${match} + 20px)`;
            }
        });
    }

    function processRule(rule) {
        try {
            if (rule.type === CSSRule.STYLE_RULE) {
                if (rule.selectorText && (
                    rule.selectorText.includes('#svg-output') || 
                    rule.selectorText.includes('.mindmap-item-loading-spinner') ||
                    rule.selectorText.includes('.button-loading-spinner') ||
                    rule.selectorText.includes('.loading-spinner')||
                    rule.selectorText.includes('.chat-bubble')
                )) {
                    return;
                }

                if (rule.style.getPropertyValue('--squircle-adjusted')) {
                    return;
                }

                let hasRadius = false;
                let changed = false;

                const radius = rule.style.borderRadius;
                if (radius) {
                    hasRadius = true;
                    const adjusted = adjustRadiusValue(radius);
                    if (adjusted !== radius) {
                        rule.style.borderRadius = adjusted;
                        changed = true;
                    }
                } else {
                    const corners = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'];
                    corners.forEach(corner => {
                        const r = rule.style[corner];
                        if (r) {
                            hasRadius = true;
                            const adjusted = adjustRadiusValue(r);
                            if (adjusted !== r) {
                                rule.style[corner] = adjusted;
                                changed = true;
                            }
                        }
                    });
                }

                if (hasRadius) {
                    rule.style.setProperty('--squircle-adjusted', 'true');
                }
            } else if (rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE) {
                const rules = rule.cssRules || rule.rules;
                if (rules) {
                    for (let i = 0; i < rules.length; i++) {
                        processRule(rules[i]);
                    }
                }
            }
        } catch (e) {
        }
    }

    function processStyleSheet(sheet) {
        try {
            if (sheet.href && new URL(sheet.href).origin !== window.location.origin) return;
            
            const rules = sheet.cssRules || sheet.rules;
            if (!rules) return;

            for (let i = 0; i < rules.length; i++) {
                processRule(rules[i]);
            }
        } catch (e) {
        }
    }

    function processAllStyleSheets() {
        for (let i = 0; i < document.styleSheets.length; i++) {
            processStyleSheet(document.styleSheets[i]);
        }
    }

    function processInlineStyles(el) {
        if (el.matches && el.matches('#svg-output, #svg-output *, .mindmap-item-loading-spinner, .mindmap-item-loading-spinner *, .button-loading-spinner, .button-loading-spinner *, .loading-spinner, .loading-spinner *')) {
            return;
        }

        const radius = el.style.borderRadius;
        if (radius) {
            if (el.dataset.inlineRadiusAdjusted !== radius) {
                const adjusted = adjustRadiusValue(radius);
                if (adjusted !== radius) {
                    el.style.borderRadius = adjusted;
                    el.dataset.inlineRadiusAdjusted = adjusted;
                } else {
                    el.dataset.inlineRadiusAdjusted = radius;
                }
            }
        } else {
            const corners = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'];
            corners.forEach(corner => {
                const r = el.style[corner];
                if (r && el.dataset['inline' + corner + 'Adjusted'] !== r) {
                    const adjusted = adjustRadiusValue(r);
                    if (adjusted !== r) {
                        el.style[corner] = adjusted;
                        el.dataset['inline' + corner + 'Adjusted'] = adjusted;
                    } else {
                        el.dataset['inline' + corner + 'Adjusted'] = r;
                    }
                }
            });
        }
    }

    function init() {
        processAllStyleSheets();
        document.querySelectorAll('[style]').forEach(processInlineStyles);
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.addEventListener('load', processAllStyleSheets);

    const observer = new MutationObserver((mutations) => {
        let shouldProcessSheets = false;

        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { 
                        if (node.nodeName === 'STYLE' || (node.nodeName === 'LINK' && node.rel === 'stylesheet')) {
                            shouldProcessSheets = true;
                            if (node.nodeName === 'LINK') {
                                node.addEventListener('load', () => processStyleSheet(node.sheet));
                            }
                        }

                        if (node.hasAttribute('style')) {
                            processInlineStyles(node);
                        }
                        const styledChildren = node.querySelectorAll('[style]');
                        for (let i = 0; i < styledChildren.length; i++) {
                            processInlineStyles(styledChildren[i]);
                        }
                    }
                });
            }

            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                processInlineStyles(mutation.target);
            }
        });

        if (shouldProcessSheets) {
            processAllStyleSheets();
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
    });

})();