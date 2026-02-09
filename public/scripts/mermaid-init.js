// Mermaid 初始化脚本 - 修复 getBoundingClientRect 错误
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

	async function loadMermaid() {
		if (!mermaidModulePromise) {
			mermaidModulePromise = import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs')
				.then((mod) => {
					const mermaid = mod.default || mod;
					mermaid.initialize({
						startOnLoad: false,
						securityLevel: 'loose',
						theme: isDarkTheme() ? 'dark' : 'base'
					});
					return mermaid;
				})
				.catch((error) => {
					console.error('[mermaid] Failed to load:', error);
					return null;
				});
		}
		return mermaidModulePromise;
	}

	function cleanup() {
		document.querySelectorAll('.mermaid-diagram').forEach(node => node.remove());
		document.querySelectorAll(`${MERMAID_SELECTOR}.mermaid-source-hidden`).forEach(node => {
			node.classList.remove('mermaid-source-hidden');
			node.style.display = '';
		});
	}

	function sanitizeCode(block) {
		const codeNode = block.querySelector('code');
		const text = codeNode?.textContent || codeNode?.innerText || '';
		return text.replace(/\u00a0/g, ' ').replace(/\r\n?/g, '\n').trim();
	}

	function getThemeConfig() {
		if (isDarkTheme()) {
			return {
				theme: 'dark',
				themeVariables: {
					fontFamily: 'system-ui, sans-serif',
					fontSize: '14px',
					lineColor: '#9ca3af',
					primaryBorderColor: '#10a37f',
					primaryColor: '#1f2937',
					nodeBorderColor: '#10a37f',
					nodeBkg: '#374151',
				}
			};
		}
		return {
			theme: 'base',
			themeVariables: {
				fontFamily: 'system-ui, sans-serif',
				fontSize: '14px',
				background: '#ffffff',
				primaryColor: '#ffffff',
				primaryBorderColor: '#10a37f',
				lineColor: '#6b7280',
			}
		};
	}

	async function renderDiagram(mermaid, block, index) {
		const code = sanitizeCode(block);
		if (!code) return false;

		// 创建 wrapper 和目标容器
		const wrapper = document.createElement('div');
		wrapper.className = 'mermaid-diagram';
		wrapper.style.cssText = 'min-height: 60px; padding: 16px; background: var(--sl-color-bg-nav, #212121); border-radius: 8px; margin: 1.5rem 0;';

		const container = document.createElement('div');
		container.className = 'mermaid';
		container.style.cssText = 'display: flex; justify-content: center; align-items: center;';
		wrapper.appendChild(container);

		block.insertAdjacentElement('afterend', wrapper);

		const uniqueId = `mermaid-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;

		try {
			// 确保容器在 DOM 中后再渲染
			document.body.appendChild(wrapper);

			// 先设置 ID 和内容
			container.id = uniqueId;

			// 使用 mermaid.run 替代 mermaid.render（更稳定）
			const { svg } = await mermaid.render(uniqueId, code);
			container.innerHTML = svg;

			// 隐藏原始代码块
			block.classList.add('mermaid-source-hidden');
			block.style.display = 'none';

			// 移出 body（放回原位）
			wrapper.remove();
			block.insertAdjacentElement('afterend', wrapper);

			console.log(`[mermaid] Diagram ${index + 1} rendered successfully`);
			return true;
		} catch (error) {
			console.warn(`[mermaid] Render failed for diagram ${index + 1}:`, error.message);
			wrapper.remove();
			block.classList.remove('mermaid-source-hidden');
			block.style.display = '';
			return false;
		}
	}

	async function renderAll() {
		const mermaid = await loadMermaid();
		if (!mermaid) return;

		cleanup();

		const blocks = document.querySelectorAll(MERMAID_SELECTOR);
		if (!blocks.length) return;

		console.log(`[mermaid] Found ${blocks.length} diagram(s)`);

		// 更新主题配置
		mermaid.initialize({
			...getThemeConfig(),
			startOnLoad: false,
			securityLevel: 'loose'
		});

		let success = 0;
		for (let i = 0; i < blocks.length; i++) {
			if (await renderDiagram(mermaid, blocks[i], i)) {
				success++;
			}
		}

		console.log(`[mermaid] Completed: ${success}/${blocks.length} rendered`);
	}

	function observeTheme() {
		const observer = new MutationObserver((mutations) => {
			for (let i = 0; i < mutations.length; i++) {
				const mutation = mutations[i];
				if (mutation.type === 'attributes' &&
					(mutation.attributeName === 'data-theme' || mutation.attributeName === 'data-shiki-theme')) {
					renderAll();
					break;
				}
			}
		});
		observer.observe(document.documentElement, { attributes: true, subtree: false });
	}

	function init() {
		if (window[LOADED_FLAG]) return;
		window[LOADED_FLAG] = true;

		// 延迟执行确保 DOM 就绪
		setTimeout(() => renderAll(), 100);
		observeTheme();
	}

	// Astro 页面切换
	document.addEventListener('astro:after-swap', () => {
		window[LOADED_FLAG] = false;
		init();
	});

	// 启动
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

	window.renderMermaidDiagrams = renderAll;
})();
