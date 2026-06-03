import assert from "node:assert/strict";
import test, { before } from "node:test";
import {
	assertHtmlIncludes,
	assertSpecIncludes,
	createAuthenticatedClient,
	ensureE2EServerIsAvailable,
	extractSessionRow,
	extractUserRow,
} from "./e2e-helpers.js";

before(async () => {
	assertSpecIncludes(
		"spec/admin.feature",
		"Funcionalidade: Painel administrativo",
	);
	await ensureE2EServerIsAvailable();
});

test("spec/admin.feature - Listar usuários e sessões em memória", async () => {
	const { client, email, sessionId } = await createAuthenticatedClient("fred");
	const response = await client.request("/admin");
	const html = await response.text();

	assert.equal(response.status, 200);
	assertHtmlIncludes(html, "Painel administrativo");
	assertHtmlIncludes(html, "Usuários");
	assertHtmlIncludes(html, "Sessões");
	assertHtmlIncludes(html, "Session ID");

	const userRow = extractUserRow(html, email);
	assert.match(userRow.salt, /^[a-f0-9]{32}$/i);
	assert.ok(userRow.hashPreview.length > 0);

	const sessionRow = extractSessionRow(html, sessionId);
	assert.equal(sessionRow.email, email);
	assert.notEqual(sessionRow.createdAt, "N/A");
	assert.match(sessionRow.createdAt, /\d{2}\/\d{2}\/\d{4}/);
	assert.equal(sessionRow.views, "0");
});