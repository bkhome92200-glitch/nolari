// API Route pour récupérer les données IKEA Kitchen Planner
// Vercel Serverless Function

export default async function handler(req, res) {
    // CORS headers
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

    // Valider le format UUID
    const uuidPattern = /^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i;
    if (!uuidPattern.test(uuid)) {
        return res.status(400).json({ error: 'Format UUID invalide' });
    }

    try {
        // 1. Récupérer les métadonnées du projet
        const projectUrl = `https://api.kitchen.planner.ikea.com/projects/${uuid}?encode=true`;
        const projectResponse = await fetch(projectUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!projectResponse.ok) {
            throw new Error(`Erreur API IKEA: ${projectResponse.status}`);
        }

        const projectData = await projectResponse.json();

        // 2. Extraire les IDs des produits
        const productIds = extractProductIds(projectData);

        // 3. Récupérer les détails des produits si on a des IDs
        let productsData = {};
        if (productIds.length > 0) {
            const productsUrl = `https://api.kitchen.planner.ikea.com/products?languageID=1&${productIds.map(id => `ids[]=${id}`).join('&')}`;
            
            try {
                const productsResponse = await fetch(productsUrl, {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                if (productsResponse.ok) {
                    productsData = await productsResponse.json();
                }
            } catch (e) {
                console.log('Erreur récupération produits:', e);
            }
        }

        // 4. Parser et retourner les données structurées
        const parsedData = parseProjectData(projectData, productsData);

        return res.status(200).json(parsedData);

    } catch (error) {
        console.error('Erreur:', error);
        return res.status(500).json({ 
            error: 'Erreur lors de la récupération des données IKEA',
            details: error.message 
        });
    }
}

// Extraire les IDs produits du projet
function extractProductIds(projectData) {
    const ids = new Set();

    if (projectData.zones) {
        projectData.zones.forEach(zone => {
            if (zone.furnitures) {
                zone.furnitures.forEach(furniture => {
                    if (furniture.productID) {
                        ids.add(furniture.productID);
                    }
                });
            }
        });
    }

    return Array.from(ids);
}

// Parser les données du projet
function parseProjectData(projectData, productsData) {
    const result = {
        name: projectData.name || 'Projet IKEA',
        uuid: projectData.uuid || '',
        createdAt: projectData.createdAt,
        updatedAt: projectData.updatedAt,
        cabinetCount: 0,
        detectedStyle: null,
        cabinets: [],
        facades: [],
        totalFacadeM2: 0
    };

    if (!projectData.zones) {
        return result;
    }

    // Parcourir les zones et meubles
    projectData.zones.forEach(zone => {
        if (!zone.furnitures) return;

        zone.furnitures.forEach(furniture => {
            const productId = furniture.productID;
            if (!productId) return;

            result.cabinetCount++;

            // Récupérer les infos produit
            const productInfo = productsData[productId] || {};
            const definition = productInfo.definition || {};
            const params = productInfo.parameters?.definition || {};

            // Extraire les dimensions
            const width = furniture.parameters?.width || params.width?.defaultValue || params.width?.values?.[0] || 600;
            const height = furniture.parameters?.height || params.height?.defaultValue || params.height?.values?.[0] || 800;
            const depth = furniture.parameters?.depth || params.depth?.defaultValue || params.depth?.values?.[0] || 600;

            // Détecter le style de façade
            const frontParam = furniture.parameters?.front || params.front?.defaultValue;
            if (frontParam && !result.detectedStyle) {
                result.detectedStyle = detectStyleFromFront(frontParam);
            }

            const cabinet = {
                id: productId,
                name: definition.name || productId,
                description: definition.shortDescription || '',
                width,
                height,
                depth,
                type: classifyCabinet(definition.shortDescription || '', height)
            };

            result.cabinets.push(cabinet);

            // Générer les façades pour ce meuble
            const facades = generateFacades(cabinet);
            result.facades.push(...facades);
        });
    });

    // Calculer la surface totale
    result.totalFacadeM2 = result.facades.reduce((sum, f) => sum + f.m2, 0);

    // Style par défaut si non détecté
    if (!result.detectedStyle) {
        result.detectedStyle = 'METOD Standard';
    }

    return result;
}

// Détecter le style depuis le paramètre front
function detectStyleFromFront(frontId) {
    const styles = {
        'tistorp': 'TISTORP Noyer',
        'bodbyn': 'BODBYN',
        'voxtorp': 'VOXTORP',
        'askersund': 'ASKERSUND',
        'havstorp': 'HAVSTORP',
        'lerhyttan': 'LERHYTTAN',
        'axstad': 'AXSTAD',
        'ringhult': 'RINGHULT',
        'veddinge': 'VEDDINGE',
        'forbattra': 'FÖRBÄTTRA'
    };

    const frontLower = frontId.toLowerCase();
    for (const [key, name] of Object.entries(styles)) {
        if (frontLower.includes(key)) {
            return name;
        }
    }

    return 'METOD Standard';
}

// Classifier le type de meuble
function classifyCabinet(description, height) {
    const desc = description.toLowerCase();

    if (desc.includes('colonne') || height > 1500) return 'colonne';
    if (desc.includes('mural') || desc.includes('wall')) return 'mural';
    if (desc.includes('tiroir') || desc.includes('drawer')) return 'tiroir';
    if (desc.includes('évier') || desc.includes('sink')) return 'evier';
    if (desc.includes('four') || desc.includes('oven')) return 'four';
    if (desc.includes('lave') || desc.includes('vaisselle')) return 'lave-vaisselle';
    if (desc.includes('plaque') || desc.includes('cuisson')) return 'plaque';
    if (desc.includes('coulissant')) return 'coulissant';
    if (desc.includes('fileur')) return 'fileur';

    return 'bas';
}

// Générer les façades pour un meuble
function generateFacades(cabinet) {
    const facades = [];
    const w = cabinet.width - 3; // Jeu de 3mm
    const h = cabinet.height;

    switch (cabinet.type) {
        case 'colonne':
            if (cabinet.description.toLowerCase().includes('four')) {
                facades.push({ desc: 'Porte haute colonne four', w, h: 1400, qty: 1 });
                facades.push({ desc: 'Face tiroir colonne four', w, h: 200, qty: 2 });
            } else if (cabinet.description.toLowerCase().includes('réfrig') || cabinet.description.toLowerCase().includes('frigo')) {
                facades.push({ desc: 'Porte colonne frigo haut', w, h: 1200, qty: 1 });
                facades.push({ desc: 'Porte colonne frigo bas', w, h: 950, qty: 1 });
            } else {
                facades.push({ desc: `Porte colonne (${cabinet.width}mm)`, w, h: h - 5, qty: 1 });
            }
            break;

        case 'mural':
            facades.push({ desc: `Porte murale (${cabinet.width}×${cabinet.height})`, w, h: h - 3, qty: 1 });
            break;

        case 'tiroir':
            facades.push({ desc: `Face tiroir (${cabinet.width}mm)`, w, h: 200, qty: 3 });
            break;

        case 'evier':
            facades.push({ desc: 'Porte sous évier', w: Math.floor(w / 2) - 2, h: 700, qty: 2 });
            break;

        case 'lave-vaisselle':
            facades.push({ desc: 'Bandeau lave-vaisselle', w, h: 140, qty: 1 });
            break;

        case 'plaque':
            facades.push({ desc: `Face tiroir plaque (${cabinet.width}mm)`, w, h: 200, qty: 3 });
            break;

        case 'coulissant':
            facades.push({ desc: `Porte coulissant (${cabinet.width}mm)`, w, h: 700, qty: 1 });
            break;

        case 'fileur':
            facades.push({ desc: 'Fileur/panneau latéral', w, h: h - 5, qty: 1 });
            break;

        default:
            facades.push({ desc: `Porte bas (${cabinet.width}mm)`, w, h: 700, qty: 1 });
    }

    // Calculer les m² pour chaque façade
    facades.forEach(f => {
        f.m2 = (f.w * f.h / 1000000) * f.qty;
    });

    return facades;
}
