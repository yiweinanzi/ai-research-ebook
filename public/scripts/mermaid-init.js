// Mermaid 初始化脚本 - 支持 classDef 和主题切换
(function() {
	'use strict';

	const MERMAID_SELECTOR = '.sl-markdown-content pre[data-language="mermaid"]';
	const LOADED_FLAG = '__vrMermaidLoaded';

	let mermaidModulePromise;

	function isDarkTheme() {
		const theme = document.documentElement.dataset.theme ||
			document.documentElement.getAttribute('data-theme') ||
			'light';
		return theme === 'dark';
	}

	function getMermaidModule() {
		if (!mermaidModulePromise) {
			mermaidModulePromise = import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs')
				.then((mod) => {
					const mermaid = mod.default || mod;
					// 初始化 mermaid
					mermaid.initialize({
						startOnLoad: false,
						securityLevel: 'loose',
						suppressErrorRendering: true,
						theme: isDarkTheme() ? 'dark' : 'base'
					});
					return mermaid;
				})
				.catch((error) => {
					console.error('[mermaid] Failed to load module', error);
					return null;
				});
		}
		return mermaidModulePromise;
	}

	function cleanupExistingDiagrams() {
		document.querySelectorAll('.mermaid-diagram').forEach((node) => {
			if (node.parentNode) node.remove();
		});
		document.querySelectorAll(`${MERMAID_SELECTOR}.mermaid-source-hidden`).forEach((node) => {
			node.classList.remove('mermaid-source-hidden');
		});
	}

	function sanitizeMermaidCode(block) {
		const codeNode = block.querySelector('code');
		const rawText = codeNode?.textContent || codeNode?.innerText || block.innerText || '';

		// 规范化空白字符
		const normalizedText = rawText
			.replace(/\u00a0/g, ' ')
			.replace(/\r\n?/g, '\n')
			.trim();

		if (!normalizedText) return '';

		// 保留 classDef 和 class 语句（不移除它们）
		const lines = normalizedText
			.split('\n')
			.map((line) => line.replace(/\t/g, '    '));

		return lines.join('\n').trim();
	}

	function getMermaidThemeConfig() {
		if (isDarkTheme()) {
			return {
				theme: 'dark',
				themeVariables: {
					fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
					fontSize: '14px',
					lineColor: '#9ca3af',
					primaryBorderColor: '#6b7280',
					clusterBorder: '#6b7280',
					clusterBkg: '#2f2f2f',
					tertiaryBkg: '#374151',
					mainBkg: '#1f2937',
					nodeBorderColor: '#6b7280',
					nodeBkg: '#374151',
				},
			};
		}

		return {
			theme: 'base',
			themeVariables: {
				fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
				fontSize: '14px',
				background: '#ffffff',
				primaryColor: '#ffffff',
				primaryBorderColor: '#10a37f',
				primaryTextColor: '#111827',
				lineColor: '#6b7280',
				secondaryColor: '#f3f4f6',
				tertiaryColor: '#ffffff',
				clusterBkg: '#f8fafc',
				clusterBorder: '#d1d5db',
				nodeBorderColor: '#10a37f',
				nodeBkg: '#ffffff',
			},
		};
	}

	async function renderSingleDiagram(mermaid, block, index) {
		const source = sanitizeMermaidCode(block);
		if (!source) return false;

		// 查找是否需要特殊处理 classDef
		const hasClassDef = /classDef\s+\w+/.test(source);

		const wrapper = document.createElement('div');
		wrapper.className = 'mermaid-diagram';
		block.insertAdjacentElement('afterend', wrapper);

		const host = document.createElement('div');
		host.className = 'mermaid';
		host.id = `vr-mermaid-${Date.now()}-${index}`;
		wrapper.appendChild(host);

		try {
			// 使用唯一 ID 渲染
			const renderResult = await mermaid.render(host.id, source);
			host.innerHTML = renderResult.svg;

			if (renderResult.bindFunctions) {
				renderResult.bindFunctions(host);
			}

			block.classList.add('mermaid-source-hidden');
			block.style.display = 'none';
			return true;
		} catch (error) {
			console.warn(`[mermaid] Render error for diagram #${index + 1}:`, error.message);
			wrapper.remove();
			block.classList.remove('mermaid-source-hidden');
			block.style.display = '';
			return false;
		}
	}

	async function renderMermaidDiagrams() {
		const mermaid = await getMermaidModule();
		if (!mermaid) return;

		cleanupExistingDiagrams();

		const blocks = Array.from(document.querySelectorAll(MERMAID_SELECTOR));
		if (!blocks.length) return;

		console.log(`[mermaid] Found ${blocks.length} diagram(s) to render`);

		// 为每个 diagram 设置主题
		mermaid.initialize({
			...getMermaidThemeConfig(),
			startOnLoad: false,
			securityLevel: 'loose',
			suppressErrorRendering: false
		});

		let successCount = 0;
		for (let index = 0; index < blocks.length; index += 1) {
			const result = await renderSingleDiagram(mermaid, blocks[index], index);
			if (result) successCount++;
		}

		console.log(`[mermaid] Successfully rendered ${successCount}/${blocks.length} diagrams`);
	}

	function observeThemeChanges() {
		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === 'attributes' &&
					(mutation.attributeName === 'data-theme' || mutation.attributeName === 'data-shiki-theme')) {
					console.log('[mermaid] Theme changed, re-rendering diagrams...');
					setTimeout(() => renderMermaidDiagrams(), 100);
					break;
				}
			}
		});
		observer.observe(document.documentElement, { attributes: true, subtree: false });
	}

	function initialize() {
		if (window[LOADED_FLAG]) {
			console.log('[mermaid] Already initialized, skipping...');
			return;
		}
		window[LOADED_FLAG] = true;
		console.log('[mermaid] Initializing...');

		// 延迟渲染以确保 DOM 完全加载
		setTimeout(() => {
			renderMermaidDiagrams();
			observeThemeChanges();
		}, 50);
	}

	// Astro 页面切换支持
	if (typeof document !== 'undefined') {
		document.addEventListener('astro:after-swap', () => {
			console.log('[mermaid] Astro page swap detected, re-initializing...');
			window[LOADED_FLAG] = false;
			initialize();
		});
	}

	// 启动初始化
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initialize, { once: true });
	} else {
		initialize();
	}

	// 手动触发渲染的全局方法
	window.renderMermaidDiagrams = renderMermaidDiagrams;
})();
