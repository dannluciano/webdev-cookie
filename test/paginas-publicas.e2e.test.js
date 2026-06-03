import assert from "node:assert/strict";
import test, { before } from "node:test";
import {
	assertForm,
	assertHtmlExcludes,
	assertHtmlIncludes,
	assertInput,
	assertLink,
	assertSpecIncludes,
	createAuthenticatedClient,
	ensureE2EServerIsAvailable,
	request,
} from "./e2e-helpers.js";

before(async () => {
	assertSpecIncludes(
		"spec/paginas_publicas.feature",
		"Funcionalidade: Páginas públicas",
	);
	await ensureE2EServerIsAvailable();
});

test("spec/paginas_publicas.feature - Exibir página inicial para visitante anônimo", async () => {
	const response = await request("/");
	const html = await response.text();

	assert.equal(response.status, 200);
	assertHtmlIncludes(html, "Webdev Cookie");
	assertHtmlIncludes(
		html,
		"Crie uma conta ou faça login para acessar as áreas protegidas.",
	);
	assertLink(html, "/register", "Criar conta");
	assertLink(html, "/login", "Fazer login");
	assertHtmlExcludes(html, "Encerrar sessão");
});

test("spec/paginas_publicas.feature - Exibir formulário de cadastro", async () => {
	const response = await request("/register");
	const html = await response.text();

	assert.equal(response.status, 200);
	assertHtmlIncludes(html, "Criar usuário");
	assertForm(html, "/register");
	assertInput(html, "email", ["required"]);
	assertInput(html, "password", ["required", 'minlength="8"']);
});

test("spec/paginas_publicas.feature - Exibir formulário de login", async () => {
	const response = await request("/login");
	const html = await response.text();

	assert.equal(response.status, 200);
	assertHtmlIncludes(html, "Entrar");
	assertForm(html, "/login");
	assertInput(html, "email", ["required"]);
	assertInput(html, "password", ["required"]);
});

test("spec/paginas_publicas.feature - Exibir página inicial para usuário autenticado", async () => {
	const { client, email } = await createAuthenticatedClient("maria");
	const response = await client.request("/");
	const html = await response.text();

	assert.equal(response.status, 200);
	assertHtmlIncludes(html, "Você está autenticado como");
	assertHtmlIncludes(html, email);
	assertLink(html, "/dashboard", "Dashboard");
	assertLink(html, "/admin", "Admin");
	assertLink(html, "/logout", "Logout");
	assertHtmlExcludes(html, ">Login</a>");
});
