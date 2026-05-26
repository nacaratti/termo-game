import path from 'node:path';
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig, loadEnv } from 'vite';

const configHorizonsViteErrorHandler = `
const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (const addedNode of mutation.addedNodes) {
			if (
				addedNode.nodeType === Node.ELEMENT_NODE &&
				(
					addedNode.tagName?.toLowerCase() === 'vite-error-overlay' ||
					addedNode.classList?.contains('backdrop')
				)
			) {
				handleViteOverlay(addedNode);
			}
		}
	}
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true
});

function handleViteOverlay(node) {
	if (!node.shadowRoot) {
		return;
	}

	const backdrop = node.shadowRoot.querySelector('.backdrop');

	if (backdrop) {
		const overlayHtml = backdrop.outerHTML;
		const parser = new DOMParser();
		const doc = parser.parseFromString(overlayHtml, 'text/html');
		const messageBodyElement = doc.querySelector('.message-body');
		const fileElement = doc.querySelector('.file');
		const messageText = messageBodyElement ? messageBodyElement.textContent.trim() : '';
		const fileText = fileElement ? fileElement.textContent.trim() : '';
		const error = messageText + (fileText ? ' File:' + fileText : '');

		window.parent.postMessage({
			type: 'horizons-vite-error',
			error,
		}, '*');
	}
}
`;

const configHorizonsRuntimeErrorHandler = `
window.onerror = (message, source, lineno, colno, errorObj) => {
	const errorDetails = errorObj ? JSON.stringify({
		name: errorObj.name,
		message: errorObj.message,
		stack: errorObj.stack,
		source,
		lineno,
		colno,
	}) : null;

	window.parent.postMessage({
		type: 'horizons-runtime-error',
		message,
		error: errorDetails
	}, '*');
};
`;

const configHorizonsConsoleErrroHandler = `
const originalConsoleError = console.error;
console.error = function(...args) {
	originalConsoleError.apply(console, args);

	let errorString = '';

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg instanceof Error) {
			errorString = arg.stack || \`\${arg.name}: \${arg.message}\`;
			break;
		}
	}

	if (!errorString) {
		errorString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
	}

	window.parent.postMessage({
		type: 'horizons-console-error',
		error: errorString
	}, '*');
};
`;

const configWindowFetchMonkeyPatch = `
const originalFetch = window.fetch;

window.fetch = function(...args) {
	const url = args[0] instanceof Request ? args[0].url : args[0];

	// Skip WebSocket URLs
	if (url.startsWith('ws:') || url.startsWith('wss:')) {
		return originalFetch.apply(this, args);
	}

	// Skip analytics/tracking URLs (often blocked by ad blockers or fail in dev)
	if (url && (url.includes('google-analytics.com') || url.includes('googletagmanager.com') || url.includes('/g/collect'))) {
		return originalFetch.apply(this, args);
	}

	return originalFetch.apply(this, args)
		.then(async response => {
			const contentType = response.headers.get('Content-Type') || '';

			// Exclude HTML document responses
			const isDocumentResponse =
				contentType.includes('text/html') ||
				contentType.includes('application/xhtml+xml');

			if (!response.ok && !isDocumentResponse) {
					const responseClone = response.clone();
					const errorFromRes = await responseClone.text();
					const requestUrl = response.url;
					if (requestUrl) {
						console.error(\`Fetch error from \${requestUrl}: \${errorFromRes}\`);
					}
			}

			return response;
		})
		.catch(error => {
			if (!url.match(/\.html?$/i) && !(url && (url.includes('google-analytics') || url.includes('googletagmanager')))) {
				console.error(error);
			}

			throw error;
		});
};
`;

function escapeForSingleQuotedJs(value) {
	return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** GA4 measurement ID (ex.: G-XXXXXXXXXX) — evita injetar HTML/JS acidentalmente. */
function isValidGaMeasurementId(id) {
	return /^G-[A-Z0-9]+$/i.test(String(id).trim());
}

function buildGoogleTagSnippet(gaId) {
	const id = String(gaId).trim();
	const idInJs = escapeForSingleQuotedJs(id);
	// Formato alinhado ao snippet oficial do Google (gtag.js) + window.gtag para src/lib/analytics.js
	return `    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      window.gtag = gtag;
      gtag('js', new Date());

      gtag('config', '${idInJs}');
    </script>`;
}

console.warn = () => {};

const logger = createLogger()
const loggerError = logger.error

logger.error = (msg, options) => {
	if (options?.error?.toString().includes('CssSyntaxError: [postcss]')) {
		return;
	}

	loggerError(msg, options);
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const gaId = (env.VITE_GA_ID || '').trim();
	const GOOGLE_TAG_MARKER = '<!-- __VITE_INJECT_GOOGLE_TAG__ -->';

	const addTransformIndexHtml = {
		name: 'add-transform-index-html',
		transformIndexHtml(html) {
			let htmlOut = html;
			if (htmlOut.includes(GOOGLE_TAG_MARKER)) {
				if (gaId && isValidGaMeasurementId(gaId)) {
					htmlOut = htmlOut.replace(GOOGLE_TAG_MARKER, buildGoogleTagSnippet(gaId));
				} else if (gaId) {
					htmlOut = htmlOut.replace(
						GOOGLE_TAG_MARKER,
						'    <!-- Google tag: VITE_GA_ID ignorado (use o formato G-XXXXXXXXXX). -->',
					);
				} else {
					htmlOut = htmlOut.replace(GOOGLE_TAG_MARKER, '');
				}
			}

			return {
				html: htmlOut,
				tags: [
					{
						tag: 'script',
						attrs: { type: 'module' },
						children: configHorizonsRuntimeErrorHandler,
						injectTo: 'head',
					},
					{
						tag: 'script',
						attrs: { type: 'module' },
						children: configHorizonsViteErrorHandler,
						injectTo: 'head',
					},
					{
						tag: 'script',
						attrs: {type: 'module'},
						children: configHorizonsConsoleErrroHandler,
						injectTo: 'head',
					},
					{
						tag: 'script',
						attrs: { type: 'module' },
						children: configWindowFetchMonkeyPatch,
						injectTo: 'head',
					},
				],
			};
		},
	};

	return {
		base: env.VITE_BASE_URL ?? process.env.VITE_BASE_URL ?? '/',
		customLogger: logger,
		plugins: [react(), addTransformIndexHtml],
		test: {
			environment: 'jsdom',
			globals: true,
			// e2e/ é Playwright (test:e2e) — Vitest NÃO deve pegar; .claude/ tem worktrees com testes duplicados
			exclude: ['node_modules', 'dist', 'e2e', '**/.git/**', '**/playwright-report/**', '.claude/**'],
		},
		server: {
			cors: true,
			headers: {
				'Cross-Origin-Embedder-Policy': 'credentialless',
			},
			allowedHosts: true,
		},
		resolve: {
			extensions: ['.jsx', '.js', '.tsx', '.ts', '.json', ],
			alias: {
				'@': path.resolve(__dirname, './src'),
			},
		},
	};
});
