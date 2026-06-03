import http from "http";
import crypto from "crypto";

const sessions = {};

const PORT = 8080;

const HOST = "localhost";

function generateSessionId() {
	return crypto.randomBytes(16).toString("hex");
}

function parseCookies(req) {
	const header = req.headers.cookie || "";
	const cookies = {};

	header.split(";").forEach((cookie) => {
		const [key, value] = cookie.trim().split("=");
		if (key) cookies[key] = value;
	});

	return cookies;
}

const server = http.createServer((req, res) => {
	const cookies = parseCookies(req);
	let sessionId = cookies.sessionId;

	if (!sessionId || !sessions[sessionId]) {
		sessionId = generateSessionId();
		const now = Date.now();
		sessions[sessionId] = { createdAt: now, lastRequest: now };

		res.setHeader(
			"Set-Cookie",
			`sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=1800; SameSite=Strict`,
		);
	}

	const session = sessions[sessionId];
	session.lastRequest = Date.now();

	session.views = (session.views || 0) + 1;

	res.writeHead(200, { "Content-Type": "text/plain" });
	res.end(`Visitas: ${session.views}\nSessions: ${JSON.stringify(sessions)}`);
});

server.listen(PORT, HOST, () => {
	console.log(`Servidor rodando em http://${HOST}:${PORT}`);
});

const SESSION_TTL = 1000 * 30; // 30 minutos

function removeOldSessions() {
	console.log("Limpa Sessões");
	const now = Date.now();
	for (const id in sessions) {
		if (now - sessions[id].lastRequest > SESSION_TTL) {
			delete sessions[id];
		}
	}
}

setInterval(removeOldSessions, 10000);
