// const socket = io('http://localhost:1337/');
// CLIENT
const socket = io("/");

// Récupérer le pseudo dans l'URL
const URLQuery = Object.fromEntries(
    new URLSearchParams(window.location.search)
);
const pseudo = URLQuery.pseudo;

// Envoi du pseudo au serveur
socket.emit("user:pseudo", pseudo);

// Ecouter les mises à jour de liste de la part du serveur
socket.on("users:list", (connectedUsers) => {
    addUsersToList(connectedUsers);
});

const form = document.querySelector(".chatbox-form");
form.addEventListener("submit", (event) => {
    event.preventDefault();

    // Récupération du input text
    const messageEl = form.querySelector("[name=message]");

    // Vérification si le message n'est pas vide
    if (messageEl.value.trim() === "") {
        return;
    }

    // Création de l'objet 'message'
    const message = createMessage(messageEl.value);
    // Envoi de l'objet 'message' au serveur
    socket.emit("user:message", message);

    // Afficher le message dans la zone de tchat
    // showMessage(message);

    // Vide la zone de texte
    messageEl.value = "";
});

const messageEl = document.querySelector("[name=message]");
messageEl.addEventListener("input", (event) => {
    socket.emit("user:typing", { pseudo });
});

// Dès qu'on reçoit un message du serveur de la part d'un autre user
socket.on("user:message", (message) => {
    const index = typingUsers.findIndex((u) => u.id === message.id);
    if (index > -1) {
        typingUsers.splice(index, 1);
        showTypingUsers();
    }

    // Afficher le message dans la zone de tchat
    showMessage(message);
});

const typingUsers = [
    // { pseudo, id, timer }
];

// Si on reçoit une info serveur comme quoi qqn écrit …
socket.on("user:typing", (user) => {
    // Vérifier si l'utilisateur n'est pas déjà dans la liste des "typingUsers"
    let typingUser = typingUsers.find((u) => u.id === user.id);

    // S'il est déjà présent dans le tableau, on supprime son ancien timer
    if (typingUser) {
        clearTimeout(typingUser.timer);
    } else {
        // Sinon, on le crée et on l'ajoute au tableau
        typingUser = {
            pseudo: user.pseudo,
            id: user.id,
            timer: null,
        };
        typingUsers.push(typingUser);
    }

    typingUser.timer = setTimeout(() => {
        let index = typingUsers.findIndex((u) => u.id === typingUser.id);
        if (index > -1) {
            typingUsers.splice(index, 1);
            showTypingUsers();
        }
    }, 5000);

    showTypingUsers();
});

function showTypingUsers() {
    let html = "";
    typingUsers.forEach((user) => {
        html += `<div>${user.pseudo} est en train d'écrire …</div>`;
    });

    const notifications = document.querySelector(".notifications");
    notifications.innerHTML = html;
}

function addUsersToList(connectedUsers) {
    const ul = document.querySelector(".chat-users ul");
    ul.innerHTML = connectedUsers
        .map(({ pseudo, id, color }) => {
            let frontColor = calcLuminance(color) > 100 ? "#000000" : "#ffffff";
            const bgcLinear = shadeColor(color, 55);
            const idPicture = Math.round(Math.random() * 50);

            return `
                <li>
                    <span class="avatar">
                        <img src="https://i.pravatar.cc/25?img=${idPicture}" alt="">
                    </span>
                    <span style="background: linear-gradient(to bottom, ${color} 0%, ${bgcLinear} 100%); color: ${frontColor}">${pseudo}</span>
                </li>`;
        })
        .join("");
}

function createMessage(message) {
    return {
        date: Date.now(),
        pseudo,
        message,
    };
}

function showMessage({ date, pseudo, message, color }) {
    let frontColor = calcLuminance(color) > 100 ? "#000000" : "#ffffff";
    const bgcLinear = shadeColor(color, 55);
    let classRight = "";
    if (pseudo === URLQuery.pseudo) {
        classRight = "right";
    }

    // let messageHtml = `<div class="message">
    //     <span class="msg-date">${new Date(date).toLocaleString()}</span>
    //     <span class="msg-user" style="background-color: ${color}; color: ${frontColor}">${pseudo}</span>
    //     <span class="msg-message">${message}</span>
    // </div>`;
    let messageHtml = `
    <div class="message ${classRight}">
        <div class="msg-message ${classRight}" style="background: linear-gradient(to bottom, ${color} 0%, ${bgcLinear} 100%); color: ${frontColor}">
            <div class="msg-message_arrow ${classRight}" style="border-top-color: ${bgcLinear}"></div>
            <p>${message}</p>
        </div>
        <div class="${classRight}">
            <span class="msg-user">${pseudo}</span>
            <span class="msg-date">${new Date(date).toLocaleString()}</span>
        </div>
    </div>`;

    const chatboxMessages = document.querySelector(".chatbox-messages");
    chatboxMessages.innerHTML += messageHtml;

    // fix scroll to max bottom
    chatboxMessages.scrollTop = chatboxMessages.clientHeight;
}

function calcLuminance(color) {
    const c = color.substring(1); // strip #
    const rgb = parseInt(c, 16); // convert rrggbb to decimal
    const r = (rgb >> 16) & 0xff; // extract red
    const g = (rgb >> 8) & 0xff; // extract green
    const b = (rgb >> 0) & 0xff; // extract blue

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709

    return luma;
}

function shadeColor(color, percent) {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = parseInt((R * (100 + percent)) / 100);
    G = parseInt((G * (100 + percent)) / 100);
    B = parseInt((B * (100 + percent)) / 100);

    R = R < 255 ? R : 255;
    G = G < 255 ? G : 255;
    B = B < 255 ? B : 255;

    let RR = R.toString(16).length == 1 ? "0" + R.toString(16) : R.toString(16);
    let GG = G.toString(16).length == 1 ? "0" + G.toString(16) : G.toString(16);
    let BB = B.toString(16).length == 1 ? "0" + B.toString(16) : B.toString(16);

    return "#" + RR + GG + BB;
}
