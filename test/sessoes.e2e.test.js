import assert from "node:assert/strict";
import test, { before } from "node:test";
import {
	assertSetCookieContains,
	assertSpecIncludes,
	createClient,
	ensureE2EServerIsAvailable,
	extractSessionRow,
	loginUser,
	registerUser,
	uniqueEmail,
} from "./e2e-helpers.js";

before(async () => {
	assertSpecIncludes(
		"spec/sessoes.feature",
		"Funcionalidade: Gerenciamento de sessões",
	);
	await ensureE2EServerIsAvailable();
});

test("spec/sessoes.feature - Criar sessão em memória após login válido", async () => {
	const client = createClient();
	const email = uniqueEmail("nina");

	const registerResponse = await registerUser(client, email);
	assert.equal(registerResponse.status, 200);

	const loginResponse = await loginUser(client, email);
	assert.equal(loginResponse.status, 302);

	const sessionId = client.getCookie("sessionId");
	assert.ok(sessionId);

	const adminResponse = await client.request("/admin");
	const adminHtml = await adminResponse.text();
	const sessionRow = extractSessionRow(adminHtml, sessionId);

	assert.equal(sessionRow.email, email);
	assert.notEqual(sessionRow.createdAt, "N/A");
});

test("spec/sessoes.feature - Remover sessão atual no logout", async () => {
	const client = createClient();
	const email = uniqueEmail("otto");

	const registerResponse = await registerUser(client, email);
	assert.equal(registerResponse.status, 200);

	const loginResponse = await loginUser(client, email);
	assert.equal(loginResponse.status, 302);
	assert.ok(client.getCookie("sessionId"));

	const logoutResponse = await client.request("/logout");
	assert.equal(logoutResponse.status, 200);
	assertSetCookieContains(logoutResponse, "sessionId=", "Max-Age=0");
	assert.equal(client.getCookie("sessionId"), undefined);
});
