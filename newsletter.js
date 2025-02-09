require('dotenv').config();
const cron = require('node-cron');
const axios = require('axios');
const nodemailer = require('nodemailer');

const apiKey = process.env.NEWSAPI_KEY;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const emailDestino = process.env.EMAIL_DESTINO;

console.log("✅ Variables de entorno cargadas:");
console.log(`NEWSAPI_KEY: ${apiKey ? "OK" : "FALTA"}`);
console.log(`EMAIL_USER: ${emailUser ? "OK" : "FALTA"}`);
console.log(`EMAIL_DESTINO: ${emailDestino ? "OK" : "FALTA"}`);

async function obtenerNoticias() {
    console.log("📡 Buscando noticias...");
    const query = ["real estate España", "bolsa", "criptomonedas", "pádel", "fútbol", "actualidad", "política", "sucesos"];
    let articles = [];

    for (let term of query) {
        try {
            let response = await axios.get(`https://newsapi.org/v2/everything?q=${term}&language=es&apiKey=${apiKey}`);
            console.log(`✅ Recibidas ${response.data.articles.length} noticias para ${term}`);
            articles.push(...response.data.articles.slice(0, 2));
        } catch (error) {
            console.error(`⚠️ Error obteniendo noticias para ${term}:`, error.response ? error.response.data : error.message);
        }
    }

    return articles;
}

async function enviarCorreo(articles) {
    console.log("📨 Preparando email...");
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: emailUser, pass: emailPass }
    });

    let emailBody = articles.map(a => `<li><a href="${a.url}" target="_blank">${a.title}</a></li>`).join('');
    let mailOptions = {
        from: emailUser,
        to: emailDestino,
        subject: "Tu newsletter diaria",
        html: `<h2>Noticias del día</h2><ul>${emailBody}</ul>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("✅ Email enviado con éxito");
    } catch (error) {
        console.error("⚠️ Error enviando el correo:", error);
    }
}

// Para probar manualmente
(async () => {
    console.log("🚀 Iniciando prueba manual...");
    let articles = await obtenerNoticias();
    await enviarCorreo(articles);
})();
