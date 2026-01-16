function generateSVG(jsonString, options = {}) {
    let nodeSpacing = 30;
    let levelSpacing = 100;
    const maxNodeWidth = 300;
    const lineHeight = 22;
    const fontSize = 16;
    const titleFontSize = 26;
    const titleLineHeight = 32;
    const titleFontWeight = '700';
    const horizontalPadding = 22;
    const verticalPadding = 8;
    let linkWidth = 4;
    let nodeRadius = 14;
    let fontFamily = 'system-ui';
    let fontWeight = '400';
    const palette = [
        'rgb(255, 127, 15)',
        'rgb(0, 191, 191)',
        'rgb(255, 64, 129)',
        'rgb(206, 91, 255)',
        'rgb(50, 205, 53)',
        'rgb(255, 191, 0)',
        'rgb(3, 169, 244)',
        'rgb(0, 183, 165)'
    ];

    const defaultBranchColor = '#03a9f4';
    let branchAlignmentMode = 'auto';
    let mindmapStyle = '1';

    const editingId = (typeof window !== 'undefined' && window.__editingNodeId != null) ? String(window.__editingNodeId) : null;

    const __mmwCanvas = document.createElement('canvas');
    const __mmwCtx = __mmwCanvas.getContext('2d');
    function setMeasurementFont(weight, size) {
        __mmwCtx.font = `${weight} ${size}px ${fontFamily}`;
    }
    function measureTextWidthAccurate(text, weight = fontWeight, size = fontSize) {
        setMeasurementFont(weight, size);
        return __mmwCtx.measureText(text ?? '').width;
    }
    function wrapTextToWidthAccurate(text, maxWidth, weight = fontWeight, size = fontSize) {
        setMeasurementFont(weight, size);
        const tokens = String(text ?? '').match(/(\s+|[^\s]+)/g) || [];
        const lines = [];
        let line = '';
        let pendingWS = '';

        for (const tok of tokens) {
            const isWS = /^\s+$/.test(tok);

            if (isWS) {
                pendingWS += tok;
                continue;
            }

            const candidate = line ? line + pendingWS + tok : tok;
            if (measureTextWidthAccurate(candidate, weight, size) <= maxWidth) {
                line = candidate;
                pendingWS = '';
            } else {
                if (line) {
                    lines.push(line.replace(/\s+$/g, ''));
                }
                if (measureTextWidthAccurate(tok, weight, size) <= maxWidth) {
                    line = tok;
                } else {
                    let start = 0;
                    while (start < tok.length) {
                        let end = start + 1;
                        let slice = tok.slice(start, end);
                        while (end <= tok.length && measureTextWidthAccurate(slice, weight, size) <= maxWidth) {
                            end++;
                            slice = tok.slice(start, end);
                        }
                        const fit = tok.slice(start, end - 1);
                        if (!fit) break;
                        lines.push(fit);
                        start = end - 1;
                    }
                    line = '';
                }
                pendingWS = '';
            }
        }

        if (line) {
            lines.push(line.replace(/\s+$/g, ''));
        }

        return lines;
    }

    let settings = null;
    let parsed = null;

    function escapeXml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    function escapeAttr(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;');
    }
    function getDomain(url) {
        try {
            if (!url.includes('://')) url = 'https://' + url;
            const u = new URL(url);
            return u.hostname.replace(/^www\./, '');
        } catch (e) {
            return url.split('/')[0] || url;
        }
    }

    function parseInlineMarkdown(text) {
        const runs = [];
        let i = 0;
        let buf = '';
        const state = { bold: false, italic: false, strike: false };

        function pushBuf() {
            if (buf) {
                const urlRegex = /([a-z0-9+.-]+:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-z]{2,}\/[^\s]*)/gi;
                let lastIdx = 0;
                let match;
                const tempBuf = buf;
                buf = '';
                while ((match = urlRegex.exec(tempBuf)) !== null) {
                    let url = match[0];
                    let before = tempBuf.slice(lastIdx, match.index);

                    let punc = "";
                    while (url.length > 0 && /[,.!?;:)]+$/.test(url)) {
                        punc = url[url.length - 1] + punc;
                        url = url.slice(0, -1);
                    }

                    if (before) {
                        runs.push({ text: before, bold: state.bold, italic: state.italic, strike: state.strike, href: null });
                    }
                    if (url) {
                        let href = url;
                        if (!/^[a-z0-9+.-]+:\/\//i.test(href)) {
                            href = 'https://' + href;
                        }
                        runs.push({ text: url, bold: state.bold, italic: state.italic, strike: state.strike, href: href });
                    }
                    if (punc) {
                        runs.push({ text: punc, bold: state.bold, italic: state.italic, strike: state.strike, href: null });
                    }

                    lastIdx = urlRegex.lastIndex;
                }
                const remaining = tempBuf.slice(lastIdx);
                if (remaining) {
                    runs.push({ text: remaining, bold: state.bold, italic: state.italic, strike: state.strike, href: null });
                }
            }
        }

        while (i < text.length) {
            const ch = text[i];

            if (ch === '!' && text[i + 1] === '[') {
                const altStart = i + 2;
                const altEnd = text.indexOf(']', altStart);
                if (altEnd !== -1 && text[altEnd + 1] === '(') {
                    const urlStart = altEnd + 2;
                    const urlEnd = text.indexOf(')', urlStart);
                    if (urlEnd !== -1) {
                        const alt = text.slice(altStart, altEnd);
                        const url = text.slice(urlStart, urlEnd).trim();
                        pushBuf();
                        runs.push({
                            text: alt,
                            bold: state.bold,
                            italic: state.italic,
                            strike: state.strike,
                            href: null,
                            imageUrl: url
                        });
                        i = urlEnd + 1;
                        continue;
                    }
                }
                buf += ch;
                i++;
                continue;
            }

            if (ch === '[') {
                const labelStart = i + 1;
                const labelEnd = text.indexOf(']', labelStart);
                if (labelEnd !== -1 && text[labelEnd + 1] === '(') {
                    const urlStart = labelEnd + 2;
                    const urlEnd = text.indexOf(')', urlStart);
                    if (urlEnd !== -1) {
                        const label = text.slice(labelStart, labelEnd);
                        const url = text.slice(urlStart, urlEnd).trim();
                        const isHttp = /^https?:\/\//i.test(url);
                        pushBuf();
                        const labelRuns = parseInlineMarkdown(label);
                        labelRuns.forEach(r => {
                            runs.push({
                                text: r.text,
                                bold: r.bold || state.bold,
                                italic: r.italic || state.italic,
                                strike: r.strike || state.strike,
                                href: isHttp ? url : null
                            });
                        });
                        i = urlEnd + 1;
                        continue;
                    }
                }
                buf += ch;
                i++;
                continue;
            }

            if (text[i] === '~' && text[i + 1] === '~') {
                pushBuf();
                state.strike = !state.strike;
                i += 2;
                continue;
            }

            if (text[i] === '*' && text[i + 1] === '*') {
                pushBuf();
                state.bold = !state.bold;
                i += 2;
                continue;
            }

            if (text[i] === '*') {
                pushBuf();
                state.italic = !state.italic;
                i += 1;
                continue;
            }

            buf += ch;
            i++;
        }
        pushBuf();
        return runs;
    }

    function runsToTokens(runs) {
        const tokens = [];
        for (const r of runs) {
            if (!r.text && !r.imageUrl) continue;

            const parts = String(r.text || '').match(/(\s+|[^\s]+)/g) || [];
            for (const part of parts) {
                tokens.push({
                    text: part,
                    isSpace: /^\s+$/.test(part),
                    bold: !!r.bold,
                    italic: !!r.italic,
                    strike: !!r.strike,
                    href: r.href || null,
                    imageUrl: r.imageUrl || null
                });
            }

            if (r.imageUrl && parts.length === 0) {
                tokens.push({
                    text: '',
                    isSpace: false,
                    bold: !!r.bold,
                    italic: !!r.italic,
                    strike: !!r.strike,
                    href: r.href || null,
                    imageUrl: r.imageUrl
                });
            }
        }
        return tokens;
    }

    function compressTokens(tokens) {
        const out = [];
        for (const t of tokens) {
            const prev = out[out.length - 1];
            if (
                prev &&
                prev.bold === t.bold &&
                prev.italic === t.italic &&
                prev.strike === t.strike &&
                prev.href === t.href &&
                prev.imageUrl === t.imageUrl &&
                prev.isSpace === t.isSpace
            ) {
                prev.text += t.text;
            } else {
                out.push({ ...t });
            }
        }
        return out;
    }

    function measurePieceWidth(text, weight, size) {
        return measureTextWidthAccurate(text, weight, size);
    }

    function wrapRunsToWidth(runs, maxWidthPx, baseWeight, size) {
        const tokens = runsToTokens(runs);
        const lines = [];
        let line = [];
        let lineWidth = 0;
        let maxLineWidth = 0;

        function pushLine() {
            const merged = compressTokens(line);
            lines.push(merged);
            maxLineWidth = Math.max(maxLineWidth, lineWidth);
            line = [];
            lineWidth = 0;
        }

        function tokenW(tok) {
            const w = tok.bold ? '700' : baseWeight;
            return measurePieceWidth(tok.text, w, size);
        }

        for (let idx = 0; idx < tokens.length; idx++) {
            const tok = tokens[idx];

            if (tok.isSpace && line.length === 0) continue;

            let w = tokenW(tok);

            if (tok.imageUrl) {
                w = 200;
            }

            if (lineWidth + w <= maxWidthPx || line.length === 0) {
                line.push(tok);
                lineWidth += w;
                continue;
            }

            if (!tok.isSpace && !tok.imageUrl) {
                if (w > maxWidthPx && line.length === 0) {
                    let start = 0;
                    while (start < tok.text.length) {
                        let remaining = maxWidthPx - lineWidth;
                        if (remaining <= 0 && line.length > 0) {
                            pushLine();
                            remaining = maxWidthPx;
                        }
                        let end = start + 1;
                        let slice = tok.text.slice(start, end);
                        while (
                            end <= tok.text.length &&
                            measurePieceWidth(slice, tok.bold ? '700' : baseWeight, size) <= remaining
                        ) {
                            end++;
                            slice = tok.text.slice(start, end);
                        }
                        const fit = tok.text.slice(start, end - 1);
                        if (fit) {
                            const frag = { ...tok, text: fit };
                            line.push(frag);
                            lineWidth += measurePieceWidth(fit, tok.bold ? '700' : baseWeight, size);
                        }
                        start = end - 1;
                        if (start < tok.text.length) {
                            pushLine();
                        }
                    }
                    continue;
                }
            }

            pushLine();
            if (!tok.isSpace && !tok.imageUrl) {
                line.push(tok);
                lineWidth = tokenW(tok);
            } else if (tok.imageUrl) {
                line.push(tok);
                lineWidth = 200;
            } else {
                lineWidth = 0;
            }
        }

        const merged = compressTokens(line);
        lines.push(merged);
        maxLineWidth = Math.max(maxLineWidth, lineWidth);

        return { lines, maxLineWidth };
    }

    function buildHierarchy(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            const root = { text: 'Root', children: [], level: 0, id: 'root' };
            if (data['mm-node']) {
                const jsonNode = data['mm-node'];
                const hierarchyNode = convertJsonToNode(jsonNode, 1, '0');
                root.children.push(hierarchyNode);
            }
            return root;
        } catch (e) {
            console.error('Invalid JSON:', e);
            return { text: 'Root', children: [], level: 0, id: 'root' };
        }
    }

    function convertJsonToNode(jsonNode, level, pathId) {
        const node = {
            text: jsonNode.content || '',
            children: [],
            level: level,
            parent: null,
            id: pathId,
            branchColor: jsonNode.branchColor,
            collapsed: !!jsonNode.collapsed,
            notes: jsonNode.notes || '',
            citations: jsonNode.citations || []
        };
        if (jsonNode.children && Array.isArray(jsonNode.children)) {
            jsonNode.children.forEach((childJson, index) => {
                const childPathId = `${pathId}-${index}`;
                const childNode = convertJsonToNode(childJson, level + 1, childPathId);
                childNode.parent = node;
                node.children.push(childNode);
            });
        }
        if (jsonNode.collapsed) {
            node.collapsed = true;
        }
        return node;
    }

    function assignBranchColors(node) {
        function compute(currentNode, inheritedColor) {
            let effectiveColor = inheritedColor;

            if (currentNode.branchColor) {
                effectiveColor = currentNode.branchColor;
            }

            if (!effectiveColor && currentNode.level === 2 && currentNode.parent && currentNode.parent.level === 1) {
                const index = currentNode.parent.children.indexOf(currentNode);
                effectiveColor = palette[index % palette.length];
            }

            currentNode._computedColor = effectiveColor;

            currentNode.children.forEach(child => compute(child, effectiveColor));
        }

        compute(node, null);
    }

    function assignSides(hierarchy) {
        const center = hierarchy && Array.isArray(hierarchy.children)
            ? hierarchy.children.find(n => n && n.id === '0')
            : null;
        if (!center || !Array.isArray(center.children) || center.children.length === 0) return;

        const propagate = (node, side) => {
            node.side = side;
            node.children.forEach(c => propagate(c, side));
        };

        if (branchAlignmentMode === 'left') {
            center.children.forEach(n => propagate(n, 'left'));
            return;
        }
        if (branchAlignmentMode === 'right') {
            center.children.forEach(n => propagate(n, 'right'));
            return;
        }

        const count = center.children.length;
        if (branchAlignmentMode === 'auto') {
            center.children.forEach(n => propagate(n, 'right'));

            assignPositions(hierarchy);
            assignXPositions(hierarchy, 0);
            let tmpExt = createExtents();
            collectExtents(hierarchy, tmpExt);
            const widthPx = tmpExt.maxX - tmpExt.minX;

            if (widthPx >= 1000) {
                if (typeof __mmwAssignSidesBalanced === 'function') {
                    __mmwAssignSidesBalanced(hierarchy);
                } else {
                    const leftCount = Math.floor(count / 2);
                    const left = center.children.slice(0, leftCount);
                    const right = center.children.slice(leftCount);
                    left.forEach(n => propagate(n, 'left'));
                    right.forEach(n => propagate(n, 'right'));
                }
            }
            return;
        }

        const leftCount = Math.floor(count / 2);
        const left = center.children.slice(0, leftCount);
        const right = center.children.slice(leftCount);
        left.forEach(n => propagate(n, 'left'));
        right.forEach(n => propagate(n, 'right'));
    }
    function __mmwAssignSidesBalanced(hierarchy) {
        const center = hierarchy && Array.isArray(hierarchy.children)
            ? hierarchy.children.find(n => n && n.id === '0')
            : null;
        if (!center || !Array.isArray(center.children) || center.children.length === 0) return;
        const propagate = (node, side) => { node.side = side; node.children.forEach(c => propagate(c, side)); };
        const count = center.children.length;
        const leftCount = Math.floor(count / 2);
        const left = center.children.slice(0, leftCount);
        const right = center.children.slice(leftCount);
        left.forEach(n => propagate(n, 'left'));
        right.forEach(n => propagate(n, 'right'));
    }
    function __mmwAssignSidesRight(hierarchy) {
        const center = hierarchy && Array.isArray(hierarchy.children)
            ? hierarchy.children.find(n => n && n.id === '0')
            : null;
        if (!center || !Array.isArray(center.children) || center.children.length === 0) return;
        const propagate = (node, side) => { node.side = side; node.children.forEach(c => propagate(c, side)); };
        center.children.forEach(n => propagate(n, 'right'));
    }
    window.__mmwAssignSidesBalanced = __mmwAssignSidesBalanced;
    window.__mmwAssignSidesRight = __mmwAssignSidesRight;

    window.assignBranchColors = assignBranchColors;
    window.processNode = processNode;
    window.assignPositions = assignPositions;
    window.assignXPositions = assignXPositions;
    window.createExtents = createExtents;
    window.collectExtents = collectExtents;
    window.shiftCoordinates = shiftCoordinates;
    window.drawNodeWithId = drawNodeWithId;
    window.assignSides = assignSides;

    function processNode(node) {
        const isEditingThis = editingId !== null && String(node.id) === editingId;
        const isTitleNode = node.id === '0';

        if ((!node.text || node.text.trim() === '') && !isEditingThis) {
            node.__mdLines = [];
            node.textLines = [];
            node.rectWidth = 0;
            node.rectHeight = 0;
        } else {
            const effectiveText = (!node.text || node.text.trim() === '') ? ' ' : String(node.text);

            const currentFontSize = isTitleNode ? titleFontSize : fontSize;
            const currentLineHeight = isTitleNode ? titleLineHeight : lineHeight;
            const currentFontWeight = isTitleNode ? titleFontWeight : fontWeight;

            const paragraphs = effectiveText.split('\n');
            const mdLines = [];
            let maxLineW = 0;

            for (const para of paragraphs) {
                const runs = parseInlineMarkdown(para);
                const { lines, maxLineWidth } = wrapRunsToWidth(runs, maxNodeWidth, currentFontWeight, currentFontSize);
                if (lines.length === 0) {
                    mdLines.push([]);
                } else {
                    lines.forEach(line => mdLines.push(line));
                }
                maxLineW = Math.max(maxLineW, maxLineWidth);
            }

            let textHeight = 0;
            if (mdLines.length > 0) {
                mdLines.forEach(line => {
                    const hasImage = line.some(seg => seg.imageUrl);
                    if (hasImage) {
                        textHeight += 110;
                    } else {
                        textHeight += currentLineHeight;
                    }
                });
            } else if (isEditingThis) {
                textHeight = currentLineHeight;
            }

            node.__mdLines = mdLines;
            node.textLines = mdLines.map(segLine => escapeXml(segLine.map(s => s.text).join('')));

            const textWidth = Math.ceil(maxLineW);
            node.rectWidth = Math.max(textWidth + horizontalPadding * 2, horizontalPadding * 2 + 1);
            if (node.notes && node.notes.trim().length > 0) {
                node.rectWidth += 30;
            }
            node.rectHeight = textHeight + verticalPadding * 2;

            if (isTitleNode && contextLinks.length > 0) {
                const badgeFontSize = 10;
                const badgeHPadding = 12;
                const iconSectionWidth = 14 + 4;
                const badgeGap = 6;
                const badgeHeight = 22;
                const rowSpacing = 6;

                const badges = contextLinks.map(link => {
                    const domain = getDomain(link);
                    const w = measureTextWidthAccurate(domain, fontWeight, badgeFontSize) + badgeHPadding + iconSectionWidth;
                    return { link, domain, width: w };
                });

                const availableWidth = node.rectWidth;

                const rows = [];
                let currentRow = [];
                let currentX = 0;

                const visibleLimit = 2;
                const hasOverflow = badges.length > visibleLimit;
                const badgesToShow = hasOverflow ? badges.slice(0, visibleLimit) : badges;

                badgesToShow.forEach(b => {
                    if (currentX + b.width > availableWidth && currentRow.length > 0) {
                        rows.push(currentRow);
                        currentRow = [];
                        currentX = 0;
                    }
                    currentRow.push({ ...b, type: 'badge', x: currentX });
                    currentX += b.width + badgeGap;
                });

                if (hasOverflow) {
                    const dotWidth = 28;
                    if (currentX + dotWidth > availableWidth && currentRow.length > 0) {
                        rows.push(currentRow);
                        currentRow = [];
                        currentX = 0;
                    }
                    currentRow.push({ type: 'overflow', x: currentX, width: dotWidth });
                }
                if (currentRow.length > 0) rows.push(currentRow);

                node._badgeLayout = {
                    rows,
                    badgeHeight,
                    rowSpacing
                };

                const totalBadgeHeight = rows.length * (badgeHeight + rowSpacing);
                node._extraHeight = totalBadgeHeight + 4;
            }
        }

        node.children.forEach(processNode);
    }

    function assignPositions(node, startY = 0) {
        let currentY = startY;

        if (node.collapsed) {
            node.totalSubtreeHeight = node.rectHeight;
            node.y = startY + node.rectHeight / 2;
            return;
        }

        node.children.forEach((child) => {
            assignPositions(child, currentY);
            const childrenHeight = child.totalSubtreeHeight || (child.rectHeight + (child._extraHeight || 0));
            currentY += childrenHeight + nodeSpacing;
        });

        node.totalSubtreeHeight = Math.max((node.rectHeight || 0) + (node._extraHeight || 0), currentY - startY - nodeSpacing);

        if (node.children.length > 0) {
            const firstChild = node.children[0];
            const lastChild = node.children[node.children.length - 1];
            node.y = (firstChild.y + lastChild.y) / 2;
        } else {
            node.y = startY + (node.rectHeight || 0) / 2;
        }
        if (mindmapStyle === '3') node.y += (node.rectHeight || 0) / 2;

        if (node.children && node.children.length) {
            const leftChildren = node.children.filter(c => c.side === 'left');
            const rightChildren = node.children.filter(c => c.side === 'right');

            function centerGroupAround(group) {
                if (!group.length) return;
                const first = group[0];
                const last = group[group.length - 1];
                const groupCenter = (first.y + last.y) / 2;
                const delta = node.y - groupCenter;
                if (Math.abs(delta) > 0.001) {
                    group.forEach(ch => shiftSubtreeY(ch, delta));
                }
            }

            if (leftChildren.length && rightChildren.length) {
                centerGroupAround(leftChildren);
                centerGroupAround(rightChildren);
            }
        }
    }

    function assignXPositions(node, x) {
        node.x = x;
        if (node.collapsed) return;
        node.children.forEach((child) => {
            const isLeft = child.side === 'left';
            const parentIsTitle = node && node.id === '0';
            const spacing = parentIsTitle ? Math.max(levelSpacing, 100) : levelSpacing;
            const childX = isLeft
                ? node.x - spacing - (child.rectWidth || 0)
                : node.x + (node.rectWidth || 0) + spacing;
            assignXPositions(child, childX);
        });
    }

    function createExtents() {
        return {
            minX: Infinity,
            minY: Infinity,
            maxX: -Infinity,
            maxY: -Infinity
        };
    }

    function getBezierBounds(x0, y0, x1, y1, x2, y2, x3, y3) {
        let xs = [x0, x3];
        let a = x0, b = x1, c = x2, d = x3;
        let p = b - a, q = c - b, r = d - c;
        let A = p - 2 * q + r;
        let B = 2 * q - 2 * p;
        let C = p;

        if (Math.abs(A) > 1e-6) {
            let disc = B * B - 4 * A * C;
            if (disc >= 0) {
                let sqrtD = Math.sqrt(disc);
                let t1 = (-B - sqrtD) / (2 * A);
                let t2 = (-B + sqrtD) / (2 * A);
                if (t1 > 0 && t1 < 1) {
                    let x = Math.pow(1 - t1, 3) * a + 3 * Math.pow(1 - t1, 2) * t1 * b + 3 * (1 - t1) * t1 * t1 * c + t1 * t1 * t1 * d;
                    xs.push(x);
                }
                if (t2 > 0 && t2 < 1) {
                    let x = Math.pow(1 - t2, 3) * a + 3 * Math.pow(1 - t2, 2) * t2 * b + 3 * (1 - t2) * t2 * t2 * c + t2 * t2 * t2 * d;
                    xs.push(x);
                }
            }
        } else if (Math.abs(B) > 1e-6) {
            let t = -C / B;
            if (t > 0 && t < 1) {
                let x = Math.pow(1 - t, 3) * a + 3 * Math.pow(1 - t, 2) * t * b + 3 * (1 - t) * t * t * c + t * t * t * d;
                xs.push(x);
            }
        }

        let minX = Math.min(...xs);
        let maxX = Math.max(...xs);
        let minY = Math.min(y0, y3);
        let maxY = Math.max(y0, y3);

        return { minX, maxX, minY, maxY };
    }

    function collectExtents(node, extents) {
        if (node.textLines && node.textLines.length) {
            const left = node.x;
            const right = node.x + node.rectWidth;
            let top, bottom;
            if (mindmapStyle === '3') {
                top = node.y - node.rectHeight;
                bottom = node.y + (node._extraHeight || 0);
            } else {
                top = node.y - node.rectHeight / 2;
                bottom = node.y + node.rectHeight / 2 + (node._extraHeight || 0);
            }

            extents.minX = Math.min(extents.minX, left);
            extents.maxX = Math.max(extents.maxX, right);
            extents.minY = Math.min(extents.minY, top);
            extents.maxY = Math.max(extents.maxY, bottom);
        }

        if (node.collapsed) {
            const isLeft = node.side === 'left';
            const startX = isLeft ? node.x : node.x + (node.rectWidth || 0);
            const expandX = isLeft ? startX - 40 : startX + 40;
            const r = 12;
            extents.minX = Math.min(extents.minX, expandX - r);
            extents.maxX = Math.max(extents.maxX, expandX + r);
            return;
        }

        node.children.forEach((child) => {
            if (
                typeof node.x === 'number' &&
                typeof node.y === 'number' &&
                typeof child.x === 'number' &&
                typeof child.y === 'number'
            ) {
                const isLeft = child.side === 'left';
                const parentIsTitle = node && node.id === '0';
                const effectiveSpacing = parentIsTitle ? Math.max(levelSpacing, 100) : levelSpacing;
                const curve = parentIsTitle ? effectiveSpacing * 0.6 : effectiveSpacing * 0.5;
                const startX = isLeft ? node.x : node.x + (node.rectWidth || 0);
                const startY = node.y;
                const endX = isLeft ? child.x + (child.rectWidth || 0) : child.x;
                const endY = child.y;
                const control1X = isLeft ? startX - curve : startX + curve;
                const control1Y = startY;
                const control2X = isLeft ? endX + curve : endX - curve;
                const control2Y = endY;

                const bounds = getBezierBounds(startX, startY, control1X, control1Y, control2X, control2Y, endX, endY);
                extents.minX = Math.min(extents.minX, bounds.minX);
                extents.maxX = Math.max(extents.maxX, bounds.maxX);
                extents.minY = Math.min(extents.minY, bounds.minY);
                extents.maxY = Math.max(extents.maxY, bounds.maxY);
            }
            collectExtents(child, extents);
        });
    }

    function shiftCoordinates(node, offsetX, offsetY) {
        if (typeof node.x === 'number') node.x += offsetX;
        if (typeof node.y === 'number') node.y += offsetY;
        node.children.forEach((child) => shiftCoordinates(child, offsetX, offsetY));
    }

    function shiftSubtreeY(node, deltaY) {
        if (!Number.isFinite(deltaY) || deltaY === 0) return;
        (function rec(n) {
            if (typeof n.y === 'number') n.y += deltaY;
            n.children.forEach(rec);
        })(node);
    }

    function drawNodeWithId(node, parent) {
        let svg = '';
        const branchColor = node._computedColor || node.branchColor || defaultBranchColor;

        if (
            parent &&
            parent.textLines &&
            parent.textLines.length &&
            typeof parent.x === 'number' &&
            typeof parent.y === 'number' &&
            typeof node.x === 'number' &&
            typeof node.y === 'number'
        ) {
            const isLeft = node.side === 'left';
            const parentIsTitle = parent && parent.id === '0';
            const effectiveSpacing = parentIsTitle ? Math.max(levelSpacing, 100) : levelSpacing;
            const curve = parentIsTitle ? effectiveSpacing * 0.6 : effectiveSpacing * 0.5;
            const startX = isLeft ? parent.x : parent.x + (parent.rectWidth || 0);
            const startY = parent.y;
            const endX = isLeft ? node.x + (node.rectWidth || 0) : node.x;
            const endY = node.y;
            const control1X = isLeft ? startX - curve : startX + curve;
            const control2X = isLeft ? endX + curve : endX - curve;

            let linkSvg = '';
            if (mindmapStyle === '3') {
                linkSvg = `<line class="mm-link" data-link-id="${node.id}" x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${branchColor}" stroke-width="${linkWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" pointer-events="none"/>`;
            } else {
                linkSvg = `<path class="mm-link" data-link-id="${node.id}" d="M ${startX},${startY} C ${control1X},${startY} ${control2X},${endY} ${endX},${endY}" stroke="${branchColor}" stroke-width="${linkWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" pointer-events="none"/>`;
            }
            svg += linkSvg;
        }

        if (node.collapsed && node.children.length > 0) {
            const isLeft = node.side === 'left';
            const startX = isLeft ? node.x : node.x + (node.rectWidth || 0);
            const startY = node.y;
            const endX = isLeft ? startX - 40 : startX + 40;
            const endY = startY;

            let ind = '';
            svg += `<line class="mm-collapsed-link" data-link-id="${node.id}-collapsed" x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${branchColor}" stroke-width="${linkWidth}" stroke-linecap="round" stroke-dasharray="4 6"/>`;

            const rotateTransform = isLeft ? ' rotate(180)' : '';
            svg += `<g class="mm-expand-btn" data-for-id="${node.id}" transform="translate(${endX}, ${endY})${rotateTransform}" style="cursor: pointer; pointer-events: all;">`;
            svg += `<circle cx="0" cy="0" r="12" fill="${branchColor}" stroke="none"/>`;
            svg += `<path d="m-2 -4 4 4-4 4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
            svg += `</g>`;
        } else {


            if (node.textLines && node.textLines.length) {
                const isTitleNode = node.id === '0';
                const currentFontSize = isTitleNode ? titleFontSize : fontSize;
                const currentLineHeight = isTitleNode ? titleLineHeight : lineHeight;
                const currentFontWeight = isTitleNode ? titleFontWeight : fontWeight;

                let nodeTransformY = mindmapStyle === '3' ? node.y - node.rectHeight : node.y - node.rectHeight / 2;
                svg += `<g class="mm-node" data-node-id="${node.id}" transform="translate(${node.x},${nodeTransformY})">`;
                if (mindmapStyle !== '3' && mindmapStyle !== '2') {
                    svg += `<rect x="0" y="0" width="${node.rectWidth}" height="${node.rectHeight}" rx="${nodeRadius}" ry="${nodeRadius}" fill="${branchColor}" fill-opacity="0.18" stroke="none"/>`;
                } else {
                    svg += `<rect x="0" y="0" width="${node.rectWidth}" height="${node.rectHeight}" rx="${nodeRadius}" ry="${nodeRadius}" fill="${branchColor}" fill-opacity="0" stroke="none"/>`;
                }
                if (isTitleNode) {
                    textAnchor = 'middle';
                    textX = node.rectWidth / 2;
                    if (node.notes && node.notes.trim().length > 0) {
                        textX -= 8;
                    }
                } else if (node.rectWidth <= 150) {
                    textAnchor = 'middle';
                    textX = node.rectWidth / 2;
                    if (node.notes && node.notes.trim().length > 0) {
                        textX -= 8;
                    }
                } else if (node.side === 'left') {
                    textAnchor = 'start';
                    textX = horizontalPadding;
                } else {
                    textAnchor = 'start';
                    textX = horizontalPadding;
                }
                if (mindmapStyle === '3') {
                    textAnchor = 'start';
                    textX = horizontalPadding;
                }

                if (Array.isArray(node.__mdLines) && node.__mdLines.length) {
                    let lineData = [];
                    let currentY = verticalPadding;

                    node.__mdLines.forEach(lineSegs => {
                        const hasImage = lineSegs.some(s => s.imageUrl);
                        lineData.push({ y: currentY, segs: lineSegs, isImage: hasImage });
                        currentY += hasImage ? 110 : currentLineHeight;
                    });

                    lineData.forEach(line => {
                        if (line.isImage) {
                            line.segs.forEach(seg => {
                                if (seg.imageUrl && /^https?:\/\//i.test(seg.imageUrl)) {
                                    const safeImageUrl = escapeAttr(seg.imageUrl);
                                    const imageAlt = escapeAttr(seg.text);
                                    svg += `<image href="${safeImageUrl}" alt="${imageAlt}" x="${horizontalPadding}" y="${line.y}" width="200" height="100" preserveAspectRatio="xMidYMid meet" opacity="0.8"/>`;
                                }
                            });
                        }
                    });

                    {
                        const __mmwTxtOp = (node.id === editingId) ? 0 : 1;
                        svg += `<text opacity="${__mmwTxtOp}" x="${textX}" y="${verticalPadding + currentFontSize}" font-family="${fontFamily}" font-size="${currentFontSize}px" font-weight="${currentFontWeight}" fill="var(--text-color)" text-anchor="${textAnchor}" xml:space="preserve">`;
                        let firstTextLine = true;
                        lineData.forEach(line => {
                            if (!line.isImage) {
                                const yBaseline = line.y + currentFontSize;
                                let lineContent = '';
                                line.segs.forEach(seg => {
                                    const fw = seg.bold ? ` font-weight="700"` : '';
                                    const fs = seg.italic ? ` font-style="italic"` : '';
                                    const tdSpan = seg.strike ? ` style="text-decoration: line-through;"` : '';
                                    const content = (seg.text && seg.text.length) ? escapeXml(seg.text) : '&#8203;';
                                    if (seg.href && /^[a-z0-9+.-]+:\/\//i.test(seg.href)) {
                                        const safeHref = escapeAttr(seg.href);
                                        lineContent += `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; cursor: pointer; pointer-events: all;"><tspan${fw}${fs}${tdSpan}>${content}</tspan></a>`;
                                    } else {
                                        lineContent += `<tspan${fw}${fs}${tdSpan}>${content}</tspan>`;
                                    }
                                });

                                if (firstTextLine) {
                                    svg += `<tspan x="${textX}" y="${yBaseline}">${lineContent}</tspan>`;
                                    firstTextLine = false;
                                } else {
                                    svg += `<tspan x="${textX}" dy="${currentLineHeight}">${lineContent}</tspan>`;
                                }
                            }
                        });
                        svg += `</text>`;
                    }
                    if (mindmapStyle === '3') {
                        svg += `<line x1="0" y1="${node.rectHeight}" x2="${node.rectWidth}" y2="${node.rectHeight}" stroke="${branchColor}" stroke-width="${linkWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" pointer-events="none" />`;
                    }
                } else if (node.textLines.length > 0) {
                    {
                        const __mmwTxtOp = (node.id === editingId) ? 0 : 1;
                        svg += `<text opacity="${__mmwTxtOp}" x="${textX}" y="${verticalPadding + currentFontSize}" font-family="${fontFamily}" font-size="${currentFontSize}px" font-weight="${currentFontWeight}" fill="var(--text-color)" text-anchor="${textAnchor}" xml:space="preserve">`;
                        let first = true;
                        node.textLines.forEach((line) => {
                            const content = (line && line.length) ? line : '&#8203;';
                            if (first) {
                                svg += `<tspan x="${textX}">${content}</tspan>`;
                                first = false;
                            } else {
                                svg += `<tspan x="${textX}" dy="${currentLineHeight}">${content}</tspan>`;
                            }
                        });
                        svg += `</text>`;
                    }
                    if (mindmapStyle === '3') {
                        svg += `<line x1="0" y1="${node.rectHeight}" x2="${node.rectWidth}" y2="${node.rectHeight}" stroke="${branchColor}" stroke-width="${linkWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" pointer-events="none" />`;
                    }
                }
                const addRadius = 8;
                const addOffset = -2;
                const __mmwIsLeftForBtn = node.side === 'left';
                const __mmwAddX = __mmwIsLeftForBtn ? (0 - addOffset) : (node.rectWidth + addOffset);
                let noteContent = node.notes || '';
                const citationMarker = '<!--MM_CITATIONS_DATA:';
                const citationIdx = noteContent.lastIndexOf(citationMarker);

                if (citationIdx !== -1) {
                    noteContent = noteContent.substring(0, citationIdx);
                }

                const hasNotes = noteContent.trim().length > 0;

                if (hasNotes) {
                    const iconSize = 16;
                    const rightPadding = 12;
                    const noteIndX = node.rectWidth - rightPadding - iconSize;

                    let noteIndY;
                    const isMultiLine = node.textLines.length > 1;

                    if (isMultiLine) {
                        const isTitleNode = node.id === '0';
                        const currentLineHeight = isTitleNode ? titleLineHeight : lineHeight;
                        noteIndY = verticalPadding + (currentLineHeight - iconSize) / 2;
                    } else {
                        noteIndY = (node.rectHeight - iconSize) / 2;
                    }

                    const btnHeight = iconSize + 10;
                    const btnWidth = iconSize + 10;

                    svg += `<g class="node-note-indicator" data-node-id="${node.id}" transform="translate(${noteIndX}, ${noteIndY})" onclick="window.openNotesDrawer('${node.id}'); arguments[0].stopPropagation();" style="cursor: pointer;">`;
                    svg += `<rect x="-5" y="-5" width="${btnWidth}" height="${btnHeight}" fill="transparent" stroke="none"/>`;
                    svg += `<svg x="0" y="0" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${branchColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 5H3"/><path d="M15 12H3"/><path d="M17 19H3"/></svg>`;
                    svg += `</g>`;
                }

                if (!node.collapsed) {
                    if (mindmapStyle !== '2' && mindmapStyle !== '3') {
                        svg += `<g class="mm-add-btn" data-for-id="${node.id}" transform="translate(${__mmwAddX}, ${node.rectHeight / 2})" style="cursor: pointer; opacity: 0; pointer-events: none; z-index: 10000;">`;
                        svg += `<circle cx="0" cy="0" r="${addRadius}" fill="#ffffff" stroke="none"></circle>`;
                        svg += `<path d="M -5 0 H 5 M 0 -5 V 5" stroke="${branchColor}" stroke-width="1.5" stroke-linecap="round"></path>`;
                        svg += `</g>`;
                    }
                }
                svg += `</g>`;
            }

            node.children.forEach((child) => {
                svg += drawNodeWithId(child, node);
            });

            return svg;
        }
    }

    function __mmwCollectParts(node, parent, out) {
        const branchColor = node._computedColor || node.branchColor || defaultBranchColor;

        if (
            parent &&
            parent.textLines &&
            parent.textLines.length &&
            typeof parent.x === 'number' &&
            typeof parent.y === 'number' &&
            typeof node.x === 'number' &&
            typeof node.y === 'number'
        ) {
            const isLeft = node.side === 'left';
            const parentIsTitle = parent && parent.id === '0';
            const effectiveSpacing = parentIsTitle ? Math.max(levelSpacing, 100) : levelSpacing;
            const curve = parentIsTitle ? effectiveSpacing * 0.6 : effectiveSpacing * 0.5;
            const startX = isLeft ? parent.x : parent.x + (parent.rectWidth || 0);
            const startY = parent.y;
            const endX = isLeft ? node.x + (node.rectWidth || 0) : node.x;
            const endY = node.y;
            const control1X = isLeft ? startX - curve : startX + curve;
            const control2X = isLeft ? endX + curve : endX - curve;

            let linkSvg = '';
            if (mindmapStyle === '3') {
                linkSvg = `<line class="mm-link" data-link-id="${node.id}" x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${branchColor}" stroke-width="${linkWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" pointer-events="none"/>`;
            } else {
                linkSvg = `<path class="mm-link" data-link-id="${node.id}" d="M ${startX},${startY} C ${control1X},${startY} ${control2X},${endY} ${endX},${endY}" stroke="${branchColor}" stroke-width="${linkWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" pointer-events="none"/>`;
            }
            out.links.push(linkSvg);
        }

        if (node.textLines && node.textLines.length) {
            const isTitleNode = node.id === '0';
            const currentFontSize = isTitleNode ? titleFontSize : fontSize;
            const currentLineHeight = isTitleNode ? titleLineHeight : lineHeight;
            const currentFontWeight = isTitleNode ? titleFontWeight : fontWeight;

            let s = '';
            let nodeTransformY = mindmapStyle === '3' ? node.y - node.rectHeight : node.y - node.rectHeight / 2;
            s += `<g class="mm-node" data-node-id="${node.id}" transform="translate(${node.x},${nodeTransformY})">`;
            if (mindmapStyle !== '3' && mindmapStyle !== '2') {
                s += `<rect x="0" y="0" width="${node.rectWidth}" height="${node.rectHeight}" rx="${nodeRadius}" ry="${nodeRadius}" fill="${branchColor}" fill-opacity="0.18" stroke="none"/>`;
            } else {
                s += `<rect x="0" y="0" width="${node.rectWidth}" height="${node.rectHeight}" rx="${nodeRadius}" ry="${nodeRadius}" fill="${branchColor}" fill-opacity="0" stroke="none"/>`;
            }
            let textAnchor, textX;
            if (isTitleNode) {
                textAnchor = 'middle';
                textX = node.rectWidth / 2;
                if (node.notes && node.notes.trim().length > 0) {
                    textX -= 8;
                }
            } else if (node.rectWidth <= 150) {
                textAnchor = 'middle';
                textX = node.rectWidth / 2;
                if (node.notes && node.notes.trim().length > 0) {
                    textX -= 8;
                }
            } else if (node.side === 'left') {
                textAnchor = 'start';
                textX = horizontalPadding;
            } else {
                textAnchor = 'start';
                textX = horizontalPadding;
            }
            if (mindmapStyle === '3') {
                textAnchor = 'start';
                textX = horizontalPadding;
            }

            if (Array.isArray(node.__mdLines) && node.__mdLines.length) {
                let lineData = [];
                let currentY = verticalPadding;

                node.__mdLines.forEach(lineSegs => {
                    const hasImage = lineSegs.some(s => s.imageUrl);
                    lineData.push({ y: currentY, segs: lineSegs, isImage: hasImage });
                    currentY += hasImage ? 110 : currentLineHeight;
                });

                lineData.forEach(line => {
                    if (line.isImage) {
                        line.segs.forEach(seg => {
                            if (seg.imageUrl && /^https?:\/\//i.test(seg.imageUrl)) {
                                const safeImageUrl = escapeAttr(seg.imageUrl);
                                const imageAlt = escapeAttr(seg.text);
                                s += `<image href="${safeImageUrl}" alt="${imageAlt}" x="${horizontalPadding}" y="${line.y}" width="200" height="100" preserveAspectRatio="xMidYMid meet" opacity="0.8"/>`;
                            }
                        });
                    }
                });

                {
                    const __mmwTxtOp = (node.id === editingId) ? 0 : 1;
                    s += `<text opacity="${__mmwTxtOp}" x="${textX}" y="${verticalPadding + currentFontSize}" font-family="${fontFamily}" font-size="${currentFontSize}px" font-weight="${currentFontWeight}" fill="var(--text-color)" text-anchor="${textAnchor}" xml:space="preserve">`;
                    let firstTextLine = true;
                    lineData.forEach(line => {
                        if (!line.isImage) {
                            if (line.segs.length === 0) {
                                if (firstTextLine) {
                                    s += `<tspan x="${textX}" y="${line.y + currentFontSize}">&#8203;</tspan>`;
                                    firstTextLine = false;
                                } else {
                                    s += `<tspan x="${textX}" dy="${currentLineHeight}">&#8203;</tspan>`;
                                }
                                return;
                            }

                            let lineContent = '';
                            line.segs.forEach(seg => {
                                const fw = seg.bold ? ` font-weight="700"` : '';
                                const fs = seg.italic ? ` font-style="italic"` : '';
                                const tdSpan = seg.strike ? ` style="text-decoration: line-through;"` : '';
                                const content = (seg.text && seg.text.length) ? escapeXml(seg.text) : '&#8203;';
                                if (seg.href && /^[a-z0-9+.-]+:\/\//i.test(seg.href)) {
                                    const safeHref = escapeAttr(seg.href);
                                    lineContent += `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; cursor: pointer; pointer-events: all;"><tspan${fw}${fs}${tdSpan}>${content}</tspan></a>`;
                                } else {
                                    lineContent += `<tspan${fw}${fs}${tdSpan}>${content}</tspan>`;
                                }
                            });

                            if (firstTextLine) {
                                s += `<tspan x="${textX}" y="${line.y + currentFontSize}">${lineContent}</tspan>`;
                                firstTextLine = false;
                            } else {
                                s += `<tspan x="${textX}" dy="${currentLineHeight}">${lineContent}</tspan>`;
                            }
                        }
                    });
                    s += `</text>`;
                }
                if (mindmapStyle === '3') {
                    s += `<line x1="0" y1="${node.rectHeight}" x2="${node.rectWidth}" y2="${node.rectHeight}" stroke="${branchColor}" stroke-width="${linkWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" pointer-events="none" />`;
                }
            } else if (node.textLines.length > 0) {
                {
                    const __mmwTxtOp = (node.id === editingId) ? 0 : 1;
                    s += `<text opacity="${__mmwTxtOp}" x="${textX}" y="${verticalPadding + currentFontSize}" font-family="${fontFamily}" font-size="${currentFontSize}px" font-weight="${currentFontWeight}" fill="var(--text-color)" text-anchor="${textAnchor}" xml:space="preserve">`;
                    let first = true;
                    node.textLines.forEach((line) => {
                        const content = (line && line.length) ? line : '&#8203;';
                        if (first) {
                            s += `<tspan x="${textX}">${content}</tspan>`;
                            first = false;
                        } else {
                            s += `<tspan x="${textX}" dy="${currentLineHeight}">${content}</tspan>`;
                        }
                    });
                    s += `</text>`;
                }
                if (mindmapStyle === '3') {
                    s += `<line x1="0" y1="${node.rectHeight}" x2="${node.rectWidth}" y2="${node.rectHeight}" stroke="${branchColor}" stroke-width="${linkWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" pointer-events="none" />`;
                }
            }

            if (isTitleNode && node._badgeLayout) {
                const { rows, badgeHeight, rowSpacing } = node._badgeLayout;
                const startY = node.rectHeight + 4;

                rows.forEach((row, rIdx) => {
                    const rowY = startY + rIdx * (badgeHeight + rowSpacing);
                    const rowWidth = row.reduce((acc, item) => acc + (item.width || 0), 0) + Math.max(0, row.length - 1) * 8;
                    let curX = (node.rectWidth - rowWidth) / 2;

                    row.forEach(item => {
                        const bw = item.width || 0;
                        if (item.type === 'badge') {
                            const { link, domain } = item;
                            const safeLink = escapeAttr(link);
                            const badgeHPadding = 12;
                            const iconSize = 12;
                            const iconGap = 4;
                            const iconSectionWidth = iconSize + iconGap;
                            const badgeFontSize = 10;

                            const iconX = curX + (badgeHPadding / 2);
                            const iconY = rowY + (badgeHeight - iconSize) / 2;

                            s += `<a href="${safeLink}" target="_blank" rel="noopener noreferrer" style="cursor: pointer; pointer-events: all;" class="mm-context-link" onclick="arguments[0].stopPropagation();">`;
                            s += `<rect x="${curX}" y="${rowY}" width="${bw}" height="${badgeHeight}" rx="${badgeHeight / 2}" ry="${badgeHeight / 2}" fill="var(--text-color)" fill-opacity="0.1" stroke="none"/>`;
                            s += `<svg x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" opacity="0.6">`;
                            s += `<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" fill="var(--text-color)"/>`;
                            s += `</svg>`;
                            s += `<text x="${iconX + iconSectionWidth}" y="${rowY + badgeHeight / 2 + 3.5}" font-family="${fontFamily}" font-size="${badgeFontSize}px" font-weight="500" fill="var(--text-color)" text-anchor="start" opacity="0.6">${escapeXml(domain)}</text>`;
                            s += `</a>`;
                        } else if (item.type === 'overflow') {
                            const iconSize = 16;
                            const iconX = curX + (bw - iconSize) / 2;
                            const iconY = rowY + (badgeHeight - iconSize) / 2;

                            s += `<g class="mm-context-overflow-btn" style="cursor: pointer; pointer-events: all;" onclick="arguments[0].stopPropagation(); this.classList.toggle('active');">`;
                            s += `<rect x="${curX}" y="${rowY}" width="${bw}" height="${badgeHeight}" rx="${badgeHeight / 2}" ry="${badgeHeight / 2}" fill="var(--text-color)" fill-opacity="0.1" stroke="none"/>`;
                            s += `<svg x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" opacity="0.6">`;
                            s += `<path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="var(--text-color)"/>`;
                            s += `</svg>`;

                            const remainingLinks = contextLinks.slice(2);
                            if (remainingLinks.length > 0) {
                                const ttWidth = 200;
                                const ttItemHeight = 24;
                                const ttHeight = remainingLinks.length * ttItemHeight + 10;
                                const ttX = curX + bw / 2 - ttWidth / 2;
                                const ttY = rowY + badgeHeight + 8 + 4;

                                s += `<g transform="translate(${ttX}, ${ttY})">`;
                                s += `<g class="mm-tooltip" opacity="0" pointer-events="none">`;

                                s += `<rect x="0" y="-15" width="${ttWidth}" height="20" fill="transparent" stroke="none"/>`;

                                const arrowSize = 6;
                                const arrowOffsetY = 0.5;

                                s += `<rect x="0" y="0" width="${ttWidth}" height="${ttHeight}" rx="10" ry="10" fill="#fff" stroke="#e8ecef" stroke-width="1"/>`;

                                s += `<path d="M${ttWidth / 2 - arrowSize},${arrowOffsetY} L${ttWidth / 2},${arrowOffsetY - arrowSize} L${ttWidth / 2 + arrowSize},${arrowOffsetY}" fill="#fff" stroke="#e8ecef" stroke-width="1"/>`;

                                remainingLinks.forEach((l, i) => {
                                    const d = getDomain(l);
                                    const ly = 5 + i * ttItemHeight + 16;
                                    const safeL = escapeAttr(l);
                                    let dText = d.length > 30 ? d.slice(0, 27) + '...' : d;
                                    const linkIconSize = 12;
                                    const linkIconX = 10;
                                    const linkIconY = ly - linkIconSize + 2;
                                    const textX = linkIconX + linkIconSize + 4;

                                    s += `<a href="${safeL}" target="_blank">`;
                                    s += `<svg x="${linkIconX}" y="${linkIconY}" width="${linkIconSize}" height="${linkIconSize}" viewBox="0 0 24 24" opacity="0.6">`;
                                    s += `<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" fill="#1e293b"/>`;
                                    s += `</svg>`;
                                    s += `<text x="${textX}" y="${ly}" font-family="${fontFamily}" font-size="11px" fill="#1e293b" text-anchor="start" style="text-decoration: none;">${escapeXml(dText)}</text>`;
                                    s += `</a>`;
                                });
                                s += `</g></g>`;
                            }
                            s += `</g>`;
                        }
                        curX += bw + 8;
                    });
                });
            }
            const addRadius = 8;
            const addOffset = -2;
            const __mmwIsLeftForBtn = node.side === 'left';
            const __mmwAddX = __mmwIsLeftForBtn ? (0 - addOffset) : (node.rectWidth + addOffset);
            const hasNotes = node.notes && node.notes.trim().length > 0;
            if (hasNotes) {
                const iconSize = 16;
                const rightPadding = 12;
                const noteIndX = node.rectWidth - rightPadding - iconSize;

                let noteIndY;
                const isMultiLine = node.textLines.length > 1;

                if (isMultiLine) {
                    const isTitleNode = node.id === '0';
                    const currentLineHeight = isTitleNode ? titleLineHeight : lineHeight;
                    noteIndY = verticalPadding + (currentLineHeight - iconSize) / 2;
                } else {
                    noteIndY = (node.rectHeight - iconSize) / 2;
                }

                const btnHeight = iconSize + 10;
                const btnWidth = iconSize + 10;

                s += `<g class="node-note-indicator" data-node-id="${node.id}" transform="translate(${noteIndX}, ${noteIndY})" onclick="window.openNotesDrawer('${node.id}'); arguments[0].stopPropagation();" style="cursor: pointer;">`;

                s += `<rect x="-5" y="-5" width="${btnWidth}" height="${btnHeight}" fill="transparent" stroke="none"/>`;

                s += `<svg x="0" y="0" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${branchColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 5H3"/><path d="M15 12H3"/><path d="M17 19H3"/></svg>`;
                s += `</g>`;
            }

            if (!node.collapsed) {
                if (mindmapStyle !== '2' && mindmapStyle !== '3') {
                    s += `<g class="mm-add-btn" data-for-id="${node.id}" transform="translate(${__mmwAddX}, ${node.rectHeight / 2})" style="cursor: pointer; opacity: 0; pointer-events: none; z-index: 10000;">`;
                    s += `<circle cx="0" cy="0" r="${addRadius}" fill="#ffffff" stroke="none"></circle>`;
                    s += `<path d="M -5 0 H 5 M 0 -5 V 5" stroke="${branchColor}" stroke-width="1.5" stroke-linecap="round"></path>`;
                    s += `</g>`;
                }
            }
            s += `</g>`;

            out.nodes.push(s);
        }

        if (node.collapsed && node.children.length > 0) {
            const isLeft = node.side === 'left';
            const startX = isLeft ? node.x : node.x + (node.rectWidth || 0);
            const startY = node.y;
            const endX = isLeft ? startX - 40 : startX + 40;
            const endY = startY;
            const branchColor = node._computedColor || node.branchColor || defaultBranchColor;

            let ind = '';
            ind += `<line class="mm-collapsed-link" data-link-id="${node.id}-collapsed" x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${branchColor}" stroke-width="${linkWidth}" stroke-linecap="round" stroke-dasharray="4 6"/>`;

            const rotateTransform = isLeft ? ' rotate(180)' : '';
            ind += `<g class="mm-expand-btn" data-for-id="${node.id}" transform="translate(${endX}, ${endY})${rotateTransform}" style="cursor: pointer; pointer-events: all;">`;
            ind += `<circle cx="0" cy="0" r="12" fill="${branchColor}" stroke="none"/>`;
            ind += `<path d="m-2 -4 4 4-4 4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
            ind += `</g>`;
            out.nodes.push(ind);
            return;
        }

        node.children.forEach((child) => {
            __mmwCollectParts(child, node, out);
        });
    }

    function __mmwNormalizeContextUrls(value) {
        if (value == null) return [];
        const arr = Array.isArray(value)
            ? value
            : (typeof value === 'string' ? value.split(/\s*,\s*/g) : []);
        return arr
            .map(v => String(v ?? '').trim())
            .filter(Boolean);
    }

    try {
        parsed = JSON.parse(jsonString);
        settings = parsed['mm-settings'] || parsed.mmSettings || null;
        if (settings && typeof settings === 'object') {
            if (Number.isFinite(settings.spacing)) {
                nodeSpacing = Number(settings.spacing);
                levelSpacing = nodeSpacing * 1.5;
            }
            const sw = settings['mm-link-width'] ?? settings.linkWidth ?? settings['mm-link width'];
            if (Number.isFinite(sw)) {
                linkWidth = Number(sw);
            }
            const rad = settings['border-radius'] ?? settings.borderRadius ?? settings.nodeRadius;
            if (Number.isFinite(rad)) {
                nodeRadius = Number(rad);
            }
            const ff = settings['font-family'] ?? settings.fontFamily ?? settings.fonts;
            if (ff) {
                if (Array.isArray(ff)) {
                    fontFamily = ff.map(f => {
                        const name = String(f).trim().replace(/^['"]|['"]$/g, '');
                        return /[\s,]/.test(name) ? "'" + name.replace(/'/g, "\\'") + "'" : name;
                    }).join(', ');
                } else if (typeof ff === 'string') {
                    const parts = ff.split(',').map(s => s.trim()).filter(Boolean);
                    fontFamily = parts.map(p => {
                        const name = p.replace(/^['"]|['"]$/g, '');
                        return /[\s,]/.test(name) ? "'" + name.replace(/'/g, "\\'") + "'" : name;
                    }).join(', ');
                }
            }
            const fw = settings['font-weight'] ?? settings.fontWeight;
            if (fw !== undefined && fw !== null) {
                if (Number.isFinite(Number(fw))) {
                    const n = Math.round(Number(fw));
                    const clamped = Math.min(900, Math.max(100, n));
                    fontWeight = String(clamped);
                } else if (typeof fw === 'string') {
                    const t = fw.trim();
                    if (/^\d{3}$/.test(t)) {
                        fontWeight = t;
                    } else if (t === 'normal' || t === 'bold' || t === 'bolder' || t === 'lighter') {
                        fontWeight = t;
                    }
                }
            }
            const ba = settings['branch-alignment'] ?? settings.branchAlignment ?? settings.branchAlignmentMode;
            if (typeof ba === 'string') {
                const t = ba.trim().toLowerCase();
                branchAlignmentMode = (t === 'left' || t === 'right') ? t : 'balanced';
            }
            const ms = settings['style'] ?? settings.mindmapStyle ?? settings.theme;
            if (ms !== undefined && ms !== null) {
                const s = String(ms).toLowerCase().trim();
                if (s === 'clean') mindmapStyle = '3';
                else if (s === 'default') mindmapStyle = '1';
                else mindmapStyle = s;
            }
        }
    } catch (e) {
    }

    const contextLinks = __mmwNormalizeContextUrls(
        (options && Object.prototype.hasOwnProperty.call(options, 'contextUrls'))
            ? options.contextUrls
            : (settings && settings.contextUrls)
    );
    const hierarchy = buildHierarchy(jsonString);
    if (!hierarchy.children.length) return '';

    assignBranchColors(hierarchy);
    processNode(hierarchy);
    assignSides(hierarchy);

    hierarchy.textLines = [];
    hierarchy.rectWidth = 0;
    hierarchy.rectHeight = 0;

    assignPositions(hierarchy);
    assignXPositions(hierarchy, 0);

    let extents = createExtents();
    collectExtents(hierarchy, extents);
    if (!Number.isFinite(extents.minX) || !Number.isFinite(extents.minY)) {
        return '';
    }

    const padding = 20;
    const offsetX = -extents.minX + padding;
    const offsetY = -extents.minY + padding;
    if (offsetX !== 0 || offsetY !== 0) {
        shiftCoordinates(hierarchy, offsetX, offsetY);
    }

    extents = createExtents();
    collectExtents(hierarchy, extents);

    let finalWidth = (extents.maxX + padding);
    let finalHeight = (extents.maxY + padding);

    if (branchAlignmentMode === 'auto' && finalWidth >= 4000) {
        __mmwAssignSidesBalanced(hierarchy);

        assignPositions(hierarchy);
        assignXPositions(hierarchy, 0);

        extents = createExtents();
        collectExtents(hierarchy, extents);
        const offX2 = -extents.minX + padding;
        const offY2 = -extents.minY + padding;
        if (offX2 !== 0 || offY2 !== 0) {
            shiftCoordinates(hierarchy, offX2, offY2);
        }

        extents = createExtents();
        collectExtents(hierarchy, extents);
        finalWidth = extents.maxX + padding;
        finalHeight = extents.maxY + padding;
    }

    const __parts = { links: [], nodes: [] };
    hierarchy.children.forEach((child) => __mmwCollectParts(child, hierarchy, __parts));
    const svgContent = __parts.links.join('') + __parts.nodes.join('');

    const svgOutput = [
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${options.responsive ? '100%' : finalWidth}" height="${options.responsive ? '100%' : finalHeight}" viewBox="0 0 ${finalWidth} ${finalHeight}">`,
        '  <defs>',
        '    <style>',
        `      .mm-node text{font-family:${fontFamily}; user-select: none; -webkit-user-select: none;}`,
        `      .mm-node image{pointer-events: none; object-fit: contain;}`,
        `      @media (hover: hover) { .mm-context-overflow-btn:hover .mm-tooltip { opacity: 1; pointer-events: all; transform: translateY(0); } }`,
        `      .mm-context-overflow-btn.active .mm-tooltip { opacity: 1; pointer-events: all; transform: translateY(0); }`,
        `      .mm-tooltip { opacity: 0; pointer-events: none; transition: opacity 0.2s, transform 0.2s; transform: translateY(-5px); }`,
        '    </style>',
        '  </defs>',
        '  <g class="mm-stage">',
        svgContent,
        '  </g>',
        '</svg>'
    ].join('\n');

    if (options && Object.prototype.hasOwnProperty.call(options, 'contextUrls')) {
        let updatedJson = null;
        try {
            const base = parsed ?? JSON.parse(jsonString);
            if (!base['mm-settings']) base['mm-settings'] = {};
            base['mm-settings'].contextUrls = __mmwNormalizeContextUrls(options.contextUrls);
            updatedJson = JSON.stringify(base, null, 2);
        } catch (e) {
            updatedJson = null;
        }
        return { svg: svgOutput, updatedJson };
    }

    return svgOutput;
}

function hierarchyToJson(hierarchy) {
    function convertNodeToJson(node) {
        const jsonNode = {
            content: node.text,
            children: node.children.map(convertNodeToJson)
        };
        if (node.collapsed) jsonNode.collapsed = true;
        if (node.branchColor) {
            jsonNode.branchColor = node.branchColor;
        }
        if (node.notes && node.notes.trim().length > 0) {
            jsonNode.notes = node.notes;
        }
        if (node.citations && Array.isArray(node.citations) && node.citations.length > 0) {
            jsonNode.citations = node.citations;
        }
        return jsonNode;
    }

    if (hierarchy.children.length > 0) {
        const rootJson = convertNodeToJson(hierarchy.children[0]);
        return JSON.stringify({ "mm-node": rootJson }, null, 2);
    }
    return JSON.stringify({ "mm-node": { content: "", children: [] } }, null, 2);
}

window.initializeMindMapZoom = function (svgEl) {
    if (!svgEl || !window.svgPanZoom) return null;

    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    svgEl.style.width = '100%';
    svgEl.style.height = '100%';

    const panZoom = window.svgPanZoom(svgEl, {
        viewportSelector: '.mm-stage',
        zoomEnabled: true,
        controlIconsEnabled: false,
        fit: true,
        center: true,
        minZoom: 0.1,
        maxZoom: 10
    });

    panZoom.fitAndCenterAnimated = function () {
        const viewport = svgEl.querySelector('.mm-stage');
        if (viewport) {
            viewport.style.transition = 'transform 0.9s cubic-bezier(0.19, 1, 0.22, 1)';
        }

        this.resize();
        this.fit();
        this.center();

        setTimeout(() => {
            if (viewport) {
                viewport.style.transition = 'none';
            }
        }, 900);
    };

    return panZoom;
};
