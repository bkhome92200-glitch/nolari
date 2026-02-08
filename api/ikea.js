export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { uuid } = req.query;

    if (!uuid) {
        return res.status(400).json({ error: 'UUID manquant' });
    }

    try {
        // Essayer plusieurs endpoints
        const endpoints = [
            `https://kitchen.planner.ikea.com/api/projects/${uuid}`,
            `https://api.kitchen.planner.ikea.com/projects/${uuid}?encode=true`,
            `https://kitchen.planner.ikea.com/fr/fr/api/projects/${uuid}`
        ];

        let data = null;
        let lastError = null;

        for (const url of endpoints) {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                        'Referer': 'https://kitchen.planner.ikea.com/',
                        'Origin': 'https://kitchen.planner.ikea.com',
                        'Sec-Fetch-Dest': 'empty',
                        'Sec-Fetch-Mode': 'cors',
                        'Sec-Fetch-Site': 'same-origin'
                    }
                });

                if (response.ok) {
                    data = await response.json();
                    break;
                }
            } catch (e) {
                lastError = e.message;
            }
        }

        if (data) {
            return res.status(200).json(parseProject(data));
        }

        return res.status(500).json({ 
            error: 'IKEA API bloquée',
            details: lastError,
            uuid: uuid
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

function parseProject(data) {
    const result = {
        name: data.name || 'Projet IKEA',
        cabinetCount: 0,
        facades: [],
        totalFacadeM2: 0,
        raw: data
    };

    if (data.zones) {
        data.zones.forEach(zone => {
            if (zone.furnitures) {
                zone.furnitures.forEach(furniture => {
                    if (furniture.productID) {
                        result.cabinetCount++;
                        const w = (furniture.parameters?.width || 600) - 3;
                        const h = furniture.parameters?.height || 800;
                        const m2 = (w * h) / 1000000;
                        result.facades.push({
                            desc: `Façade ${furniture.productID}`,
                            w, h: h > 1500 ? h - 5 : h - 3,
                            qty: 1, m2
                        });
                        result.totalFacadeM2 += m2;
                    }
                });
            }
        });
    }
    return result;
}
```
