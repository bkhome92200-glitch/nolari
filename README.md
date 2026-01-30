# Nolari Design - Générateur de Devis

Application web pour générer automatiquement des devis de façades Nolari à partir d'un lien IKEA Kitchen Planner.

## 🚀 Déploiement sur Vercel (5 minutes)

### Méthode 1 : Via GitHub (recommandé)

1. **Crée un repo GitHub**
   - Va sur github.com → New repository
   - Nomme-le `nolari-devis`
   - Upload tous les fichiers de ce dossier

2. **Connecte à Vercel**
   - Va sur [vercel.com](https://vercel.com)
   - Clique "Add New Project"
   - Importe ton repo GitHub `nolari-devis`
   - Clique "Deploy"

3. **C'est prêt !**
   - Tu auras une URL comme `nolari-devis.vercel.app`

### Méthode 2 : Via CLI

```bash
# Installe Vercel CLI
npm install -g vercel

# Dans le dossier du projet
cd nolari-vercel

# Déploie
vercel

# Pour la production
vercel --prod
```

## 📁 Structure du projet

```
nolari-vercel/
├── index.html      # Page principale
├── api/
│   └── ikea.js     # API backend (récupère les données IKEA)
├── vercel.json     # Configuration Vercel
├── package.json    # Dépendances
└── README.md       # Ce fichier
```

## 🔧 Comment ça marche

1. L'utilisateur colle un lien IKEA Kitchen Planner
2. Le frontend extrait l'UUID du projet
3. L'API backend (`/api/ikea`) appelle l'API IKEA
4. Les données sont parsées et les façades calculées
5. Le devis est affiché avec les prix Nolari

## ⚙️ Configuration des prix

Les prix sont configurés dans `index.html` :

```javascript
// Modifie les data-price des .style-opt
<div class="style-opt" data-price="240">Laqué Mat</div>
<div class="style-opt" data-price="260">Bois Noble</div>
<div class="style-opt" data-price="290">Premium</div>
```

## 🎨 Personnalisation

- **Couleurs** : Modifie les variables CSS dans `:root`
- **Logo** : Remplace le texte dans `.logo`
- **Prix** : Modifie les `data-price` des options de style

## 📝 Notes

- L'API IKEA n'est pas officielle et peut changer
- Les dimensions des façades sont calculées automatiquement (-3mm de jeu)
- Le calcul des panneaux de finition est une estimation (2.5m²)

## 🆘 Support

Pour toute question : contact@nolari-design.com
