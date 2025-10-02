document.addEventListener('DOMContentLoaded', function() {
	const headerElement = document.getElementById('header');
	if (headerElement) {
		headerElement.classList.add('active');
	};
	document.getElementById('prompt')?.focus();

	initializeDownloadFeatures();
	initializeKeyboardShortcuts();
	initLeftSidebar();
	initializeMainButtons();
	handleUrlParameters();
	initSidebar()


	const leftSidebarToggle = document.getElementById('leftSidebarToggle');
	const leftSidebar = document.getElementById('leftSidebar');
	const app = document.getElementById('app');
	const mindmap = document.getElementById('mindmap');
	const menubar = document.getElementById('menubar');
	
	if (leftSidebarToggle && leftSidebar) {
		leftSidebarToggle.addEventListener('click', function() {
			leftSidebar.classList.toggle('open');
			if (app) app.classList.toggle('left-sidebar-open');
			if (mindmap) mindmap.classList.toggle('left-sidebar-open');
	
			const isOpen = leftSidebar.classList.contains('open');
			if (menubar) {
				if (isOpen) {
					menubar.classList.add('sidebar-open');
				} else {
					menubar.classList.remove('sidebar-open');
				}
			}
	
			localStorage.setItem('left-sidebar-state', isOpen ? 'open' : 'closed');
		});
	} else {
		console.error('Left sidebar toggle or sidebar element not found for listener attachment in DOMContentLoaded.');
	}
	

	document.getElementById('new-mind-map-button').addEventListener('click', function() {
		showHeader()
	});

	function showHeader() {
		const buttonContainer = document.getElementById('button-container');
		if (buttonContainer) {
			buttonContainer.style.display = 'none';
		}

		const mindmapElement = document.getElementById('mindmap');
		if (mindmapElement) {
			mindmapElement.style.display = 'none';
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
		document.getElementById('prompt')?.focus();

		const handwrittenUpgradeTip = document.getElementById('handwrittenUpgradeTip');

		if (handwrittenUpgradeTip) {
		handwrittenUpgradeTip.style.display = 'block';
		}

		removeUrlParameter('id');
	}
});

function initializeKeyboardShortcuts() {
	document.addEventListener('keydown', function(e) {
		const mindmapVisible =
			document.getElementById('mindmap')?.style.display === 'block';
		const isTyping = ['input', 'textarea'].includes(
			document.activeElement?.tagName?.toLowerCase(),
		);

		if (e.key === 'k' && !isTyping) {
			e.preventDefault();
			openSearchMindmapsPopup();
			return;
		}

		if (mindmapVisible && !isTyping) {
			switch (e.key) {
				case 'e':
					e.preventDefault();
					document.getElementById('edit-mode-button')?.click();
					break;
				case 'd':
					e.preventDefault();
					document.getElementById('download-mindmap-btn')?.click();
					break;
				case 'g':
					e.preventDefault();
					document.getElementById('regenerate-button')?.click();
					break;
				case 'f':
					e.preventDefault();
					document.getElementById('mm-fit')?.click();
					break;
			}
		}
	});
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
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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

function waitForMarkmap() {
	return new Promise((resolve, reject) => {
		if (window.markmap &&
			window.markmap.Markmap &&
			window.markmap.Transformer &&
			window.markmap.Toolbar) {
			resolve(window.markmap);
			return;
		}

		const checkMarkmap = () => {
			if (window.markmap &&
				window.markmap.Markmap &&
				window.markmap.Transformer &&
				window.markmap.Toolbar) {
				resolve(window.markmap);
			} else {
				setTimeout(checkMarkmap, 100);
			}
		};

		checkMarkmap();

		setTimeout(() => {
			reject(new Error('Markmap failed to load within 20 seconds'));
		}, 20000);
	});
}

function renderMindmap(markdown) {
	if (!markdown) {
		console.error('Received empty markdown');
		markdown = '# Empty Mind Map';
	}

	if (typeof markdown !== 'string') {
		console.error('Markdown is not a string, converting:', markdown);
		markdown = String(markdown);
	}

	currentMarkdown = markdown;

	// Wait for markmap to be loaded before proceeding
	waitForMarkmap()
		.then((markmap) => {
			renderMindmapInternal(markdown, markmap);
		})
		.catch((error) => {
			console.error('Failed to load markmap:', error);
			showErrorPopup('Failed to load mind map library. Please refresh the page and try again.', '');
		});
	}

function renderMindmapInternal(markdown, markmap) {
	const mindmapContainer = document.getElementById('mindmap');
	if (!mindmapContainer) {
		console.error('Mindmap container not found!');
		return;
	}
	mindmapContainer.setAttribute('data-markdown', markdown);
	mindmapContainer.innerHTML = '';

	try {
		if (!markdown.trim().startsWith('#')) {
			markdown = '# ' + (currentMindmapTitle || 'Mind Map') + '\n\n' + markdown;
		}

		mindmapContainer.style.position = 'fixed';
		mindmapContainer.style.top = '0';
		mindmapContainer.style.left = '0';
		mindmapContainer.style.width = '100vw';
		mindmapContainer.style.height = '100vh';
		mindmapContainer.style.display = 'block';

		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('width', '100%');
		svg.setAttribute('height', '100%');
		mindmapContainer.appendChild(svg);

		const {
			Markmap,
			Transformer,
			Toolbar
		} = markmap;
		const transformer = new Transformer();

		if (!markdown.startsWith('---\nmarkmap:')) {
			markdown = '---\nmarkmap:\n  maxWidth: 500\n---\n\n' + markdown;
		}

		const {
			root
		} = transformer.transform(markdown);

		const mm = Markmap.create(
			svg, {
				autoFit: true,
				duration: 500,
				maxWidth: 550,
				zoom: true,
				pan: true,
			},
			root,
		);

		mm.fit();
		window.markmapInstance = mm;

		const toolbar = Toolbar.create(mm);
		const toolbarElement = toolbar.render();

		toolbar.setItems([
			"zoomIn",
			"zoomOut",
		]);

		document.body.appendChild(toolbarElement);

		   		const zoomInButton = document.querySelector('.mm-toolbar-item[title="Zoom in"]');
		   		if (zoomInButton) {
		   			zoomInButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zoom-in-icon lucide-zoom-in"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>';
		   		}
		   		const zoomOutButton = document.querySelector('.mm-toolbar-item[title="Zoom out"]');
		   		if (zoomOutButton) {
		   			zoomOutButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zoom-out-icon lucide-zoom-out"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/></svg>';
		   		}

		} catch (error) {
			console.error('Mindmap Error:', error);
			const errorMessage = document.createElement('div');
			errorMessage.textContent = 'Error rendering the mindmap: ' + error.message;
			errorMessage.style.color = 'red';
			errorMessage.style.padding = '20px';
			errorMessage.style.textAlign = 'center';
			errorMessage.style.marginTop = '50px';
			mindmapContainer.appendChild(errorMessage);

			const errorDetails = document.createElement('pre');
			errorDetails.textContent =
				'Markdown content (first 100 chars): ' +
				(markdown ? markdown.substring(0, 100) + '...' : 'undefined');
			errorDetails.style.fontSize = '12px';
			errorDetails.style.margin = '20px';
			errorDetails.style.padding = '10px';
			errorDetails.style.background = 'var(--white)';
			errorDetails.style.border = '1px solid var(--light-grey)';
			errorDetails.style.borderRadius = '4px';
			errorDetails.style.overflow = 'auto';
			mindmapContainer.appendChild(errorDetails);
		}
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

function trackErrorEvent(errorMessage) {
	if (window.dataLayer) {
		window.dataLayer.push({
			'event': 'error_occurred',
			'error_message': errorMessage
		});
	} else {
		console.warn('dataLayer not found.  Google Analytics event not sent.');
	}
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
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function initSidebar() {
	const toggle = document.getElementById('leftSidebarToggle');

	toggle.addEventListener('click', toggleSidebar);

	const sidebarState = localStorage.getItem('sidebar-state');
	if (sidebarState === 'open') {
		sidebar.classList.add('open');
		toggle.classList.add('open');
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

function updateToggleIcon(isOpen) {
	const toggle = document.getElementById('sidebarToggle');
	const toggleIcon = toggle.querySelector('svg');

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

window.onload = function() {
	if (window.location.hostname === 'mind-map-wizard.pages.dev') {
		window.location.href =
			'https://mindmapwizard.com' +
			window.location.pathname +
			window.location.search;
	}
};


window.onload = function() {
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
}

function removeQueryParam(param) {
  if (!param) return;

  const url = new URL(window.location.href);
  if (!url.searchParams.has(param)) return; 

  url.searchParams.delete(param);

  const newUrl =
    url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + (url.hash || '');

  history.replaceState(null, document.title, newUrl);
}

function showLicensePopup() {
  const licensePopup = document.getElementById('licensePopup');
  const infoMenu = document.querySelector('.info-menu');
  
  if (licensePopup) {
    licensePopup.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  
  if (infoMenu) {
    infoMenu.classList.remove('show');
  }
}

function closeLicensePopup() {
  const licensePopup = document.getElementById('licensePopup');
  
  if (licensePopup) {
    licensePopup.classList.remove('show');
    document.body.style.overflow = '';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const closeLicenseBtn = document.getElementById('closeLicensePopup');
  const licensePopup = document.getElementById('licensePopup');
  
  if (closeLicenseBtn) {
    closeLicenseBtn.addEventListener('click', closeLicensePopup);
  }
  
  if (licensePopup) {
    licensePopup.addEventListener('click', function(e) {
      if (e.target === licensePopup) {
        closeLicensePopup();
      }
    });
  }
});

window.showLicensePopup = showLicensePopup;
window.closeLicensePopup = closeLicensePopup;

