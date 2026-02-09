// Mermaid initialization for Starlight + Expressive Code
(function () {
	'use strict';

	const SOURCE_SELECTOR = '.sl-markdown-content pre[data-language="mermaid"]';
	const RENDER_CLASS = 'mermaid-diagram';
	const HIDDEN_CLASS = 'mermaid-source-hidden';
	const THEME_OBSERVER_FLAG = '__vrMermaidThemeObserver';
	let mermaidModule = null;

	function isDarkTheme() {
		return document.documentElement.dataset.theme === 'dark';
	}

	function normalizeMermaidCode(rawText) {
		return String(rawText || '')
			.replace(/\u007f/g, '\n')
			.replace(/\u001f/g, '\n')
			.replace(/[\u2028\u2029]/g, '\n')
			.replace(/\u00a0/g, ' ')
			.replace(/\r\n?/g, '\n')
			.replace(/[\u200B-\u200D\uFEFF]/g, '')
			.replace(/[\x00-\x08\x0B\x0C\x0E-\x1E]/g, '')
			.split('\n')
			.map((line) => line.replace(/\s+$/g, ''))
			.join('\n')
			.trim();
	}

	function fixLegacySubgraphSyntax(code) {
		let autoSubgraphId = 0;
		const lines = code.split('\n').map((line) => {
			// 1) subgraph ID (Title)  ->  subgraph ID["Title"]
			const legacyParen = line.match(/^(\s*)subgraph\s+([A-Za-z_][\w-]*)\s+\((.+)\)\s*$/);
			if (legacyParen) {
				const [, indent, id, title] = legacyParen;
				return `${indent}subgraph ${id}["${String(title).replace(/"/g, '\\"')}"]`;
			}

			// 2) subgraph ["Title"] / subgraph [Title]  ->  subgraph SG_AUTO_n["Title"]
			const bracketOnly = line.match(/^(\s*)subgraph\s+\[(.+)\]\s*$/);
			if (bracketOnly) {
				autoSubgraphId += 1;
				const [, indent, rawTitle] = bracketOnly;
				const trimmed = String(rawTitle).trim();
				const title = /^".*"$/.test(trimmed) ? trimmed : `"${trimmed.replace(/"/g, '\\"')}"`;
				return `${indent}subgraph SG_AUTO_${autoSubgraphId}[${title}]`;
			}

			// 3) subgraph "Title"  ->  subgraph SG_AUTO_n["Title"]
			const quoteOnly = line.match(/^(\s*)subgraph\s+"(.+)"\s*$/);
			if (quoteOnly) {
				autoSubgraphId += 1;
				const [, indent, title] = quoteOnly;
				return `${indent}subgraph SG_AUTO_${autoSubgraphId}["${String(title).replace(/"/g, '\\"')}"]`;
			}

			return line;
		});

		// 4) 兜底处理：单行被压缩时也转换 subgraph ID (Title)
		return lines
			.join('\n')
			.replace(/subgraph\s+([A-Za-z_][\w-]*)\s+\(([^\n\)]*)\)/g, (_, id, title) => {
				return `subgraph ${id}["${String(title).replace(/"/g, '\\"')}"]`;
			});
	}

	function finalizeMermaidCode(rawText) {
		const normalized = normalizeMermaidCode(rawText);
		return fixLegacySubgraphSyntax(normalized);
	}

	function getCodeFromEcLines(block) {
		const lineNodes = block.querySelectorAll('.ec-line .code');
		if (!lineNodes.length) return '';
		return Array.from(lineNodes)
			.map((node) => node.textContent || '')
			.join('\n');
	}

	function getCodeFromCopyButton(block) {
		const button = block.closest('.expressive-code')?.querySelector('.copy button[data-code]');
		return button?.dataset.code || '';
	}

	function extractMermaidSource(block) {
		const fromEcLines = getCodeFromEcLines(block);
		if (fromEcLines.trim()) return finalizeMermaidCode(fromEcLines);

		const fromCopy = getCodeFromCopyButton(block);
		if (fromCopy.trim()) return finalizeMermaidCode(fromCopy);

		const codeNode = block.querySelector('code');
		const fallback = codeNode ? codeNode.textContent || codeNode.innerText || '' : '';
		return finalizeMermaidCode(fallback);
	}

	function cleanupRenderedDiagrams() {
		document.querySelectorAll(`.${RENDER_CLASS}[data-vr-mermaid="true"]`).forEach((node) => node.remove());
		document.querySelectorAll(`${SOURCE_SELECTOR}.${HIDDEN_CLASS}`).forEach((node) => {
			node.classList.remove(HIDDEN_CLASS);
		});
		document.querySelectorAll(`${SOURCE_SELECTOR}[data-vr-mermaid-rendered="true"]`).forEach((node) => {
			node.removeAttribute('data-vr-mermaid-rendered');
		});
	}

	async function ensureMermaid() {
		if (mermaidModule) return mermaidModule;
		const mod = await import('https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs');
		mermaidModule = mod.default || mod;
		return mermaidModule;
	}

	async function renderAllDiagrams() {
		try {
			const mermaid = await ensureMermaid();
			mermaid.initialize({
				startOnLoad: false,
				securityLevel: 'loose',
				theme: isDarkTheme() ? 'dark' : 'base',
			});

			cleanupRenderedDiagrams();
			const blocks = Array.from(document.querySelectorAll(SOURCE_SELECTOR));
			if (!blocks.length) return;

			console.log('[mermaid] Found', blocks.length, 'diagrams');

			for (let index = 0; index < blocks.length; index += 1) {
				const block = blocks[index];
				const source = extractMermaidSource(block);
				if (!source) continue;

				const wrapper = document.createElement('div');
				wrapper.className = RENDER_CLASS;
				wrapper.dataset.vrMermaid = 'true';

				const target = document.createElement('div');
				const id = `vr-mermaid-${Date.now()}-${index}`;
				target.id = id;
				wrapper.appendChild(target);
				block.insertAdjacentElement('afterend', wrapper);

				try {
					const result = await mermaid.render(id, source);
					target.innerHTML = result.svg;
					if (typeof result.bindFunctions === 'function') {
						result.bindFunctions(target);
					}
					block.classList.add(HIDDEN_CLASS);
					block.dataset.vrMermaidRendered = 'true';
				} catch (error) {
					wrapper.remove();
					console.warn(`[mermaid] Diagram ${index + 1} render failed:`, error?.message || error);
				}
			}
		} catch (error) {
			console.error('[mermaid] Load failed:', error);
		}
	}

	function observeThemeChanges() {
		if (window[THEME_OBSERVER_FLAG]) return;

		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
					renderAllDiagrams();
					break;
				}
			}
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme'],
		});

		window[THEME_OBSERVER_FLAG] = observer;
	}

	function bootMermaid() {
		renderAllDiagrams();
		observeThemeChanges();
	}

	document.addEventListener('astro:after-swap', bootMermaid);

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', bootMermaid, { once: true });
	} else {
		bootMermaid();
	}

	window.renderMermaidDiagrams = renderAllDiagrams;
})();
