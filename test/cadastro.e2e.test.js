import assert from "node:assert/strict";
import test, { before } from "node:test";
import {
	assertHtmlIncludes,
	assertLink,
	assertSpecIncludes,
	createAuthenticatedClient,
	createClient,
	ensureE2EServerIsAvailable,
	extractUserRow,
	PASSWORD,
	registerUser,
	uniqueEmail,
} from "./e2e-helpers.js";

before(async () => {
	assertSpecIncludes(
		"spec/cadastro.feature",
		"Funcionalidade: Cadastro de usuários",
	);
	await ensureE2EServerIsAvailable();
});

test("spec/cadastro.feature - Cadastrar usuário com sucesso", async () => {
	const client = createClient();
	const email = uniqueEmail("ana");
	const response = await registerUser(client, email);
	const html = await response.text();

	assert.equal(response.status, 200);
	assertHtmlIncludes(html, "Usuário criado");
	assertHtmlIncludes(
		html,
		"A conta foi criada com sucesso. Agora você já pode fazer login.",
	);
	assertLink(html, "/login", "Fazer login");

	const { client: adminClient } =
		await createAuthenticatedClient("admin-cadastro");
	const adminResponse = await adminClient.request("/admin");
	const adminHtml = await adminResponse.text();
	const userRow = extractUserRow(adminHtml, email);

	assert.match(userRow.salt, /^[a-f0-9]{32}$/i);
	assert.notEqual(userRow.hashPreview, PASSWORD);
	assert.doesNotMatch(
		adminHtml,
		new RegExp(`<td>${email}<\\/td>[\\s\\S]*${PASSWORD}`),
	);
});

test("spec/cadastro.feature - Bloquear cadastro com e-mail já existente", async () => {
	const client = createClient();
	const email = uniqueEmail("ana-duplicada");

	const firstResponse = await registerUser(client, email);
	assert.equal(firstResponse.status, 200);

	const secondResponse = await registerUser(client, email);
	const html = await secondResponse.text();

	assert.equal(secondResponse.status, 409);
	assertHtmlIncludes(html, "Cadastro não concluído");
	assertHtmlIncludes(html, "Já existe um usuário cadastrado com esse e-mail.");
	assertLink(html, "/register", "Tentar novamente");
	assertLink(html, "/login", "Ir para login");
});
