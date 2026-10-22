(async function() {
    'use strict';

    console.log("Розпочинаю розгортання та аналіз Scanbe...");

    // 1. Автоматичне розгортання всіх закритих блоків (аккордеонів)
    const headers = document.querySelectorAll('.card-header, details summary, [class*="header"], [class*="title"]');
    for (let h of headers) {
        if (h.innerText.match(/\d+/) && !h.nextElementSibling?.isIntersecting) {
            h.click();
            await new Promise(r => setTimeout(r, 150));
        }
    }

    await new Promise(r => setTimeout(r, 800));

    // 2. Збір судових справ за точними блоками Scanbe
    const courtCases = [];
    const fullText = document.body.innerText;

    // Шукаємо всі блоки, де висвітлені судові справи
    const textBlocks = fullText.split(/(?=Номер судової справи|Сторона у справі)/g);

    textBlocks.forEach(block => {
        if (block.includes('Номер судової справи') || block.includes('705/') || /\b\d{3,5}\/\d+\/\d{2,4}\b/.test(block)) {
            
            // Витягуємо номер справи
            const caseNoMatch = block.match(/\b\d{3,5}\/\d+\/\d{2,4}(?:-[а-яА-Яa-zA-Z0-9]+)?\b/);
            const caseNumber = caseNoMatch ? caseNoMatch[0] : "Не вказано";

            // Витягуємо дату
            const dateMatch = block.match(/\b\d{2}\.\d{2}\.\d{4}\b/);
            const eventDate = dateMatch ? dateMatch[0] : "Не вказано";

            // Витягуємо ПІБ / Сторони
            const sideMatch = block.match(/(?:Сторона у справі|Записи сторін)[\s\S]*?([А-ЯІЇЄ][а-яіїє]+\s+[А-ЯІЇЄ][а-яіїє]+\s+[А-ЯІЇЄ][а-яіїє]+)/);
            const personName = sideMatch ? sideMatch[1] : "Зазначено у блоці";

            // Витягуємо склад суду
            const judgeMatch = block.match(/суддя[^\n:]*:?\s*([^\n]+)/i);
            const judge = judgeMatch ? judgeMatch[1].trim() : "Не вказано";

            // Збираємо посилання у цьому фрагменті
            const links = Array.from(document.querySelectorAll('a'))
                .filter(a => a.href && a.href.includes('reyestr.court.gov.ua'))
                .map(a => a.href);

            courtCases.push({
                "Судова справа №": caseNumber,
                "дата події": eventDate,
                "Категорія справи": block.includes('Кримінальне') ? 'Кримінальне' : 'Цивільне / Адміністративне',
                "ПІБ учасників справи": personName,
                "Склад суду": judge,
                "Короткий опис події": block.slice(0, 400).replace(/\s+/g, ' ').trim(),
                "Посилання": links.length > 0 ? [...new Set(links)].join(', ') : window.location.href
            });
        }
    });

    // Видалення дублікатів
    const uniqueCases = Array.from(new Map(courtCases.map(item => [item["Судова справа №"] + item["Короткий опис події"], item])).values());

    const resultOutput = JSON.stringify(uniqueCases, null, 4);

    // 3. Копіювання в буфер обміну (Clipboard) — найзручніший спосіб
    try {
        await navigator.clipboard.writeText(resultOutput);
        alert(`Знайдено та скопійовано у буфер обміну (${uniqueCases.length} справ)!\nПросто натисніть Ctrl+V у своєму текстовому редакторі чи нотатках.`);
    } catch (e) {
        // Якщо браузер заблокував доступ до буфера, викликаємо завантаження файлу
        const blob = new Blob([resultOutput], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Scanbe_Court_Cases.json`;
        a.click();
        alert(`Дані збережено у папку Завантаження (Downloads) у файл Scanbe_Court_Cases.json`);
    }
})();
