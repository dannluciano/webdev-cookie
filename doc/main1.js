import http from "http";
import crypto from "crypto";

const sessions = {};

const PORT = 8080;

const HOST = "0.0.0.0";

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
		sessions[sessionId] = { createdAt: Date.now() };

		res.setHeader("Set-Cookie", `sessionId=${sessionId}; HttpOnly`);
	}

	const session = sessions[sessionId];

	session.views = (session.views || 0) + 1;

	res.writeHead(200, { "Content-Type": "text/plain" });
	res.end(`Visitas: ${session.views}\nSessions: ${JSON.stringify(sessions)}`);
});

server.listen(PORT, HOST, () => {
	console.log(`Servidor rodando em http://${HOST}:${PORT}`);
});
