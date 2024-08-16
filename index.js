import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.listen(3000, () => {
	console.log('Listening on port 3000');
});

app.get('/company', async (req, res) => {
	const { name } = req.query;
	const data = await scrape(name);

	res.json(data);
});

const scrape = async (name) => {
	const browser = await puppeteer.connect({
		browserWSEndpoint: `wss://jobinja-tajrobe-2-bjqqunyqt.liara.run?token=${process.env.LIARA_API_KEY}`,
	});
	const page = await browser.newPage();

	const url = 'https://tajrobe.github.io/search';

	await page.goto(url);

	await page.waitForSelector('.hero-search input');
	await page.type('.hero-search input', name);
	await page.keyboard.press('Enter');

	await page.waitForSelector('a.black-link', {
		timeout: 100000,
	});
	await page.click('a.black-link');

	const data = await page.evaluate(() => {
		const cardElements = document.querySelectorAll(
			'#sorted-section .c-cardText.o-box'
		);
		return Array.from(cardElements).map((card) => {
			const title = card.querySelector('.c-cardText__title').innerText;
			const date = card.querySelector('time').innerText;
			const body = card.querySelector('.c-cardText__body > p').innerText;
			return {
				title,
				date,
				body,
			};
		});
	});
	console.log(data);
	await browser.close();
	return data;
};
