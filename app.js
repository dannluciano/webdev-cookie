import crypto from "crypto";
import http from "http";
import nunjucks from "nunjucks";
import { version } from "os";
import path from "path";
import { fileURLToPath } from "url";

const SESSION_TTL = 1000 * 60 * 30;

function hashPassword(password, salt = null) {
  return new Promise((resolve, reject) => {
    salt = salt || crypto.randomBytes(16).toString("hex");

    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) return reject(err);

      resolve({
        salt,
        hash: derivedKey.toString("hex"),
      });
    });
  });
}

function safeCompare(a, b) {
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

async function verifyPassword(password, hash, salt) {
  const result = await hashPassword(password, salt);
  return safeCompare(result.hash, hash);
}

function generateSessionId() {
  return crypto.randomBytes(24).toString("hex");
}

function parseCookies(req) {
  const cookies = {};
  const header = req.headers.cookie || "";

  header.split(";").forEach((cookie) => {
    const [key, value] = cookie.trim().split("=");
    if (key) cookies[key] = value;
  });

  return cookies;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

nunjucks.configure(path.join(__dirname, "templates"), {
  autoescape: true,
});

function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const parsed = new URLSearchParams(body);
      const data = {};
      for (const [key, value] of parsed) data[key] = value;
      resolve(data);
    });
  });
}

function renderTemplate(templateName, context = {}) {
  return nunjucks.render(templateName, context);
}

function sendHtml(res, html, statusCode = 200) {
  res.writeHead(statusCode, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function buildTemplateContext(session, context = {}) {
  return {
    isAuthenticated: Boolean(session),
    ...context,
  };
}

function sendTemplate(
  res,
  session,
  templateName,
  context = {},
  statusCode = 200,
) {
  sendHtml(
    res,
    renderTemplate(templateName, buildTemplateContext(session, context)),
    statusCode,
  );
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "N/A";
  }

  return new Date(timestamp).toLocaleString("pt-BR");
}

function ensureAuthenticated(res, session) {
  if (session) {
    return true;
  }

  sendTemplate(
    res,
    session,
    "message.njk",
    {
      title: "Acesso não autorizado",
      message: "Você precisa fazer login para acessar esta área.",
      actions: [
        { href: "/login", label: "Fazer login" },
        { href: "/register", label: "Criar conta", secondary: true },
      ],
    },
    401,
  );

  return false;
}

function createApp() {
  const sessions = {};
  const users = {};

  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url, "http://localhost");
    const { pathname } = requestUrl;
    const cookies = parseCookies(req);
    const session = sessions[cookies.sessionId];

    if (pathname === "/api/" && req.method === "GET") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ version: "v0.0.1.beta" }));
      return;
    }

    if (pathname === "/" && req.method === "GET") {
      sendTemplate(res, session, "index.njk", {
        email: session?.email,
      });
      return;
    }

    if (pathname === "/register" && req.method === "GET") {
      sendTemplate(res, session, "register.njk");
      return;
    }

    if (pathname === "/login" && req.method === "GET") {
      sendTemplate(res, session, "login.njk");
      return;
    }

    if (pathname === "/register" && req.method === "POST") {
      const { email, password } = await parseBody(req);

      if (users[email]) {
        sendTemplate(
          res,
          session,
          "message.njk",
          {
            title: "Cadastro não concluído",
            message: "Já existe um usuário cadastrado com esse e-mail.",
            actions: [
              { href: "/register", label: "Tentar novamente" },
              { href: "/login", label: "Ir para login", secondary: true },
            ],
          },
          409,
        );
        return;
      }

      const { hash, salt } = await hashPassword(password);
      users[email] = { hash, salt };

      sendTemplate(res, session, "message.njk", {
        title: "Usuário criado",
        message:
          "A conta foi criada com sucesso. Agora você já pode fazer login.",
        actions: [
          { href: "/login", label: "Fazer login" },
          { href: "/register", label: "Criar outra conta", secondary: true },
        ],
      });
      return;
    }

    if (pathname === "/login" && req.method === "POST") {
      const { email, password } = await parseBody(req);
      const user = users[email];

      if (!user || !(await verifyPassword(password, user.hash, user.salt))) {
        sendTemplate(
          res,
          session,
          "message.njk",
          {
            title: "Login inválido",
            message: "As credenciais informadas não conferem.",
            actions: [
              { href: "/login", label: "Tentar novamente" },
              { href: "/register", label: "Criar conta", secondary: true },
            ],
          },
          401,
        );
        return;
      }

      const sessionId = generateSessionId();
      sessions[sessionId] = { email, createdAt: Date.now() };

      res.setHeader(
        "Set-Cookie",
        `sessionId=${sessionId}; HttpOnly; Path=/; SameSite=Strict`,
      );

      res.writeHead(302, { Location: "/dashboard" });
      res.end();
      return;
    }

    if (pathname === "/admin" && req.method === "GET") {
      if (!ensureAuthenticated(res, session)) {
        return;
      }

      const userEntries = Object.entries(users).map(([email, user]) => ({
        email,
        salt: user.salt,
        hash: user.hash,
      }));

      const sessionEntries = Object.entries(sessions).map(
        ([sessionId, data]) => ({
          sessionId,
          email: data.email || "Anônimo",
          createdAt: formatTimestamp(data.createdAt),
          views: data.views ?? 0,
        }),
      );

      sendTemplate(res, session, "admin.njk", {
        users: userEntries,
        sessions: sessionEntries,
      });
      return;
    }

    if (pathname === "/dashboard" && req.method === "GET") {
      if (!ensureAuthenticated(res, session)) {
        return;
      }

      sendTemplate(res, session, "dashboard.njk", {
        email: session.email,
      });
      return;
    }

    if (pathname === "/logout" && req.method === "GET") {
      if (!ensureAuthenticated(res, session)) {
        return;
      }

      delete sessions[cookies.sessionId];

      res.setHeader("Set-Cookie", "sessionId=; HttpOnly; Max-Age=0; Path=/");

      sendTemplate(res, session, "message.njk", {
        title: "Logout realizado",
        message: "A sessão foi encerrada com sucesso.",
        actions: [
          { href: "/login", label: "Fazer login novamente" },
          { href: "/register", label: "Criar conta", secondary: true },
        ],
      });
      return;
    }

    sendTemplate(
      res,
      session,
      "message.njk",
      {
        title: "Rota não encontrada",
        message: "A página solicitada não existe nesta aplicação.",
        actions: [
          { href: "/register", label: "Abrir cadastro" },
          { href: "/login", label: "Abrir login", secondary: true },
        ],
      },
      404,
    );
  });

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const id in sessions) {
      if (now - (sessions[id].createdAt || 0) > SESSION_TTL) {
        delete sessions[id];
      }
    }
  }, 60000);
  cleanupInterval.unref();

  return {
    server,
    sessions,
    users,
    async close() {
      clearInterval(cleanupInterval);
      if (!server.listening) {
        return;
      }

      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

const app = createApp();
const { server } = app;

export { createApp, hashPassword, server };
