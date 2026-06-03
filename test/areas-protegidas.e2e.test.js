import assert from "node:assert/strict";
import test, { before } from "node:test";
import {
	assertHtmlIncludes,
	assertLink,
	assertSetCookieContains,
	assertSpecIncludes,
	createAuthenticatedClient,
	ensureE2EServerIsAvailable,
	request,
} from "./e2e-helpers.js";

before(async () => {
	assertSpecIncludes(
		"spec/areas_protegidas.feature",
		"Funcionalidade: Áreas protegidas",
	);
	await ensureE2EServerIsAvailable();
});

for (const route of ["/dashboard", "/admin", "/logout"]) {
	test(`spec/areas_protegidas.feature - Bloquear acesso anônimo a ${route}`, async () => {
		const response = await request(route);
		const html = await response.text();

		assert.equal(response.status, 401);
		assertHtmlIncludes(html, "Acesso não autorizado");
		assertHtmlIncludes(
			html,
			"Você precisa fazer login para acessar esta área.",
		);
		assertLink(html, "/login", "Fazer login");
		assertLink(html, "/register", "Criar conta");
	});
}

test("spec/areas_protegidas.feature - Acessar dashboard autenticado", async () => {
	const { client, email } = await createAuthenticatedClient("bia-dashboard");
	const response = await client.request("/dashboard");
	const html = await response.text();

	assert.equal(response.status, 200);
	assertHtmlIncludes(html, "Dashboard");
	assertHtmlIncludes(html, "Bem-vindo");
	assertHtmlIncludes(html, email);
	assertLink(html, "/logout", "Encerrar sessão");
});

test("spec/areas_protegidas.feature - Encerrar sessão autenticada", async () => {
	const { client } = await createAuthenticatedClient("cai-logout");
	const response = await client.request("/logout");
	const html = await response.text();

	assert.equal(response.status, 200);
	assertHtmlIncludes(html, "Logout realizado");
	assertHtmlIncludes(html, "A sessão foi encerrada com sucesso.");
	assertSetCookieContains(response, "sessionId=", "Max-Age=0", "Path=/");
	assert.equal(client.getCookie("sessionId"), undefined);
});

test("spec/areas_protegidas.feature - Bloquear dashboard após logout", async () => {
	const { client, sessionId } =
		await createAuthenticatedClient("cai-dashboard");

	const logoutResponse = await client.request("/logout");
	assert.equal(logoutResponse.status, 200);

	const response = await request("/dashboard", {
		headers: {
			cookie: `sessionId=${sessionId}`,
		},
	});
	const html = await response.text();

	assert.equal(response.status, 401);
	assertHtmlIncludes(html, "Acesso não autorizado");
});
