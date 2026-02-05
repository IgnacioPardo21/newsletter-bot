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

    let emailBody = articles.map(a => {
        const resumen = resumirNoticia(a);
        return `
            <li style="margin-bottom:20px; padding:10px; background:#f9f9f9; border-radius:8px; list-style:none;">
                <a href="${a.url}" target="_blank" style="color:#1a73e8; font-size:16px; font-weight:bold; text-decoration:none;">
                    ${a.title}
                </a>
                <p style="margin:8px 0 0 0; color:#333; font-size:14px; line-height:1.5;">
                    ${resumen}
                </p>
            </li>
        `;
    }).join('');

    let mailOptions = {
        from: emailUser,
        to: emailDestino,
        subject: "Tu newsletter diaria con lo más importante",
        html: `
            <div style="font-family:Arial,sans-serif; background:#f0f2f5; padding:20px;">
                <div style="max-width:600px; margin:0 auto; background:#ffffff; padding:20px; border-radius:10px; box-shadow:0 0 10px rgba(0,0,0,0.1);">
                    <h2 style="color:#1a73e8; border-bottom:2px solid #1a73e8; padding-bottom:8px;">Noticias del día</h2>
                    <ul style="padding:0; margin:20px 0 0 0;">
                        ${emailBody}
                    </ul>
                    <p style="color:#777; font-size:12px; margin-top:30px; text-align:center;">
                        Recibes este correo porque estás suscrito a nuestra newsletter diaria.
                    </p>
                </div>
            </div>
        `
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
    console.log("🚀 Iniciando...");
    let articles = await obtenerNoticias();
    await enviarCorreo(articles);
})();

// Resumir noticia con limpieza y evitando duplicados
function resumirNoticia(article, maxSentences = 3) {
    let text = article.content || article.description || "";
    if (!text) return "Resumen no disponible.";

    text = text
        .replace(/\[\+\d+\schars\]/gi, "")
        .replace(/…/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const sentences = text.split(/(?<=[.!?])\s+/);
    const result = [];

    for (const sentence of sentences) {
        const trimmed = sentence.trim();

        // Solo frases bien cerradas
        if (!/[.!?]$/.test(trimmed)) continue;

        const clean = trimmed.toLowerCase().replace(/[^\w\s]/g, "");

        const isDuplicate = result.some(s =>
            s.toLowerCase().replace(/[^\w\s]/g, "").includes(clean) ||
            clean.includes(s.toLowerCase().replace(/[^\w\s]/g, ""))
        );

        if (!isDuplicate) result.push(trimmed);
        if (result.length === maxSentences) break;
    }

    // 🔁 FALLBACK: si no quedó ninguna frase válida
    if (result.length === 0 && article.description) {
        let fallback = article.description
            .replace(/\s+/g, " ")
            .trim();
        if (!/[.!?]$/.test(fallback)) fallback += ".";
        return fallback.split(" ").slice(0, 25).join(" ") + ".";
    }

    return result.join(" ");
}
