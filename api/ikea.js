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
        const projectUrl = `https://api.kitchen.planner.ikea.com/projects/${uuid}?encode=true`;
        const response = await fetch(projectUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`IKEA API Error: ${response.status}`);
        }

        const data = await response.json();
        return res.status(200).json(parseProject(data));

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

function parseProject(data) {
    const result = {
        name: data.name || 'Projet IKEA',
        cabinetCount: 0,
        facades: [],
        totalFacadeM2: 0
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
