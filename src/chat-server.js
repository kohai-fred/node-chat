// ./src/chat-serveur.js
// =====================
// SERVEUR

const xss = require("xss");
const seedColor = require("seed-color");

module.exports = function (io) {
    const connectedUsers = [];
    const antiSpam = new AntiSpam();

    io.on("connection", (socket) => {
        console.log(`Socket #${socket.id} connected!`);

        // socket.emit -->
        // socket.on <--

        // Dès qu'on a reçu un pseudo, on met la liste à jour
        socket.on("user:pseudo", (pseudo) => {
            console.log(`L'utilisateur ${pseudo} vient d'arriver sur le chat`);
            connectedUsers.push({
                id: socket.id,
                pseudo,
                color: seedColor(pseudo).toHex(),
            });

            console.log("Utilisateurs connectés :", connectedUsers);

            // Envoyer la liste à jour des utilisateurs connectés à TOUS LES CLIENTS CONNECTES
            io.emit("users:list", connectedUsers);
        });

        // Dès qu'on reçoit un message d'un user, on le transmet aux autres users
        socket.on("user:message", (message) => {
            // Vérification que l'utilisateur  (son socket ID) n'est pas dans la spam list
            if (antiSpam.isInList(socket.id)) {
                return console.log(
                    `[antispam]: Message from ${message.pseudo} blocked!`
                );
            }

            // Vérification qu'on a pas reçu un message vide !
            if (message.message.trim() === "") return;

            // Nettoyer le HTML des messages (pour prévenir les attaques de type XSS)
            message.message = xss(message.message, {
                whiteList: {},
            });

            // Ajout de la couleur
            message.color = seedColor(message.pseudo).toHex();

            // Ajout du socket.id
            message.id = socket.id;

            // Transférer le message à tout le monde (y compris l'émetteur)
            io.emit("user:message", message);

            // Ajout dans la liste antispam
            antiSpam.addToList(socket.id);
        });

        // Dès que le server reçoit l'info de qqn en train d'écrire
        socket.on("user:typing", (user) => {
            // Envoie à tout le monde SAUF à l'émetteur
            socket.broadcast.emit("user:typing", {
                pseudo: user.pseudo,
                id: socket.id,
            });
        });

        // Si un utilisateur se déconnecte, on met le tableau "connectedUsers" à jour
        socket.on("disconnect", (reason) => {
            let disconnectedUser = connectedUsers.findIndex(
                (user) => user.id === socket.id
            );
            if (disconnectedUser > -1) {
                connectedUsers.splice(disconnectedUser, 1); // Supprime l'utilisateur déconnecté du TBL
                io.emit("users:list", connectedUsers);
            }
        });
    });
};

class AntiSpam {
    static COOL_TIME = 2000;

    constructor() {
        this.spamList = [];
    }

    addToList(socketId) {
        if (!this.isInList(socketId)) {
            this.spamList.push(socketId);

            setTimeout(() => this.removeFromList(socketId), AntiSpam.COOL_TIME);
        }
    }

    removeFromList(socketId) {
        let index = this.spamList.indexOf(socketId);
        this.spamList.splice(index, 1);
    }

    isInList(socketId) {
        return this.spamList.includes(socketId);
    }
}
