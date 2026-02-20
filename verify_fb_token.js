
import fetch from 'node-fetch';

const TOKEN = "EAANZAV9IRnzwBQpxQ6ZAjCXNlQohZAAKkMN2wnKfAq5ZCuJne2GnfvQAzlgCzFZA3s9K9bHOZCzusbiDZBjoYc6SQCkXpqSHOZCFTgjQ0PeWgmCuo7HVxmX3ZCVEFK8o4aD7166VZCi9nnSvIZAY2UJu3WYNIqND5zkDTZA3AIaKUB38pzEGSCTg6QFAkURoyyZAEySzh";
const PAGE_ID = "963667040166127";

async function verify() {
    console.log("Verificando Token...");
    try {
        const url = `https://graph.facebook.com/me?access_token=${TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();

        console.log("Status:", res.status);
        console.log("Data:", JSON.stringify(data, null, 2));

        if (data.id === PAGE_ID) {
            console.log("✅ ES UN TOKEN DE PÁGINA CORRECTO!");
        } else {
            console.log("❌ NO COINCIDE CON EL PAGE_ID O ES UN USUARIO.");
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}

verify();
