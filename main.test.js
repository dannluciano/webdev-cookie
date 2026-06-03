import assert from "node:assert/strict";
import test from "node:test";
import crypto from "crypto";
import { createApp, hashPassword } from "./app.js";

async function startApp() {
	const app = createApp();

	await new Promise((resolve, reject) => {
		app.server.listen(0, "127.0.0.1", (error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});

	const address = app.server.address();
	const baseUrl = `http://127.0.0.1:${address.port}`;

	return { app, baseUrl };
}

async function request(baseUrl, pathname, options = {}) {
	return fetch(`${baseUrl}${pathname}`, {
		redirect: "manual",
		...options,
	});
}

async function createUser(baseUrl, email, password) {
	return request(baseUrl, "/register", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({ email, password }),
	});
}

async function loginUser(baseUrl, email, password) {
	return request(baseUrl, "/login", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({ email, password }),
	});
}

test("GET / renderiza a página inicial pública", async () => {
	const { app, baseUrl } = await startApp();

	try {
		const response = await request(baseUrl, "/");
		const html = await response.text();

		assert.equal(response.status, 200);
		assert.match(html, /Webdev Cookie/);
		assert.match(html, /Criar conta/);
		assert.doesNotMatch(html, /Encerrar sessão/);
	} finally {
		await app.close();
	}
});

test("GET /register e GET /login renderizam os formulários públicos", async () => {
	const { app, baseUrl } = await startApp();

	try {
		const registerResponse = await request(baseUrl, "/register");
		const registerHtml = await registerResponse.text();
		assert.equal(registerResponse.status, 200);
		assert.match(registerHtml, /Criar usuário/);
		assert.match(registerHtml, /<form action="\/register" method="post">/);

		const loginResponse = await request(baseUrl, "/login");
		const loginHtml = await loginResponse.text();
		assert.equal(loginResponse.status, 200);
		assert.match(loginHtml, /Entrar/);
		assert.match(loginHtml, /<form action="\/login" method="post">/);
	} finally {
		await app.close();
	}
});

test("rotas protegidas exigem autenticação", async () => {
	const { app, baseUrl } = await startApp();

	try {
		const response = await request(baseUrl, "/dashboard");
		const html = await response.text();

		assert.equal(response.status, 401);
		assert.match(html, /Acesso não autorizado/);
		assert.match(html, /Você precisa fazer login/);
	} finally {
		await app.close();
	}
});

test("cadastro duplica bloqueado com status 409", async () => {
	const { app, baseUrl } = await startApp();

	try {
		const firstResponse = await createUser(
			baseUrl,
			"ana@example.com",
			"12345678",
		);
		const firstHtml = await firstResponse.text();
		assert.equal(firstResponse.status, 200);
		assert.match(firstHtml, /Usuário criado/);

		const secondResponse = await createUser(
			baseUrl,
			"ana@example.com",
			"12345678",
		);
		const secondHtml = await secondResponse.text();
		assert.equal(secondResponse.status, 409);
		assert.match(secondHtml, /Cadastro não concluído/);
		assert.match(secondHtml, /Já existe um usuário cadastrado/);
	} finally {
		await app.close();
	}
});

test("login inválido retorna 401 para usuário inexistente e senha incorreta", async () => {
	const { app, baseUrl } = await startApp();

	try {
		const missingUserResponse = await loginUser(
			baseUrl,
			"ghost@example.com",
			"12345678",
		);
		const missingUserHtml = await missingUserResponse.text();
		assert.equal(missingUserResponse.status, 401);
		assert.match(missingUserHtml, /Login inválido/);

		await createUser(baseUrl, "duda@example.com", "12345678");
		const wrongPasswordResponse = await loginUser(
			baseUrl,
			"duda@example.com",
			"87654321",
		);
		const wrongPasswordHtml = await wrongPasswordResponse.text();
		assert.equal(wrongPasswordResponse.status, 401);
		assert.match(wrongPasswordHtml, /credenciais informadas não conferem/i);
	} finally {
		await app.close();
	}
});

test("login válido redireciona para dashboard e libera admin", async () => {
	const { app, baseUrl } = await startApp();

	try {
		await createUser(baseUrl, "bia@example.com", "12345678");

		const loginResponse = await loginUser(
			baseUrl,
			"bia@example.com",
			"12345678",
		);
		assert.equal(loginResponse.status, 302);
		assert.equal(loginResponse.headers.get("location"), "/dashboard");

		const cookieHeader = loginResponse.headers.get("set-cookie");
		assert.ok(cookieHeader);
		assert.match(cookieHeader, /sessionId=/);

		const dashboardResponse = await request(baseUrl, "/dashboard", {
			headers: {
				cookie: cookieHeader.split(";", 1)[0],
			},
		});
		const dashboardHtml = await dashboardResponse.text();

		assert.equal(dashboardResponse.status, 200);
		assert.match(dashboardHtml, /Bem-vindo/);
		assert.match(dashboardHtml, /bia@example\.com/);

		const adminResponse = await request(baseUrl, "/admin", {
			headers: {
				cookie: cookieHeader.split(";", 1)[0],
			},
		});
		const adminHtml = await adminResponse.text();

		assert.equal(adminResponse.status, 200);
		assert.match(adminHtml, /Painel administrativo/);
		assert.match(adminHtml, /bia@example\.com/);
		assert.match(adminHtml, /Session ID/);
	} finally {
		await app.close();
	}
});

test("home autenticada troca a navegação para rotas privadas", async () => {
	const { app, baseUrl } = await startApp();

	try {
		await createUser(baseUrl, "eve@example.com", "12345678");
		const loginResponse = await loginUser(
			baseUrl,
			"eve@example.com",
			"12345678",
		);
		const authCookie = loginResponse.headers.get("set-cookie").split(";", 1)[0];

		const response = await request(baseUrl, "/", {
			headers: {
				cookie: authCookie,
			},
		});
		const html = await response.text();

		assert.equal(response.status, 200);
		assert.match(html, /Você está autenticado como/);
		assert.match(html, /Dashboard/);
		assert.match(html, /Admin/);
		assert.match(html, /Logout/);
		assert.doesNotMatch(html, />Login</);
	} finally {
		await app.close();
	}
});

test("logout remove a sessão e volta a bloquear dashboard", async () => {
	const { app, baseUrl } = await startApp();

	try {
		await createUser(baseUrl, "cai@example.com", "12345678");
		const loginResponse = await loginUser(
			baseUrl,
			"cai@example.com",
			"12345678",
		);
		const authCookie = loginResponse.headers.get("set-cookie").split(";", 1)[0];

		const logoutResponse = await request(baseUrl, "/logout", {
			headers: {
				cookie: authCookie,
			},
		});
		const logoutHtml = await logoutResponse.text();

		assert.equal(logoutResponse.status, 200);
		assert.match(logoutHtml, /Logout realizado/);
		assert.match(logoutResponse.headers.get("set-cookie"), /Max-Age=0/);

		const dashboardResponse = await request(baseUrl, "/dashboard", {
			headers: {
				cookie: authCookie,
			},
		});

		assert.equal(dashboardResponse.status, 401);
	} finally {
		await app.close();
	}
});

test("admin e logout sem autenticação retornam 401", async () => {
	const { app, baseUrl } = await startApp();

	try {
		const adminResponse = await request(baseUrl, "/admin");
		const adminHtml = await adminResponse.text();
		assert.equal(adminResponse.status, 401);
		assert.match(adminHtml, /Acesso não autorizado/);

		const logoutResponse = await request(baseUrl, "/logout");
		const logoutHtml = await logoutResponse.text();
		assert.equal(logoutResponse.status, 401);
		assert.match(logoutHtml, /Acesso não autorizado/);
	} finally {
		await app.close();
	}
});

test("admin mostra sessão anônima e timestamp ausente como N/A", async () => {
	const { app, baseUrl } = await startApp();

	try {
		await createUser(baseUrl, "fred@example.com", "12345678");
		const loginResponse = await loginUser(
			baseUrl,
			"fred@example.com",
			"12345678",
		);
		const authCookie = loginResponse.headers.get("set-cookie").split(";", 1)[0];

		app.sessions.debugSession = {};

		const response = await request(baseUrl, "/admin", {
			headers: {
				cookie: authCookie,
			},
		});
		const html = await response.text();

		assert.equal(response.status, 200);
		assert.match(html, /Anônimo/);
		assert.match(html, />N\/A</);
	} finally {
		await app.close();
	}
});

test("admin preserva views existentes e ignora segmentos inválidos de cookie", async () => {
	const { app, baseUrl } = await startApp();

	try {
		await createUser(baseUrl, "gina@example.com", "12345678");
		const loginResponse = await loginUser(
			baseUrl,
			"gina@example.com",
			"12345678",
		);
		const authCookie = loginResponse.headers.get("set-cookie").split(";", 1)[0];
		const sessionId = authCookie.split("=", 2)[1];

		app.sessions[sessionId].views = 7;

		const response = await request(baseUrl, "/admin", {
			headers: {
				cookie: `${authCookie}; ; tema=claro`,
			},
		});
		const html = await response.text();

		assert.equal(response.status, 200);
		assert.match(html, />7</);
		assert.match(html, /gina@example\.com/);
	} finally {
		await app.close();
	}
});

test("rota inexistente retorna 404 com template de mensagem", async () => {
	const { app, baseUrl } = await startApp();

	try {
		const response = await request(baseUrl, "/nao-existe");
		const html = await response.text();

		assert.equal(response.status, 404);
		assert.match(html, /Rota não encontrada/);
		assert.match(html, /A página solicitada não existe/);
	} finally {
		await app.close();
	}
});

test("cleanup remove sessões expiradas e preserva sessões válidas", async () => {
	const originalSetInterval = global.setInterval;
	const originalClearInterval = global.clearInterval;
	let cleanupCallback;

	global.setInterval = (callback) => {
		cleanupCallback = callback;
		return {
			unref() { },
		};
	};
	global.clearInterval = () => { };

	try {
		const app = createApp();
		app.sessions.expired = { createdAt: Date.now() - 31 * 60 * 1000 };
		app.sessions.valid = { createdAt: Date.now() };
		app.sessions.missingTimestamp = {};

		cleanupCallback();

		assert.equal(app.sessions.expired, undefined);
		assert.ok(app.sessions.valid);
		assert.equal(app.sessions.missingTimestamp, undefined);

		await app.close();
	} finally {
		global.setInterval = originalSetInterval;
		global.clearInterval = originalClearInterval;
	}
});

test("close resolve sem listen e propaga erro de server.close", async () => {
	const idleApp = createApp();
	await assert.doesNotReject(() => idleApp.close());

	const failingApp = createApp();
	Object.defineProperty(failingApp.server, "listening", {
		configurable: true,
		value: true,
	});
	failingApp.server.close = (callback) => {
		callback(new Error("close failure"));
	};

	await assert.rejects(() => failingApp.close(), /close failure/);
});

test("hashPassword propaga erro do pbkdf2", async () => {
	const originalPbkdf2 = crypto.pbkdf2;
	crypto.pbkdf2 = (password, salt, iterations, keylen, digest, callback) => {
		callback(new Error("pbkdf2 failure"));
	};

	try {
		await assert.rejects(() => hashPassword("12345678"), /pbkdf2 failure/);
	} finally {
		crypto.pbkdf2 = originalPbkdf2;
	}
});
