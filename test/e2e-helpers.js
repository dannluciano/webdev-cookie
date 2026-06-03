import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:8080";
export const PASSWORD = "12345678";

export function assertSpecIncludes(specPath, expectedText) {
	const fullPath = path.resolve(process.cwd(), specPath);
	const feature = fs.readFileSync(fullPath, "utf8");
	assert.match(feature, /# language: pt/);
	assert.match(feature, new RegExp(escapeRegExp(expectedText)));
}

export async function ensureE2EServerIsAvailable() {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 1500);

	try {
		await fetch(`${BASE_URL}/`, {
			redirect: "manual",
			signal: controller.signal,
		});
	} catch (error) {
		throw new Error(
			`Servidor E2E indisponível em ${BASE_URL}. Inicie a aplicação com "npm start" antes de rodar "npm run test:e2e". Erro: ${error.message}`,
		);
	} finally {
		clearTimeout(timeout);
	}
}

export function uniqueEmail(prefix) {
	const id = crypto.randomUUID().slice(0, 8);
	return `${prefix}-${process.pid}-${id}@example.com`;
}

export function formBody(data) {
	return new URLSearchParams(data);
}

export function createClient() {
	const cookies = new Map();

	function cookieHeader() {
		return Array.from(cookies, ([name, value]) => `${name}=${value}`).join("; ");
	}

	function saveCookies(response) {
		const setCookie = response.headers.get("set-cookie");
		if (!setCookie) {
			return;
		}

		for (const cookie of splitSetCookie(setCookie)) {
			const [pair, ...attributes] = cookie.split(";");
			const [name, value = ""] = pair.trim().split("=");
			const expiresCookie = attributes.some((attribute) =>
				attribute.trim().toLowerCase() === "max-age=0",
			);

			if (expiresCookie) {
				cookies.delete(name);
			} else {
				cookies.set(name, value);
			}
		}
	}

	return {
		getCookie(name) {
			return cookies.get(name);
		},

		async request(pathname, options = {}) {
			const headers = new Headers(options.headers || {});
			const currentCookies = cookieHeader();

			if (currentCookies && !headers.has("cookie")) {
				headers.set("cookie", currentCookies);
			}

			const response = await fetch(`${BASE_URL}${pathname}`, {
				redirect: "manual",
				...options,
				headers,
			});

			saveCookies(response);
			return response;
		},
	};
}

export async function request(pathname, options = {}) {
	return fetch(`${BASE_URL}${pathname}`, {
		redirect: "manual",
		...options,
	});
}

export async function registerUser(client, email, password = PASSWORD) {
	return client.request("/register", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: formBody({ email, password }),
	});
}

export async function loginUser(client, email, password = PASSWORD) {
	return client.request("/login", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: formBody({ email, password }),
	});
}

export async function createAuthenticatedClient(prefix) {
	const client = createClient();
	const email = uniqueEmail(prefix);

	const registerResponse = await registerUser(client, email);
	assert.equal(registerResponse.status, 200);

	const loginResponse = await loginUser(client, email);
	assert.equal(loginResponse.status, 302);
	assert.equal(loginResponse.headers.get("location"), "/dashboard");
	assert.ok(client.getCookie("sessionId"));

	return { client, email, sessionId: client.getCookie("sessionId") };
}

export function assertHtmlIncludes(html, text) {
	assert.ok(
		html.includes(text),
		`Esperava encontrar "${text}" no HTML recebido.`,
	);
}

export function assertHtmlExcludes(html, text) {
	assert.ok(
		!html.includes(text),
		`Não esperava encontrar "${text}" no HTML recebido.`,
	);
}

export function assertLink(html, href, label) {
	assert.match(
		html,
		new RegExp(`<a\\b[^>]*href="${escapeRegExp(href)}"[^>]*>[\\s\\S]*${escapeRegExp(label)}[\\s\\S]*<\\/a>`),
	);
}

export function assertForm(html, action, method = "post") {
	assert.match(
		html,
		new RegExp(`<form\\b[^>]*action="${escapeRegExp(action)}"[^>]*method="${escapeRegExp(method)}"[^>]*>`),
	);
}

export function assertInput(html, name, attributes = []) {
	assert.match(html, new RegExp(`<input\\b[^>]*name="${escapeRegExp(name)}"[^>]*>`));

	for (const attribute of attributes) {
		assert.match(
			html,
			new RegExp(`<input\\b(?=[^>]*name="${escapeRegExp(name)}")(?=[^>]*${escapeRegExp(attribute)})[^>]*>`),
		);
	}
}

export function assertSetCookieContains(response, ...fragments) {
	const setCookie = response.headers.get("set-cookie");
	assert.ok(setCookie, "Esperava cabeçalho Set-Cookie.");

	for (const fragment of fragments) {
		assert.ok(
			setCookie.includes(fragment),
			`Esperava Set-Cookie contendo "${fragment}". Recebido: ${setCookie}`,
		);
	}
}

export function extractUserRow(html, email) {
	const match = html.match(
		new RegExp(
			`<tr>\\s*<td>${escapeRegExp(email)}<\\/td>\\s*<td><code>([^<]+)<\\/code><\\/td>\\s*<td><code>([^<]+)<\\/code><\\/td>\\s*<\\/tr>`,
			"s",
		),
	);
	assert.ok(match, `Esperava encontrar a linha do usuário ${email}.`);
	return { salt: match[1], hashPreview: match[2] };
}

export function extractSessionRow(html, sessionId) {
	const match = html.match(
		new RegExp(
			`<tr>\\s*<td><code>${escapeRegExp(sessionId)}<\\/code><\\/td>\\s*<td>([^<]+)<\\/td>\\s*<td>([^<]+)<\\/td>\\s*<td>([^<]+)<\\/td>\\s*<\\/tr>`,
			"s",
		),
	);
	assert.ok(match, `Esperava encontrar a linha da sessão ${sessionId}.`);
	return {
		email: match[1],
		createdAt: match[2],
		views: match[3],
	};
}

function splitSetCookie(setCookie) {
	return setCookie.split(/,(?=\s*[^=;,]+=)/);
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
