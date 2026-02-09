const MERMAID_SELECTOR = '.sl-markdown-content pre[data-language="mermaid"]';
const LOADED_FLAG = '__vrMermaidLoaded';

let mermaidModulePromise;

function isDarkTheme() {
	return document.documentElement.dataset.theme === 'dark';
}

function getMermaidModule() {
	if (!mermaidModulePromise) {
		mermaidModulePromise = import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs')
			.then((mod) => mod.default || mod)
			.catch((error) => {
				console.error('[mermaid] Failed to load module', error);
				return null;
			});
	}
	return mermaidModulePromise;
}

function cleanupExistingDiagrams() {
	document.querySelectorAll('.mermaid-diagram').forEach((node) => node.remove());
	document.querySelectorAll(`${MERMAID_SELECTOR}.mermaid-source-hidden`).forEach((node) => {
		node.classList.remove('mermaid-source-hidden');
	});
}

function sanitizeMermaidCode(block) {
	const codeNode = block.querySelector('code');
	const rawText = codeNode?.innerText || codeNode?.textContent || block.innerText || '';
	const normalizedText = rawText.replace(/\u00a0/g, ' ').replace(/\r\n?/g, '\n').trim();
	if (!normalizedText) return '';

	const lines = normalizedText
		.split('\n')
		.filter((line) => !/^\s*style\s+\w+\s+fill:/i.test(line))
		.map((line) => line.replace(/\t/g, '    '));

	return lines.join('\n').trim();
}

function getMermaidThemeConfig() {
	if (isDarkTheme()) {
		return {
			theme: 'dark',
			themeVariables: {
				fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
				lineColor: '#9ca3af',
				primaryBorderColor: '#6b7280',
				clusterBorder: '#6b7280',
				clusterBkg: '#2f2f2f',
			},
		};
	}

	return {
		theme: 'base',
		themeVariables: {
			fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
			background: '#ffffff',
			primaryColor: '#ffffff',
			primaryBorderColor: '#d1d5db',
			primaryTextColor: '#111827',
			lineColor: '#6b7280',
			secondaryColor: '#f3f4f6',
			tertiaryColor: '#ffffff',
			clusterBkg: '#f8fafc',
			clusterBorder: '#d1d5db',
		},
	};
}

async function renderSingleDiagram(mermaid, block, index) {
	const source = sanitizeMermaidCode(block);
	if (!source) return false;

	const wrapper = document.createElement('div');
	wrapper.className = 'mermaid-diagram';
	block.insertAdjacentElement('afterend', wrapper);

	const host = document.createElement('div');
	host.className = 'mermaid';
	host.id = `vr-mermaid-${index}`;
	wrapper.appendChild(host);

	try {
		const renderResult = await mermaid.render(host.id, source);
		host.innerHTML = renderResult.svg;
		renderResult.bindFunctions?.(host);
		block.classList.add('mermaid-source-hidden');
		return true;
	} catch (error) {
		wrapper.remove();
		block.classList.remove('mermaid-source-hidden');
		console.warn(`[mermaid] Skip invalid diagram #${index + 1}`, error);
		return false;
	}
}

async function renderMermaidDiagrams() {
	const mermaid = await getMermaidModule();
	if (!mermaid) return;

	cleanupExistingDiagrams();
	const blocks = Array.from(document.querySelectorAll(MERMAID_SELECTOR));
	if (!blocks.length) return;

	mermaid.initialize({
		startOnLoad: false,
		securityLevel: 'loose',
		suppressErrorRendering: false,
		...getMermaidThemeConfig(),
	});

	for (let index = 0; index < blocks.length; index += 1) {
		await renderSingleDiagram(mermaid, blocks[index], index);
	}
}

function observeThemeChanges() {
	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
				renderMermaidDiagrams();
				break;
			}
		}
	});
	observer.observe(document.documentElement, { attributes: true });
}

function initialize() {
	if (window[LOADED_FLAG]) return;
	window[LOADED_FLAG] = true;

	renderMermaidDiagrams();
	observeThemeChanges();
	document.addEventListener('astro:after-swap', () => {
		renderMermaidDiagrams();
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
	initialize();
}
