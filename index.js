const puppeteer = require('puppeteer');
const express = require('express');
const { Parser } = require('json2csv');
const fs = require('fs');
const app = express();
const PORT = 8000;

const url = 'https://www.cix.hr/en/members/members';

app.get('/scrape', async (req, res) => {
    console.log("Ruta '/scrape' je pozvana");
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Čekanje dok tablica postane dostupna
        await page.waitForSelector('table');

        // Dohvat cijelog HTML sadržaja za logiranje
        const html = await page.content();
        console.log('HTML sadržaj stranice:', html);

        // Dohvat podataka sa stranice
        const membersData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tr'));  // Svi redovi tablice
            console.log('Rows:', rows.length);  // Logiramo broj redova

            const data = [];
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                console.log('Cells:', cells.length);  // Logiramo broj ćelija u svakom redu
                if (cells.length > 0) {
                    const member = cells[0].innerText.trim();
                    const location = cells[1].innerText.trim();
                    const asNumber = cells[2].innerText.trim();
                    data.push({ member, location, asNumber });
                }
            });

            return data;
        });

        await browser.close();

        // Logiranje podataka
        console.log('Prikupljeni podaci:', membersData);

        if (membersData.length === 0) {
            return res.status(404).send('Nema podataka za prikazivanje.');
        }

        res.json(membersData);

    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Došlo je do pogreške prilikom dohvaćanja podataka.');
    }
});

// Pokretanje servera
app.listen(PORT, () => {
    console.log(`Server running on PORT ${PORT}`);
});
