const puppeteer = require("puppeteer");
const { supabase } = require("./supabase");
require('dotenv').config();

async function runBot() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(process.env.TARGET_URL); // Reemplaza la URL con la página que deseas visitar

  // Espera a que los elementos deseados estén presentes en la página
  await page.waitForSelector(
    "div.grid.grid-cols-1.sm\\:grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.gap-4"
  );

  // Obtén el contenido de todos los elementos utilizando page.$$eval()
  const elementContents = await page.$$eval(
    "div.grid.grid-cols-1.sm\\:grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.gap-4",
    (elements) => {
      return elements.map((element) => {
        const a = element.querySelector("a");
        const h2 = element.querySelector("h2");
        const p = element.querySelector("p");
        return {
          href: a.href,
          h2: h2.textContent,
          p: p.textContent,
        };
      });
    }
  );

  for (const content of elementContents) {
    const { href, h2, p } = content;

    const blogs = await supabase
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    const prevPostTtile = blogs.data[0].title

    if (h2 === prevPostTtile) {
      console.log('last post is up to date')
      return;
    }

    const { data, error } = await supabase
      .from("blogs")
      .insert({ title: h2, description: p, url: href });

    if (error) {
      console.log("Error al insertar en la base de datos:", error);
    } else {
      console.log("Datos insertados en la base de datos:", data);
    }
  }
  // Cierra el navegador
  await browser.close();
}

runBot();
setInterval(() => {
  console.log("scrapping...");
  runBot();
}, process.env.SCRAP_INTERVAL);
