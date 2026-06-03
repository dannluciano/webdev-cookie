import assert from "node:assert/strict";
import test, { before } from "node:test";
import {
	assertHtmlIncludes,
	assertSetCookieContains,
	assertSpecIncludes,
	createClient,
	ensureE2EServerIsAvailable,
	extractSessionRow,
	loginUser,
	PASSWORD,
	registerUser,
	uniqueEmail,
} from "./e2e-helpers.js";

before(async () => {
	assertSpecIncludes(
		"spec/autenticacao.feature",
		"Funcionalidade: Autenticação",
	);
	await ensureE2EServerIsAvailable();
});

test("spec/autenticacao.feature - Fazer login com sucesso", async () => {
	const client = createClient();
	const email = uniqueEmail("bia");

	const registerResponse = await registerUser(client, email);
	assert.equal(registerResponse.status, 200);

	const loginResponse = await loginUser(client, email);
	assert.equal(loginResponse.status, 302);
	assert.equal(loginResponse.headers.get("location"), "/dashboard");
	assertSetCookieContains(
		loginResponse,
		"sessionId=",
		"HttpOnly",
		"Path=/",
		"SameSite=Strict",
	);

	const sessionId = client.getCookie("sessionId");
	assert.ok(sessionId);

	const adminResponse = await client.request("/admin");
	const adminHtml = await adminResponse.text();
	const sessionRow = extractSessionRow(adminHtml, sessionId);

	assert.equal(sessionRow.email, email);
	assert.notEqual(sessionRow.createdAt, "N/A");
});

test("spec/autenticacao.feature - Rejeitar credenciais inválidas para usuário inexistente", async () => {
	const client = createClient();
	const response = await loginUser(client, uniqueEmail("ghost"));
	const html = await response.text();

	assert.equal(response.status, 401);
	assertHtmlIncludes(html, "Login inválido");
	assertHtmlIncludes(html, "As credenciais informadas não conferem.");
	assert.equal(client.getCookie("sessionId"), undefined);
});

test("spec/autenticacao.feature - Rejeitar credenciais inválidas para senha incorreta", async () => {
	const client = createClient();
	const email = uniqueEmail("duda");

	const registerResponse = await registerUser(client, email);
	assert.equal(registerResponse.status, 200);

	const response = await loginUser(client, email, "87654321");
	const html = await response.text();

	assert.equal(response.status, 401);
	assertHtmlIncludes(html, "Login inválido");
	assertHtmlIncludes(html, "As credenciais informadas não conferem.");
	assert.equal(client.getCookie("sessionId"), undefined);
});