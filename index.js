import fs from "fs/promises";
import puppeteer from "puppeteer";

//* extraer items de la pagina
function extractItems() {
  const quotes = document.querySelectorAll(".quote");
  return [...quotes].map((quote) => {
    const text = quote.querySelector(".text").innerText;
    const author = quote.querySelector(".author").innerText;
    const tags = [...quote.querySelectorAll(".tag")].map(
      (tag) => tag.innerText
    );
    return { text, author, tags };
  });
}

async function scrapeItems(page, extractItems, itemCount, scrollDelay = 200) {
  let items = [];
  let previousHeight;
  try {
    while (items.length < itemCount) {
      const newItems = await page.evaluate(extractItems);
      items = [...items, ...newItems]; // extraer elementos de la pagina

      //obtener altura de la pagina
      let newHeight = await page.evaluate("document.body.scrollHeight");
      if (newHeight === previousHeight) break;
      previousHeight = newHeight;

      //scroll hacia abajo
      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      // await page.waitForFunction(
      //   `document.body.scrollHeight > ${previousHeight}`
      // );
      await page.waitForTimeout(scrollDelay);
    }
  } catch (e) {}
  return items;
}

async function scrapeAllPages(page) {
  let allItems = new Set();
  while (true) {
    console.log("scrapeando pagina para obtener todas los items ");
    const items = await scrapeItems(page, extractItems, 100);
    items.forEach((item) => allItems.add(JSON.stringify(item))); // Añadir sin duplicados
    const nextBtn = await page.$(".pager > .next > a");
    if (!nextBtn) break; // si no hay paginas se detiene
    await nextBtn.click();

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return Array.from(allItems).map(JSON.parse);
}

const getQuotes = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  await page.goto("http://quotes.toscrape.com/", {
    waitUntil: "domcontentloaded",
  });

  const items = await scrapeAllPages(page); //*obtener todas las paginas
  fs.writeFile("quotes.json", JSON.stringify(items, null, 2), (err) => {
    if (err) throw err;
    console.log("File saved");
  });
  console.log(items.length);

  // Close the browser
  await browser.close();
};

// Start the scraping
getQuotes();
