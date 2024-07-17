const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socket(server);
const chess = new Chess();

let players = {};
let currPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chessy - The Chess Game" });
});

io.on("connection", (uniquesocket) => {
    console.log('Connected');

    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", 'w');
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", 'b');
    } else {
        uniquesocket.emit("spectatorRole");
    }

    uniquesocket.on("disconnect", () => {
        if (uniquesocket.id === players.white) {
            delete players.white;
        } else if (uniquesocket.id === players.black) {
            delete players.black;
        }
    });

    uniquesocket.on("move", (move) => {
        try {
            if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
            if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

            // Trim spaces from move properties
            const sanitizedMove = {
                from: move.from.trim(),
                to: move.to.trim(),
                promotion: move.promotion
            };

            const result = chess.move(sanitizedMove);
            if (result) {
                currPlayer = chess.turn();
                io.emit("move", sanitizedMove);
                io.emit("boardState", chess.fen());
            } else {
                console.log('Invalid move', sanitizedMove);
                uniquesocket.emit("InvalidMove", sanitizedMove);
            }

        } catch (err) {
            console.log('Error', err);
            uniquesocket.emit("InvalidMove", move);
        }
    });
});

server.listen(3000, () => {
    console.log('Listening on port 3000');
});
