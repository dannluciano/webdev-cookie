# Webdev Cookie

Aplicação Node.js com autenticação baseada em sessão, renderização server-side com Nunjucks e estilização com PicoCSS.

## Requisitos

- Node.js com suporte a ESM e `node:test`

## Instalação

```sh
npm install
```

## Execução

Modo normal:

```sh
npm start
```

Modo desenvolvimento com watch:

```sh
npm run dev
```

A aplicação sobe em `http://localhost:8080`.

## Comportamentos implementados

### Sessões

- A autenticação usa cookie `sessionId`.
- O cookie de login é enviado com `HttpOnly`, `Path=/` e `SameSite=Strict`.
- As sessões ficam apenas em memória.
- Cada sessão guarda pelo menos:
  - `email`
  - `createdAt`
  - opcionalmente `views`
- Sessões expiradas são removidas automaticamente após `30` minutos.

### Usuários

- Os usuários também ficam apenas em memória.
- Senhas não são armazenadas em texto puro.
- O cadastro usa:
  - `salt` aleatório
  - `crypto.pbkdf2` com `sha512`
- A validação de senha usa comparação segura com `timingSafeEqual`.

### Templates

Os templates ficam em [templates](/Users/dannluciano/developer/webdev-cookie/templates) e são renderizados com Nunjucks.

Todos os templates recebem automaticamente a variável:

- `isAuthenticated`: indica se a requisição atual possui uma sessão válida

Template base:

- [templates/layout.njk](/Users/dannluciano/developer/webdev-cookie/templates/layout.njk)

Templates de página:

- [templates/index.njk](/Users/dannluciano/developer/webdev-cookie/templates/index.njk)
- [templates/register.njk](/Users/dannluciano/developer/webdev-cookie/templates/register.njk)
- [templates/login.njk](/Users/dannluciano/developer/webdev-cookie/templates/login.njk)
- [templates/dashboard.njk](/Users/dannluciano/developer/webdev-cookie/templates/dashboard.njk)
- [templates/admin.njk](/Users/dannluciano/developer/webdev-cookie/templates/admin.njk)
- [templates/message.njk](/Users/dannluciano/developer/webdev-cookie/templates/message.njk)

## Rotas

### Públicas

- `GET /`
  - exibe a página inicial
  - mostra links públicos quando não há sessão
  - mostra links privados quando há sessão

- `GET /register`
  - exibe o formulário de cadastro

- `POST /register`
  - cria um usuário
  - retorna página de sucesso quando o cadastro é concluído
  - retorna `409` quando o e-mail já está cadastrado

- `GET /login`
  - exibe o formulário de login

- `POST /login`
  - autentica o usuário
  - retorna `401` se as credenciais forem inválidas
  - retorna `302` redirecionando para `/dashboard` quando o login é válido

### Protegidas

- `GET /dashboard`
  - exige autenticação
  - mostra o e-mail do usuário autenticado

- `GET /admin`
  - exige autenticação
  - lista todos os usuários em memória
  - lista todas as sessões em memória
  - mostra `N/A` quando `createdAt` não existe
  - mostra `Anônimo` quando a sessão não possui `email`

- `GET /logout`
  - exige autenticação
  - remove a sessão atual
  - envia um cookie expirado para limpar `sessionId`

### Fallback

- qualquer rota não mapeada retorna:
  - status `404`
  - template de mensagem amigável

## Estrutura

- [app.js](/Users/dannluciano/developer/webdev-cookie/app.js): lógica principal da aplicação e fábrica `createApp()`
- [main.js](/Users/dannluciano/developer/webdev-cookie/main.js): bootstrap do servidor HTTP
- [main.test.js](/Users/dannluciano/developer/webdev-cookie/main.test.js): testes automatizados com `node:test`

## Testes

Executar a suíte:

```sh
npm test
```

Executar a suíte com cobertura:

```sh
npm run test:coverage
```

Cobertura atual da lógica principal em [app.js](/Users/dannluciano/developer/webdev-cookie/app.js):

- `100%` lines
- `100%` branches
- `100%` functions

## Observações

- O estado da aplicação não persiste reinícios do processo.
- A rota `/admin` expõe dados sensíveis de usuários e sessões e hoje serve apenas para estudo, depuração ou demonstração.
