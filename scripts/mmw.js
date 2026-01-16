document.addEventListener('DOMContentLoaded', function () {
	const headerElement = document.getElementById('header');
	if (headerElement) {
		headerElement.classList.add('active');
	};
	document.getElementById('prompt')?.focus();

	if (typeof initializeDownloadFeatures === 'function') initializeDownloadFeatures();
	if (typeof initializeRatingSystem === 'function') initializeRatingSystem();
	if (typeof initializeMainButtons === 'function') initializeMainButtons();
	if (typeof handleUrlParameters === 'function') handleUrlParameters();
	initSidebar();
	initializeKeyboardShortcuts();

	const newMindMapBtn = document.getElementById('new-mind-map-button');
	if (newMindMapBtn) {
		newMindMapBtn.addEventListener('click', function () {
			if (window.MMW_DISABLE_AI_FEATURES && typeof createManualMindMap === 'function') {
				createManualMindMap();
				return;
			}
			showHeader();
		});
	}

	function showHeader() {
		const buttonContainer = document.getElementById('button-container');
		if (buttonContainer) {
			buttonContainer.style.display = 'none';
		}

		const mindmapElement = document.getElementById('mindmap');
		if (mindmapElement) {
			mindmapElement.style.display = 'none';
		}

		const app = document.getElementById('app');
		if (app) {
			app.style.display = 'block';
		}

		const headerElement = document.getElementById('header');
		if (headerElement) {
			headerElement.style.display = 'block'
			setTimeout(() => {
				headerElement.classList.add('active');
			}, 10);
		}

		const aiContentDisclaimer = document.getElementById('ai-content-disclaimer');
		if (aiContentDisclaimer) {
			aiContentDisclaimer.style.display = 'none';
		}

		const toolbarElement = document.querySelector('.mm-toolbar');
		if (toolbarElement) {
			toolbarElement.style.display = 'none';
		}

		const navLinks = document.getElementById('nav-links');
		if (navLinks) {
			navLinks.classList.remove('padding-right');
		}

		if (window.innerWidth > 770) {
			document.getElementById('prompt')?.focus();
		}

		if (window.innerWidth < 770) {
			closeLeftSidebar();
		}

		const zoomControls = document.getElementById('zoom-controls');
		if (zoomControls) {
			zoomControls.classList.remove('show');
		}

		const undoRedoContainer = document.getElementById('undo-redo-container');
		if (undoRedoContainer) {
			undoRedoContainer.style.display = 'none';
		}

		removeUrlParameter('id');
		closeNotesDrawer();

		document.querySelectorAll('.mindmap-item').forEach((item) => {
			item.classList.remove('active');
		});
	}

	const hotkeysButton = document.querySelector('.hotkeys-button');
	const popup = document.querySelector('.keyboard-shortcuts-popup');

	if (hotkeysButton && popup) {
		hotkeysButton.addEventListener('mouseenter', () => {
			popup.style.display = 'block';
		});

		hotkeysButton.addEventListener('mouseleave', () => {
			if (!popup.matches(':hover')) {
				popup.style.display = 'none';
			}
		});

		popup.addEventListener('mouseenter', () => {
			popup.style.display = 'block';
		});

		popup.addEventListener('mouseleave', () => {
			popup.style.display = 'none';
		});
	}

	const printButton = document.getElementById('print-btn');
	if (printButton) {
		const isChrome = navigator.userAgent.indexOf("Chrome") > -1 && navigator.userAgent.indexOf("Edge") === -1;
		if (isChrome) {
			printButton.style.display = 'flex';

			const downloadButton = document.querySelector('.download-button');
			if (downloadButton) {
				downloadButton.style.width = 'calc(100% - 54px)';
			}
		} else {
			printButton.style.display = 'none';

			const downloadButton = document.querySelector('.download-button');
			if (downloadButton) {
				downloadButton.style.width = '100%';
			}
		}
	}
});

function removeUrlParameter(param) {
	if (!param) return;
	const url = new URL(window.location.href);
	if (!url.searchParams.has(param)) return;
	url.searchParams.delete(param);
	const newUrl = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + (url.hash || '');
	history.replaceState(null, document.title, newUrl);
}

function clearHistory() {
	const clearPopup = document.createElement('div');
	clearPopup.className = 'delete-popup';
	clearPopup.id = 'clearHistoryPopup';

	clearPopup.innerHTML = `
        <div class="delete-popup-content">
        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#DC3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-brush-cleaning-icon lucide-brush-cleaning"><path d="m16 22-1-4"/><path d="M19 13.99a1 1 0 0 0 1-1V12a2 2 0 0 0-2-2h-3a1 1 0 0 1-1-1V4a2 2 0 0 0-4 0v5a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2v.99a1 1 0 0 0 1 1"/><path d="M5 14h14l1.973 6.767A1 1 0 0 1 20 22H4a1 1 0 0 1-.973-1.233z"/><path d="m8 22 1-4"/></svg>
            <h3 style="margin-top: 20px;">Clear Mind Map History</h3>
            <p>Are you sure you want to delete all your mind maps? This action cannot be undone.</p>
            <div class="dialog-buttons">
                <button class="dialog-button cancel" onclick="closeClearPopup()">Cancel</button>
                <button class="dialog-button delete" onclick="confirmClear()">Clear All</button>
            </div>
        </div>
    `;

	document.body.appendChild(clearPopup);
	clearPopup.style.display = 'flex';
}

let isGeneratingMindmap = false;

function generateUUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = (Math.random() * 16) | 0,
			v = c == 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

function formatMarkdown(text) {
	if (!text) {
		console.error('Received empty response from API');
		return {
			topic: 'Mind Map',
			markdown: '# Mind Map\n\nError: No content received'
		};
	}

	let topic = '';
	let markdown = '';

	if (typeof text === 'object') {
		if (text.topic && (text.raw || text.markdown)) {
			topic = text.topic;
			markdown = text.raw || text.markdown;
		} else {
			markdown = JSON.stringify(text);
		}
	} else {
		markdown = String(text);
	}

	markdown = markdown
		.replace(/\\\\n/g, '\n')
		.replace(/\\n/g, '\n')
		.replace(/\\\\\"/g, '"')
		.replace(/\\"/g, '"')
		.replace(/\\\\\\\\/g, '\\')
		.replace(/\\\\/g, '\\')
		.replace(/^\s*```(?:markdown|json)?\n?/gm, '')
		.replace(/\n```\s*$/gm, '')
		.replace(/`/g, '')
		.trim();

	if (!topic) {
		const standardMatch = markdown.match(
			/topic\s*=\s*"([^"]*)"\s*,\s*markdown\s*=\s*"([\s\S]*?)"\s*$/,
		);
		if (standardMatch) {
			topic = standardMatch[1];
			markdown = standardMatch[2]
				.replace(/\\\\\"/g, '"')
				.replace(/\\"/g, '"')
				.replace(/\\\\n/g, '\n')
				.replace(/\\n/g, '\n');
		} else {
			const complexMatch = markdown.match(
				/^\"([^\"]+)\",?\s*\\?n?markdown\s*=\s*\"([\s\S]*)\"?\s*$/i,
			);
			if (complexMatch) {
				topic = complexMatch[1];
				markdown = complexMatch[2]
					.replace(/\\\\\"/g, '"')
					.replace(/\\"/g, '"')
					.replace(/\\\\n/g, '\n')
					.replace(/\\n/g, '\n')
					.replace(/\\\\\\\\/g, '\\')
					.replace(/\\\\/g, '');
			} else {
				const altMatch = markdown.match(
					/(?:topic|title)\s*[:=]\s*"?([^"\n]+)"?[\s\S]*?(?:markdown|content)\s*[:=]\s*([\s\S]+)/i,
				);
				if (altMatch) {
					topic = altMatch[1].replace(/^["']|["']$/g, '').trim();
					markdown = altMatch[2].replace(/^["']|["']$/g, '').trim();
				}
			}
		}
	}

	if (!topic) {
		const firstHeadingMatch = markdown.match(/^#+\s+(.+)$/m);
		topic = firstHeadingMatch ? firstHeadingMatch[1].trim() : 'Mind Map';
	}

	markdown = markdown.replace(/(\S)\s*(#+\s)/g, '$1\n$2');
	markdown = cleanAndNormalizeMarkdown(markdown);

	if (!markdown.trim().startsWith('#')) {
		markdown = `# ${topic}\n\n${markdown}`;
	}

	return {
		topic: topic.trim(),
		markdown: markdown.trim()
	};
}

function mmJsonToMarkdown(src) {
	try {
		const obj = typeof src === 'string' ? JSON.parse(src) : (src || {});
		const root = obj['mindmap']?.['mm-node'] || obj['mm-node'] || obj.mmNode || obj;
		const lines = [];
		const maxHeading = 6;

		function walk(node, level) {
			if (!node || typeof node !== 'object') return;
			const text = String(node.content ?? '').trim();
			if (level <= maxHeading) {
				lines.push(`${'#'.repeat(level)} ${text}`.trim());
			} else {
				lines.push(`- ${text}`.trim());
			}
			if (Array.isArray(node.children)) {
				for (const child of node.children) {
					walk(child, level + 1);
				}
			}
		}
		walk(root, 1);
		return lines.join('\n');
	} catch (e) {
		console.warn('mmJsonToMarkdown failed, returning original content', e);
		return typeof src === 'string' ? src : JSON.stringify(src ?? {}, null, 2);
	}
}

function cleanAndNormalizeMarkdown(markdown) {
	if (!markdown) return '';

	markdown = markdown.trim();

	const firstHashIndex = markdown.indexOf('#');
	if (firstHashIndex > 0) {
		markdown = markdown.substring(firstHashIndex);
	}

	let lines = markdown.split('\n');
	let processedLines = [];

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		let trimmedLine = line.trim();

		if (!trimmedLine) {
			if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
				processedLines.push('');
			}
			continue;
		}

		if (trimmedLine.startsWith('#')) {
			if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
				processedLines.push('');
			}

			const headingMatch = trimmedLine.match(/^(#+)\s*(.+)$/);
			if (headingMatch) {
				const level = headingMatch[1];
				const content = headingMatch[2].trim();
				processedLines.push(`${level} ${content}`);
			} else {
				processedLines.push(trimmedLine);
			}
			continue;
		}

		if (trimmedLine.match(/^[-*]\s+/) || trimmedLine.match(/^\d+\.\s+/)) {
			processedLines.push(trimmedLine);
			continue;
		}

		if (trimmedLine && !trimmedLine.startsWith('#')) {
			const prevNonEmptyLine = findPreviousNonEmptyLine(processedLines);
			if (prevNonEmptyLine && prevNonEmptyLine.startsWith('#')) {
				processedLines.push(`- ${trimmedLine}`);
			} else {
				processedLines.push(trimmedLine);
			}
		}
	}

	let result = processedLines.join('\n');

	result = result.replace(/(\S)\s*(#+\s)/g, '$1\n$2');
	result = result.replace(/\n{3,}/g, '\n\n');
	result = result.replace(/^(#+[^\n]+)\n([^#\n-])/gm, '$1\n\n$2');

	return result.trim();
}

function findPreviousNonEmptyLine(lines) {
	for (let i = lines.length - 1; i >= 0; i--) {
		if (lines[i].trim()) {
			return lines[i];
		}
	}
	return null;
}

function showError(errorMessage, hideRetry, input) {
	let errorPopup = document.createElement('div');
	errorPopup.id = 'error-popup';
	errorPopup.className = 'error-popup';
	document.body.appendChild(errorPopup);

	const retryButtonHtml = hideRetry ? '' : '<button id="retryBtn">Retry</button>';

	errorPopup.innerHTML = `
            <h2 style="color: #1e293b; margin-top: 20px; margin-bottom: 10px;">Something went wrong.<br>Please try again.</h2>
                    <br>
                    <br>
                    <div style="width: 100%; border-radius: 16px; text-align: left; background-color: #F9FAFC; padding: 15px;">
                        <p style="font-size: 0.9em; color: var(--text-color);">${errorMessage || 'Unknown Error'}</p>
                    </div>
            ${retryButtonHtml}
			<button id="closeErrorPopupBtn">Close</button>
        `;

	errorPopup.style.display = 'block';

	if (!hideRetry && document.getElementById('retryBtn')) {
		document.getElementById('retryBtn').addEventListener('click', function () {
			const newUrl = window.location.pathname + '?q=' + encodeURIComponent(input || '');
			window.location.href = newUrl;
		});
	}

	document.getElementById('closeErrorPopupBtn').addEventListener('click', function () {
		errorPopup.style.display = 'none';
		if (typeof showHeader === 'function') showHeader();
	});

	const loadingAnim = document.getElementById('loading-animation');
	if (loadingAnim) loadingAnim.style.display = 'none';

	if (document.getElementById('regenerate-button')) {
		document.getElementById('regenerate-button').classList.remove('rotating');
	}

	trackErrorEvent(errorMessage);
}

function trackErrorEvent(errorMessage) {
}

function getTimeAgo(date) {
	const seconds = Math.floor((new Date() - date) / 1000);

	const intervals = {
		year: 31536000,
		month: 2592000,
		week: 604800,
		day: 86400,
		hour: 3600,
		minute: 60,
	};

	for (const [unit, secondsInUnit] of Object.entries(intervals)) {
		const interval = Math.floor(seconds / secondsInUnit);

		if (interval >= 1) {
			return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
		}
	}
	return 'Just now';
}

function closeShareDialog() {
	const shareOverlay = document.querySelector('.share-overlay');
	const dialog = document.querySelector('.share-dialog');

	if (shareOverlay) shareOverlay.classList.remove('show');
	if (dialog) dialog.classList.remove('show');

	setTimeout(() => {
		if (shareOverlay) document.body.removeChild(shareOverlay);
		if (dialog) document.body.removeChild(dialog);
		const shareButton = document.getElementById('share-btn') || document.querySelector('.share-button');
		if (shareButton) {
			shareButton.disabled = false;
			shareButton.style.opacity = '1';
		}
	}, 300);
}

function copyShareLink() {
	const shareLink = document.querySelector('.share-link');
	if (shareLink) {
		shareLink.select();
		document.execCommand('copy');
	}
}

function hideInitialElements() {
	const elementsToHide = ['header', 'recent-mindmaps', 'legals-disclaimer'];

	elementsToHide.forEach((id) => {
		const element = document.getElementById(id);
		if (element) element.style.display = 'none';
	});
}

function showMindmapElements() {
	const elementsToShow = [{
		id: 'button-container',
		display: 'flex'
	},
	{
		id: 'mindmap',
		display: 'block'
	},
	{
		id: 'undo-redo-container',
		display: 'flex'
	}
	];

	elementsToShow.forEach(element => {
		const el = document.getElementById(element.id);
		if (el) {
			el.style.display = element.display;
		}
	});

	const navLinks = document.querySelector('.nav-links');
	if (navLinks) {
		navLinks.classList.add('padding-right');
	}
}

function formatDateLeftSidebar(timestamp) {
	const date = new Date(timestamp);
	const now = new Date();
	const diffMs = now - date;
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHour = Math.floor(diffMin / 60);
	const diffDay = Math.floor(diffHour / 24);

	if (diffDay > 0) {
		return diffDay === 1 ? 'Yesterday' : `${diffDay} days ago`;
	} else if (diffHour > 0) {
		return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
	} else if (diffMin > 0) {
		return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
	} else {
		return 'Just now';
	}
}

function escapeHtmlLeftSidebar(unsafe) {
	if (!unsafe) return "";
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}


function initSidebar() {
	const sidebar = document.getElementById('sidebar');
	const toggle = document.getElementById('sidebarToggle');
	const overlay = document.getElementById('sidebarOverlay');

	if (!sidebar || !toggle || !overlay) {
		return;
	}

	toggle.addEventListener('click', toggleSidebar);

	const sidebarState = localStorage.getItem('sidebar-state');
	if (sidebarState === 'open') {
		sidebar.classList.add('open');
		toggle.classList.add('open');
		overlay.classList.add('open');
		updateToggleIcon(true);
	}
}

function toggleSidebar() {
	const sidebar = document.getElementById('sidebar');
	const toggle = document.getElementById('sidebarToggle');
	const overlay = document.getElementById('sidebarOverlay');

	if (!sidebar || !toggle || !overlay) return;

	const isOpen = sidebar.classList.contains('open');

	sidebar.classList.toggle('open');
	toggle.classList.toggle('open');
	overlay.classList.toggle('open');

	localStorage.setItem('sidebar-state', isOpen ? 'closed' : 'open');

	updateToggleIcon(!isOpen);
}

function closeSidebar() {
	const sidebar = document.getElementById('sidebar');
	const toggle = document.getElementById('sidebarToggle');
	const overlay = document.getElementById('sidebarOverlay');

	if (!sidebar || !toggle || !overlay) return;

	sidebar.classList.remove('open');
	toggle.classList.remove('open');
	overlay.classList.remove('open');

	localStorage.setItem('sidebar-state', 'closed');

	updateToggleIcon(false);
}

function closeLeftSidebar() {
	const leftSidebar = document.getElementById('leftSidebar');
	const app = document.getElementById('app');
	const mindmap = document.getElementById('mindmap');
	const menubar = document.getElementById('menubar');
	const undoRedoContainer = document.getElementById('undo-redo-container');

	if (leftSidebar) leftSidebar.classList.remove('open');
	if (app) app.classList.remove('left-sidebar-open');
	if (mindmap) mindmap.classList.remove('left-sidebar-open');
	if (menubar) menubar.classList.remove('sidebar-open');
	document.documentElement.classList.remove('left-sidebar-open');
	if (undoRedoContainer) undoRedoContainer.classList.remove('left-sidebar-open');

	localStorage.setItem('left-sidebar-state', 'closed');
}

function updateToggleIcon(isOpen) {
	const toggle = document.getElementById('sidebarToggle');
	const toggleIcon = toggle?.querySelector('svg');

	if (toggleIcon) {
		if (isOpen) {
			toggleIcon.innerHTML = '<polyline points="9 18 15 12 9 6"></polyline>';
		} else {
			toggleIcon.innerHTML = '<polyline points="15 18 9 12 15 6"></polyline>';
		}
	}
}

window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;

window.onload = function () {
	if (window.location.hostname === 'mind-map-wizard.pages.dev') {
		window.location.href =
			'https://mindmapwizard.com' +
			window.location.pathname +
			window.location.search;
	}

	const pattern = `
            
                      [                  
                     ///                 
                    ////                 
                    /////                
                   //////                
                   ///////               
                  ////////               
                 /////////               
                 /////////               
                ///////////              
                ///////////              
               /////////////             
               /////////////             
              ///////////////            
               ////////////////////      
                    ////////////////     
      ////////////////////////////////   
  ///////////////////////////////////////  
/////////////////////////////////////////// 
`;

	console.log(
		"%c" + pattern,
		"color:rgb(210, 133, 255); font-family: monospace; white-space: pre;"
	);
};

function removeQueryParam(param) {
	if (!param) return;

	const url = new URL(window.location.href);
	if (!url.searchParams.has(param)) return;

	url.searchParams.delete(param);

	const newUrl =
		url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + (url.hash || '');

	history.replaceState(null, document.title, newUrl);
}

function showErrorPopup(errorMessage, input) {
	let errorPopup = document.getElementById('error-popup');

	if (!errorPopup) {
		errorPopup = document.createElement('div');
		errorPopup.id = 'error-popup';
		errorPopup.className = 'error-popup';
		document.body.appendChild(errorPopup);
	}

	errorPopup.innerHTML = `
            <h2 style="color: #1e293b; margin-top: 20px; margin-bottom: 10px;">Something went wrong.<br>Please try again.</h2>
                    <br>
                    <br>
                    <div style="width: 100%; border-radius: 16px; text-align: left; background-color: #F9FAFC; padding: 15px;">
                        <p style="font-size: 1em; color: var(--text-color); font-weight: bold; margin-bottom: 5px;">Details</p>
                        <p style="font-size: 0.9em; color: var(--text-color);">${errorMessage}</p>
                    </div>
            <button id="retryBtn">Retry</button>
			<button id="closeErrorPopupBtn">Close</button>
        `;

	errorPopup.style.display = 'block';

	document.getElementById('retryBtn').addEventListener('click', function () {
		const newUrl = window.location.pathname + '?q=' + encodeURIComponent(input);
		window.location.href = newUrl;
	});

	document.getElementById('closeErrorPopupBtn').addEventListener('click', function () {
		errorPopup.style.display = 'none';
		showHeader()
	});

	document.getElementById('loading-animation').style.display = 'none';

	if (document.getElementById('regenerate-button')) {
		document.getElementById('regenerate-button').classList.remove('rotating');
	}

	trackErrorEvent(errorMessage);
}

function showInfoSnackbar(message) {
	const existingSnackbar = document.querySelector('.snackbar');
	if (existingSnackbar) {
		existingSnackbar.remove();
	}

	const snackbar = document.createElement('div');
	snackbar.className = 'snackbar';

	const icon = document.createElement('div');
	icon.className = 'snackbar-icon';

	const messageEl = document.createElement('div');
	messageEl.className = 'snackbar-message';
	messageEl.textContent = message;

	const closeBtn = document.createElement('button');
	closeBtn.className = 'snackbar-close';
	closeBtn.setAttribute('aria-label', 'Close notification');

	closeBtn.innerHTML = `
	<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  `;

	snackbar.appendChild(icon);
	snackbar.appendChild(messageEl);
	snackbar.appendChild(closeBtn);

	document.body.appendChild(snackbar);

	requestAnimationFrame(() => {
		snackbar.classList.add('show');
	});

	const autoHideTimer = setTimeout(() => {
		hideSnackbar(snackbar);
	}, 30000);

	closeBtn.addEventListener('click', () => {
		clearTimeout(autoHideTimer);
		hideSnackbar(snackbar);
	});

	function hideSnackbar(element) {
		element.classList.remove('show');
		element.classList.add('hide');

		setTimeout(() => {
			if (element.parentNode) {
				element.parentNode.removeChild(element);
			}
		}, 400);
	}
}

window.renderMindmap = async function (markdown, options = {}) {
	try {
		const json = window.markdownToMmJson(markdown);

		const hasOptContext =
			options && (Object.prototype.hasOwnProperty.call(options, 'contextUrls') || Object.prototype.hasOwnProperty.call(options, 'contexturls'));
		if (hasOptContext) {
			const optContext = Object.prototype.hasOwnProperty.call(options, 'contextUrls')
				? options.contextUrls
				: options.contexturls;
			const arr = Array.isArray(optContext) ? optContext : (optContext ? [optContext] : []);
			json['mm-settings'] = json['mm-settings'] || (typeof defaultMmSettings === 'function' ? defaultMmSettings() : {});
			json['mm-settings'].contextUrls = Array.from(
				new Set(arr.map(u => (typeof u === 'string' ? u.trim() : '')).filter(Boolean))
			);
		}

		const jsonString = JSON.stringify(json, null, 2);

		localStorage.setItem('json-mindmap-content', jsonString);

		const editor = document.getElementById('json-editor');
		if (editor) {
			editor.value = jsonString;
		}

		const mindmapContainer = document.getElementById('mindmap');
		if (mindmapContainer) {
			mindmapContainer.style.display = 'block';
			let svgOutput = document.getElementById('svg-output');

			if (!svgOutput) {
				svgOutput = document.createElement('div');
				svgOutput.id = 'svg-output';
				svgOutput.style.width = '100%';
				svgOutput.style.height = '100%';
				mindmapContainer.appendChild(svgOutput);
			} else {
				svgOutput.innerHTML = '';
			}

			if (window.updateMindMap) {
				window.updateMindMap();
			}
			const zoomControls = document.getElementById('zoom-controls');
			if (zoomControls) {
				zoomControls.classList.add('show');
			}
		}
	} catch (e) {
		console.error('Error rendering mindmap:', e);
	}
};

function removeMarkdown(text) {
	if (!text) return '';
	return text
		.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
		.replace(/[*_~`]/g, '')
		.replace(/#+\s/g, '')
		.replace(/>\s/g, '')
		.replace(/-\s/g, '')
		.replace(/\d+\.\s/g, '');
}

window.removeMarkdown = removeMarkdown;
window.escapeHtmlLeftSidebar = escapeHtmlLeftSidebar;
window.mmJsonToMarkdown = mmJsonToMarkdown;

function initializeKeyboardShortcuts() {
	document.addEventListener('keydown', function (e) {
		const mindmapVisible =
			document.getElementById('mindmap')?.style.display === 'block';
		const activeElement = document.activeElement;
		const isTyping =
			['input', 'textarea'].includes(activeElement?.tagName?.toLowerCase()) ||
			activeElement?.isContentEditable;

		if (e.key === 'k' && !isTyping) {
			e.preventDefault();
			openSearchMindmapsPopup();
			return;
		}

		if (mindmapVisible && !isTyping) {
			switch (e.key) {
				case 'e':
					e.preventDefault();
					document.getElementById('customize-mode-button')?.click();
					break;
				case 'd':
					e.preventDefault();
					document.getElementById('download-mindmap-btn')?.click();
					break;
				case 'g':
					e.preventDefault();
					document.getElementById('regenerate-button')?.click();
					break;
				case 's':
					e.preventDefault();
					document.getElementById('share-btn')?.click();
					break;
				case 'f':
					e.preventDefault();
					document.getElementById('mm-fit')?.click();
					break;
			}
		}
	});
}


function markdownToMmJson(md) {
	const lines = String(md || '').split(/\r?\n/);

	let rootContent = 'Mind Map Wizard';
	let firstHeadingLevel = null;
	let firstHeadingIndex = -1;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const m = line.match(/^(#{1,6})\s+(.*)$/);
		if (m) {
			rootContent = m[2].trim();
			firstHeadingLevel = m[1].length;
			firstHeadingIndex = i;
			break;
		}
	}

	const root = { content: rootContent, children: [] };
	const stack = [{ level: 1, node: root }];

	lines.forEach((raw, index) => {
		const line = raw.trim();
		if (!line) return;

		if (index === firstHeadingIndex) return;

		const m = line.match(/^(#{1,6})\s+(.*)$/);
		if (m) {
			const lvl = m[1].length;
			const text = m[2].trim();
			const node = { content: text, children: [] };
			while (stack.length && stack[stack.length - 1].level >= lvl) stack.pop();
			const parent = stack[stack.length - 1]?.node || root;
			parent.children.push(node);
			stack.push({ level: lvl, node });
			return;
		}

		const b = line.match(/^([-*+]|\d+\.)\s+(.*)$/);
		if (b) {
			const text = b[2].trim();
			const node = { content: text, children: [] };
			while (stack.length > 1 && stack[stack.length - 1].isBullet) {
				stack.pop();
			}
			const parent = stack[stack.length - 1]?.node || root;
			parent.children.push(node);
			return;
		}

		const node = { content: line, children: [] };
		const parent = stack[stack.length - 1]?.node || root;
		parent.children.push(node);
	});

	return {
		"mm-settings": defaultMmSettings(),
		"mm-node": root
	};
}

function defaultMmSettings() {
	return {
		"spacing": 30,
		"border-radius": 4
	};
}

window.markdownToMmJson = markdownToMmJson;
window.defaultMmSettings = defaultMmSettings;
