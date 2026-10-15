import { server } from "./app.js";

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";

server.listen(PORT, HOST, () => {
	console.log(`Server is running on http://${HOST}:${PORT}`);
});

function handle(signal) {
	console.log(`Received ${signal}`);
	server.close();
}

process.on("SIGINT", handle);
process.on("SIGTERM", handle);
