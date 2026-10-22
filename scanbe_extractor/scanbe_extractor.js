(async function() {
    'use strict';

    console.log("Розпочинаю розгортання та аналіз сторінки Scanbe...");

    // 1. Автоматичне розгортання всіх закритих аккордеонів
    const accordionToggles = document.querySelectorAll('.card-header, .accordion-toggle, [data-toggle="collapse"], details summary, [class*="title"], [class*="header"]');
    
    for (let toggle of accordionToggles) {
        // Клікаємо лише якщо блок містить лічильник або стрілку і ще не розгорнутий
        if ((toggle.innerText.match(/\d+/) || toggle.querySelector('svg, i, .arrow')) && !toggle.classList.contains('active')) {
            toggle.click();
            await new Promise(r => setTimeout(r, 200)); // Короткий інтервал для рендерингу
        }
    }

    // Пауза 1 секунда для повного оновлення DOM
    await new Promise(r => setTimeout(r, 1000));

    const pageUrl = window.location.href;
    const pageText = document.body.innerText;

    // --- А. ЕКСТРАКЦІЯ СУДОВИХ СПРАВ ---
    const courtCases = [];
    const courtBlocks = document.querySelectorAll('.card, .court-case, [class*="court"], [class*="case"], .result-item');

    courtBlocks.forEach(block => {
        const text = block.innerText || '';

        // Шукаємо лише ті блоки, де є ознаки судової справи
        if (text.includes('Справа') || /\b\d{3,5}\/\d+\/\d{2,4}\b/.test(text)) {
            
            // Номер справи
            const caseNoMatch = text.match(/\b\d{3,5}\/\d+\/\d{2,4}(?:-[а-яА-Яa-zA-Z0-9]+)?\b/);
            const caseNumber = caseNoMatch ? caseNoMatch[0] : "Номер не вказано";

            // Дата
            const dateMatch = text.match(/\b\d{2}\.\d{2}\.\d{4}\b/);
            const eventDate = dateMatch ? dateMatch[0] : "Не вказано";

            // Статті (шукаємо згадки ст. або статей)
            const articlesMatch = text.match(/(?:ст\.|стаття|ст\.ст\.)\s*[\d\s,.\-А-Яа-яКУпАПКУКЦПК]+/gi);
            const articles = articlesMatch ? articlesMatch.join('; ') : "Не вказано";

            // Посилання на рішення / реєстр
            const links = [];
            block.querySelectorAll('a').forEach(a => {
                if (a.href && !a.href.startsWith('javascript:')) {
                    links.push(a.href);
                }
            });

            // Назва суду (шукаємо слово "суд")
            const courtNameMatch = text.match(/([А-Яа-яIіЇїЄє\s"’'–-]+суд[А-Яа-яIіЇїЄє\s"’'–-]*)/i);
            const courtName = courtNameMatch ? courtNameMatch[0].trim() : "Не вказано";

            courtCases.push({
                "Судова справа №": caseNumber,
                "дата події": eventDate,
                "Категорія справи": "Витягнуто з реєстру", 
                "Статті": articles,
                "ПІБ учасників справи": "Див. опис нижче",
                "Короткий опис події": text.replace(/\s+/g, ' ').slice(0, 500) + "...",
                "Назва суду": courtName,
                "Стан наразі": "Розглянуто / В процесі",
                "Посилання": links.length > 0 ? links.join(', ') : pageUrl
            });
        }
    });

    // --- Б. ЕКСТРАКЦІЯ ВИКОНАВЧИХ ПРОВАДЖЕНЬ (БОРЖНИКИ) ---
    const enforcementProceedings = [];
    const debtorBlocks = document.querySelectorAll('[class*="debtor"], [class*="asvp"], [class*="enforcement"], .result-block');

    debtorBlocks.forEach(block => {
        const text = block.innerText || '';

        if (text.includes('Боржник') || text.includes('Стягувач') || text.includes('ВП №') || text.includes('ВП')) {
            enforcementProceedings.push({
                "Повний опис/Запис": text.replace(/\s+/g, ' ').trim(),
                "Джерело": pageUrl
            });
        }
    });

    // Очищення від дублікатів
    const uniqueCourtCases = Array.from(new Map(courtCases.map(item => [item["Судова справа №"] + item["Короткий опис події"], item])).values());
    const uniqueEnforcement = Array.from(new Set(enforcementProceedings.map(e => e["Повний опис/Запис"])));

    // Формування підсумкового JSON
    const outputData = {
        "extracted_at": new Date().toISOString(),
        "source_url": pageUrl,
        "court_cases_count": uniqueCourtCases.length,
        "court_cases": uniqueCourtCases,
        "enforcement_proceedings_count": uniqueEnforcement.length,
        "enforcement_proceedings": uniqueEnforcement
    };

    if (uniqueCourtCases.length === 0 && uniqueEnforcement.length === 0) {
        alert("Не вдалося автоматично згрупувати дані. Перевірте, чи завантажилися картки.");
        return;
    }

    // Завантаження файлу JSON
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(outputData, null, 4));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Scanbe_Parsed_Data.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    alert(`Успішно зібрано:\n- Судових справ: ${uniqueCourtCases.length}\n- Виконавчих записів: ${uniqueEnforcement.length}`);
})();