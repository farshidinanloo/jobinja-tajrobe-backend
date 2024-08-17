import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();
const cache = new NodeCache({ stdTTL: 1 * 24 * 60 * 60 });

const app = express();
app.use(cors());
app.use(express.json());

app.listen(3000, () => {
	console.log('Listening on port 3000');
});

app.get('/company', async (req, res) => {
	const { name } = req.query;
	if (cache.has(name)) {
		res.json(cache.get(name));
		return;
	}

	try {
		const data = await scrape(name);
		cache.set(name, data);
		res.json(data);
	} catch (error) {
		console.log(error);
	}
});

const scrape = async (name) => {
	// const browser = await puppeteer.launch({ headless: false });
	const browser = await puppeteer.connect({
		browserWSEndpoint: `wss://jobinja-tajrobe-2-bjqqunyqt.liara.run?token=${process.env.LIARA_API_KEY}`,
	});
	const page = await browser.newPage();

	const url = 'https://tajrobe.github.io/search';

	await page.goto(url);

	await page.waitForSelector('.hero-search input');
	await page.type('.hero-search input', name);
	await page.keyboard.press('Enter');

	try {
		await page.waitForSelector('a.black-link', {
			timeout: 10_000,
		});
		await page.click('a.black-link', {});
		await page.waitForSelector('.c-cardText.o-box', {
			timeout: 10_000,
		});
	} catch (error) {
		await browser.close();
		return [];
	}

	const data = await page.evaluate(() => {
		const cardElements = document.querySelectorAll('.c-cardText.o-box');

		return Array.from(cardElements).map((card) => {
			const title = card.querySelector('.c-cardText__title')?.innerText || '';
			const date = card.querySelector('time')?.innerText || '';
			const test = card.querySelector('.c-cardText__body');
			let body = '';
			if (test) {
				const children = test.querySelectorAll('*');
				const tagNames = Array.from(children).map((child) => {
					return child.tagName;
				});

				for (let i = 0; i < tagNames.length; i++) {
					if (tagNames[i] === 'HR') {
						break;
					}
					body += children[i].innerText;
				}
			}

			return {
				title,
				date,
				body,
			};
		});
	});
	// console.log(data);

	await browser.close();
	return data?.length ? data.slice(2) : [];
};
