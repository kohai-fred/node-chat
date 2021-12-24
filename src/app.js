const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const http = require("http");

const app = express();

const server = http.createServer(app);
const io = require("socket.io")(server);

const PORT = 1337;

app.set("view engine", "pug");
app.set("views", "./src/views");

app.locals.pretty = true;

require("./chat-server")(io);

app.use(
    helmet.contentSecurityPolicy({
        useDefaults: false,
        directives: {
            "default-src":
                helmet.contentSecurityPolicy.dangerouslyDisableDefaultSrc,
            "script-src": ["'self'"],
        },
    })
);
app.use(morgan("tiny"));
app.use(express.static("./src/static"));

app.get("/", (request, response) => {
    response.render("index");
});
app.get("/chat", (request, response) => {
    // Un paramètre pseudo est obligatoire pour accéder à cette route
    if (!request.query.pseudo) {
        return response.redirect("/");
    }
    const pseudo = request.query.pseudo;
    response.render("chat", { pseudo });
});

server.listen(PORT, () => {
    console.log(`Le serveur écoute sur http://localhost:${PORT}`);
});
