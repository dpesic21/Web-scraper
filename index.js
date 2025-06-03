const puppeteer = require('puppeteer');
const express = require('express');
const { Parser } = require('json2csv');  // Za konverziju u CSV
const fs = require('fs');  // Za rad s datotekama
const nodemailer = require('nodemailer');
const { diff } = require('deep-diff');  // Za usporedbu podataka
const app = express();
const PORT = 8000;

const url = 'https://www.cix.hr/en/members/members'; // URL stranice koju scrapiramo

// Funkcija za slanje e-maila
function sendEmailNotification(differences) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'dariopesic21@gmail.com',  // Vaš email
            pass: 'Gunner4life'              // Vaša email lozinka
        }
    });

    const mailOptions = {
        from: 'dariopesic21@gmail.com',  // Pošiljatelj
        to: 'manexy777@gmail.com',       // Primatelj
        subject: 'Razlika u CSV podacima', // Predmet emaila
        text: `Otkrivene su razlike u CSV podacima:\n\n${JSON.stringify(differences, null, 2)}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Greška pri slanju emaila:', error);
        } else {
            console.log('Email poslan: ' + info.response);
        }
    });
}

app.get('/scrape', async (req, res) => {
    console.log("Ruta '/scrape' je pozvana");

    try {
        // Pokreni Puppeteer preglednik
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Čekanje dok tablica postane dostupna
        await page.waitForSelector('table');

        // Dohvati HTML sadržaj stranice
        const html = await page.content();
        console.log('HTML sadržaj stranice:', html);

        // Dohvati podatke sa stranice
        const membersData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tr')); // Selektiraj sve redove tablice
            console.log('Broj redova:', rows.length);  // Logiraj broj redova

            const data = [];
            rows.forEach(row => {
                const cells = row.querySelectorAll('td'); // Odabir svih ćelija u redu
                console.log('Broj ćelija:', cells.length);  // Logiraj broj ćelija u redu
                if (cells.length > 0) {
                    const member = cells[0].innerText.trim();  // Prvi stupac - Member
                    const location = cells[1].innerText.trim();  // Drugi stupac - Location
                    const asNumber = cells[2].innerText.trim();  // Treći stupac - AS Number
                    data.push({ member, location, asNumber });  // Dodaj podatke u niz
                }
            });

            return data;
        });

        await browser.close();

        // Provjera da li su podaci prikupljeni
        if (membersData.length === 0) {
            return res.status(404).send('Nema podataka za prikazivanje.');
        }

        // Logiranje prikupljenih podataka
        console.log('Prikupljeni podaci:', membersData);

        // Spremanje podataka u JSON datoteku
        console.log('Spremanje JSON datoteke...');
        fs.writeFileSync('members_data.json', JSON.stringify(membersData, null, 4));  // JSON formatiranje s 4 razmaka

        // Generiranje CSV datoteke iz JSON podataka
        const json2csvParser = new Parser();
        const csvData = json2csvParser.parse(membersData);
        console.log('Spremanje CSV datoteke...');
        fs.writeFileSync('members_data.csv', csvData);  // Spremanje CSV datoteke

        // Učitavanje prethodnih podataka za usporedbu
        let previousData = [];
        if (fs.existsSync('previous_members_data.json')) {
            previousData = JSON.parse(fs.readFileSync('previous_members_data.json', 'utf8'));
        }

        // Usporedba podataka
        const differences = diff(previousData, membersData);

        if (differences) {
            console.log('Razlike između novih i prethodnih podataka:', differences);
            sendEmailNotification(differences);  // Pozivanje funkcije za slanje emaila
        } else {
            console.log('Nema razlika u podacima.');
        }

        // Spremanje novih podataka kao prethodnih podataka
        fs.writeFileSync('previous_members_data.json', JSON.stringify(membersData, null, 4));

        // Obavještavamo korisnika da su podaci spremljeni
        res.send('Podaci su uspješno spremljeni u JSON i CSV datoteku.');

    } catch (error) {
        console.error('Greška prilikom dohvaćanja podataka:', error);
        res.status(500).send('Došlo je do pogreške prilikom dohvaćanja podataka.');
    }
});

// Pokretanje servera na portu 8000
app.listen(PORT, () => {
    console.log(`Server running on PORT ${PORT}`);
});
