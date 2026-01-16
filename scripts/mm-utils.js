(function () {
    window.__mmwLoadScript = function (src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = (e) => reject(new Error('Failed to load ' + src));
            document.head.appendChild(s);
        });
    };

    window.__mmwDefaultSettings = function () {
        return {
            "spacing": 30,
            "border-radius": 4
        };
    };

    window.__mmwEnsureEngineDom = function () {
        const mindmap = document.getElementById('mindmap');
        if (!mindmap) return;

        let svgOut = document.getElementById('svg-output');
        if (!svgOut) {
            svgOut = document.createElement('div');
            svgOut.id = 'svg-output';
            svgOut.style.width = '100%';
            svgOut.style.height = '100%';
            mindmap.innerHTML = '';
            mindmap.appendChild(svgOut);
        }

        let editor = document.getElementById('json-editor');
        if (!editor) {
            editor = document.createElement('textarea');
            editor.id = 'json-editor';
            editor.style.display = 'none';
            document.body.appendChild(editor);
        }

        const stubDefs = [
            { id: 'slider', tag: 'div' },
            { id: 'editor-container', tag: 'div' },
            { id: 'app-container', tag: 'div' },
            { id: 'zoom-in-btn', tag: 'button' },
            { id: 'zoom-out-btn', tag: 'button' },
            { id: 'fit-screen-btn', tag: 'button' },
            { id: 'edit-json-btn', tag: 'button' }
        ];
        stubDefs.forEach(({ id, tag }) => {
            if (!document.getElementById(id)) {
                const el = document.createElement(tag);
                el.id = id;
                el.style.display = 'none';
                document.body.appendChild(el);
            }
        });
    };

    window.__mmwMarkdownToJson = function (md) {
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
        const stack = [{ kind: 'heading', level: 1, node: root }];

        lines.forEach((raw, index) => {
            const line = raw.trim();
            if (!line) return;

            if (index === firstHeadingIndex) return;

            const m = line.match(/^(#{1,6})\s+(.*)$/);
            if (m) {
                const lvl = m[1].length;
                const text = m[2].trim();
                const node = { content: text, children: [] };
                while (
                    stack.length &&
                    (stack[stack.length - 1].kind === 'list' || stack[stack.length - 1].level >= lvl)
                ) {
                    stack.pop();
                }
                const parent = stack[stack.length - 1]?.node || root;
                parent.children.push(node);
                stack.push({ kind: 'heading', level: lvl, node });
                return;
            }

            const b = raw.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
            if (b) {
                const indentRaw = b[1] || '';
                const text = b[3].trim();
                const indent = Math.floor(indentRaw.replace(/\t/g, '    ').length / 2);
                const node = { content: text, children: [] };
                let parent = stack[stack.length - 1]?.node || root;
                const last = stack[stack.length - 1];
                if (last?.kind === 'list') {
                    if (indent > last.indent) {
                        parent = last.node;
                    } else {
                        while (stack.length > 1 && stack[stack.length - 1].kind === 'list' && stack[stack.length - 1].indent >= indent) {
                            stack.pop();
                        }
                        parent = stack[stack.length - 1]?.node || root;
                    }
                }
                parent.children.push(node);
                stack.push({ kind: 'list', indent, node });
                return;
            }

            const node = { content: line, children: [] };
            const parent = stack[stack.length - 1]?.node || root;
            parent.children.push(node);
        });

        return {
            "mm-settings": window.__mmwDefaultSettings(),
            "mm-node": root
        };
    };

    window.mmJsonToMarkdown = function (src) {
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
            console.warn('mmJsonToMarkdown failed', e);
            return "Error converting JSON to Markdown: " + e.message + "\n\nStack: " + e.stack;
        }
    };

    let __mmwEnginePromise = null;
    window.__mmwInitEngine = function () {
        if (__mmwEnginePromise) return __mmwEnginePromise;
        window.__mmwEnsureEngineDom();

        __mmwEnginePromise = window.__mmwLoadScript('/scripts/mm-rendering/renderer.js')
            .then(() => window.__mmwLoadScript('/scripts/mm-rendering/interaction.js'))
            .then(() => {
                try {
                    if (!window.__mmwEngineBooted) {
                        window.__mmwEngineBooted = true;
                        if (document.readyState !== 'loading') {
                            document.dispatchEvent(new Event('DOMContentLoaded'));
                        }
                    }
                } catch { }
            })
            .catch((e) => {
                console.error('Failed to initialize MMW rendering engine:', e);
                throw e;
            });

        return __mmwEnginePromise;
    };
})();
