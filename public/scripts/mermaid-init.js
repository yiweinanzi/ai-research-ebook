// Mermaid initialization - final fix for Expressive Code
(function() {
    'use strict';

    const SELECTOR = '.sl-markdown-content pre[data-language="mermaid"]';
    const LOADED = '__vrMermaidInited';
    let mermaid = null;

    function isDark() {
        return document.documentElement.dataset.theme === 'dark';
    }

    function cleanText(text) {
        // 移除所有 Unicode 控制字符，保留基本换行
        // 包括: DEL (0x7F), PS (0x2029), LS (0x2028), 各种控制字符
        return text
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u2028\u2029]/g, '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
    }

    function getCode(block) {
        // 方法1：优先从 Expressive Code 的 data-code 属性获取
        const copyButton = block.closest('.expressive-code')?.querySelector('.copy button');
        if (copyButton) {
            const dataCode = copyButton.dataset.code;
            if (dataCode) {
                return cleanText(dataCode);
            }
        }

        // 方法2：从 div.ec-line 提取
        const lines = block.querySelectorAll('.ec-line');
        if (lines.length > 0) {
            const text = Array.from(lines).map(line => {
                const codeSpan = line.querySelector('.code');
                return codeSpan ? (codeSpan.textContent || '') : '';
            }).join('\n');
            return cleanText(text);
        }

        // 方法3：回退
        const code = block.querySelector('code');
        if (code) {
            return cleanText(code.textContent || code.innerText || '');
        }

        return '';
    }

    function renderAll() {
        if (!mermaid) return;

        const blocks = document.querySelectorAll(SELECTOR);
        if (!blocks.length) return;

        console.log('[mermaid] Found', blocks.length, 'diagrams');

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const text = getCode(block);

            if (!text.trim()) continue;

            // 调试：打印前300字符
            console.log('[mermaid] Diagram', i + 1, 'code preview:\n' + text.substring(0, 300));

            const div = document.createElement('div');
            div.className = 'mermaid-diagram';
            div.style.cssText = 'padding:16px;background:var(--sl-color-bg-nav,#212121);border-radius:8px;margin:1.5rem 0;overflow-x:auto';

            const pre = document.createElement('pre');
            pre.className = 'mermaid';
            pre.id = 'mermaid-' + i + '-' + Date.now();
            pre.textContent = text;

            div.appendChild(pre);
            block.parentNode.insertBefore(div, block.nextSibling);
        }

        mermaid.init(undefined, '.mermaid').then(function() {
            console.log('[mermaid] Init done - rendered', blocks.length, 'diagrams');
            for (let i = 0; i < blocks.length; i++) {
                blocks[i].style.display = 'none';
            }
        }).catch(function(e) {
            console.warn('[mermaid] Init failed:', e.message);
        });
    }

    async function load() {
        if (window[LOADED]) return;
        window[LOADED] = true;

        try {
            // 添加版本号到 URL 防止缓存
            const mod = await import('https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs');
            mermaid = mod.default || mod;

            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'loose',
                theme: isDark() ? 'dark' : 'base'
            });

            console.log('[mermaid] Loaded v10.9.1');
            setTimeout(renderAll, 1000);
        } catch (e) {
            console.error('[mermaid] Load failed:', e);
        }
    }

    document.addEventListener('astro:after-swap', function() {
        window[LOADED] = false;
        load();
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load);
    } else {
        load();
    }

    window.renderMermaidDiagrams = renderAll;
})();
