# 🏛️ Idle Empire

**Version 0.5.0** - Modern idle/incremental empire builder with AI governors

Un jeu de gestion d'empire inspiré des classiques navigateurs comme Travian et OGame, mais modernisé avec une approche "idle" et des IA qui gèrent votre empire pour vous.

## 🎯 Vision du Projet

**15 minutes par jour, maximum de fun.** 

Construisez votre empire à travers des **IA Gouverneurs** intelligents pendant que vous vous concentrez sur les décisions stratégiques importantes. Votre empire continue de grandir même quand vous êtes offline.

## 🛠️ Stack Technique

- **Backend**: Node.js + TypeScript + Prisma ORM
- **Base de données**: PostgreSQL 
- **API**: tRPC (type-safe end-to-end)
- **Frontend**: Next.js 14 + React + TailwindCSS
- **Auth**: JWT + bcrypt
- **Déploiement**: Railway (auto-deploy depuis GitHub)
- **Hooks**: useClickOutside pour UX moderne

## 🚀 Installation & Développement

```bash
# Cloner le projet
git clone https://github.com/Aziraphal/idle-empire.git
cd idle-empire

# Installer les dépendances
npm install

# Setup de la base de données
npx prisma migrate dev
npx prisma db seed

# Lancer le serveur de développement
npm run dev
```

Le serveur sera disponible sur `http://localhost:3001`

### Scripts Utiles

```bash
npm run build          # Build de production
npm run type-check     # Vérification TypeScript
npm run db:studio      # Interface Prisma Studio
npm run db:reset       # Reset complet de la DB
```

## 🎮 Fonctionnalités Actuelles (Phase 1-5 Terminées)

### ✅ **Phase 1 - Fondations (TERMINÉ)**
- 🗄️ Architecture complète (Next.js 14 + tRPC + Prisma)
- 🔐 Système d'authentification JWT complet
- 🏛️ Modèles de base : Utilisateurs, Empires, Provinces
- 📊 Dashboard principal avec stats temps réel
- 🎨 Interface moderne avec TailwindCSS

### ✅ **Phase 2 - Système de Ressources (TERMINÉ)**
- 💰 8 types de ressources : OR, NOURRITURE, PIERRE, FER, POPULATION, INFLUENCE, MANA, ÉNERGIE
- 🏭 Système de production idle avec bonus technologiques
- 📈 Calculs temps réel depuis la dernière connexion
- 🔄 Auto-refresh toutes les 30 secondes
- 📊 Tableaux de bord détaillés par province

### ✅ **Phase 3 - Bâtiments & Construction (TERMINÉ)**
- 🏗️ 6 types de bâtiments : Ferme, Mine, Carrière, Caserne, Marché, Académie
- ⏱️ Système de construction avec temps d'attente réalistes
- 📊 Production différente par type et niveau de bâtiment
- 🎯 Interface de construction intuitive avec prévisualisation
- ⚡ Files de construction multiples par province

### ✅ **Phase 4 - Gouverneurs IA (TERMINÉ)**
- 🧠 4 personnalités IA distinctes : Conservateur, Agressif, Marchand, Explorateur
- 📊 Système de loyauté et d'expérience pour chaque gouverneur
- 🎯 Bonus de production selon la personnalité
- 👨‍💼 Interface de gestion avancée avec stats détaillées
- 🔄 Système d'assignation et de révocation

### ✅ **Phase 5 - Compétences Actives (TERMINÉ)**
- ⚡ **15 compétences** réparties en **5 catégories** :
  - 💰 **ÉCONOMIE** : Bénédiction de Récolte, Boom Économique, Efficacité Suprême
  - ⚔️ **MILITAIRE** : Force Impériale, Mobilisation Totale, Conquête Rapide  
  - ✨ **MAGIE** : Restauration Mana, Explosion Magique, Ascension Magique
  - 🛠️ **UTILITAIRE** : Accélération Temporelle, Vision de l'Empire, Maîtrise Absolue
  - 🏆 **ULTIMATE** : Ascension de l'Empire (500% de boost !), Vision de l'Avenir, Dominion Éternel
- 🎯 **Déverrouillage progressif** basé sur le niveau de l'empire (calculé depuis les bâtiments)
- 💰 **Coûts variables** : Énergie, Mana, et ressources classiques
- ⏱️ **Cooldowns** avec interface temps réel
- 🔄 **Système XP** pour améliorer les compétences
- 🖱️ **Interface moderne** avec fermeture par clic extérieur

### ✅ **Phase 0 - Systèmes Supports (TERMINÉ)**
- 🔬 **Technologies** : 12+ recherches avec bonus permanents
- 🗺️ **Exploration** : Découverte et colonisation de nouveaux territoires  
- 🎯 **Quêtes** : Système de missions avec progression automatique
- 🎊 **Événements** : Événements aléatoires avec choix et conséquences
- 🏆 **Récompenses** : Système de récompenses journalières/hebdomadaires
- 💾 **Sauvegarde** : Auto-save toutes les 30s + sauvegarde manuelle
- 🔧 **Debug** : Panel de debug pour les développeurs

## 📊 Métriques Actuelles

- **Code Base** : ~15,000+ lignes de TypeScript
- **Composants React** : 15 panels/interfaces principales
- **API Endpoints** : 80+ endpoints tRPC type-safe
- **Tables DB** : 25+ tables Prisma avec relations complexes
- **Systèmes de jeu** : 8 systèmes principaux intégrés

## 🎯 Plan de Développement Restant

### 🔄 **Phase 6 - Combat & PvP (PROCHAINE)**
- ⚔️ Système de combat avec unités et formations
- 🏰 Attaques entre joueurs et défense automatique
- 🛡️ Système de protection pour nouveaux joueurs
- 📊 Calculs de combat basés sur les bâtiments et technologies
- 🏆 Récompenses et pénalités de combat

### 🤝 **Phase 7 - Alliances & Social**
- 👥 Création et gestion d'alliances
- 💬 Chat alliance et système de messages
- 🤝 Aide mutuelle entre membres
- 🏆 Guerres d'alliances et territoires partagés
- 📊 Classements par alliance

### 🌟 **Phase 8 - Saisons & Méta-Game**
- 🏆 Système de saisons avec reset périodiques
- 🎖️ Récompenses permanentes et titres
- 📊 Classements globaux et par saison
- 🎯 Objectifs saisonniers et événements spéciaux
- 💎 Monnaie premium (cosmétique uniquement)

### 🎨 **Phase 9 - Polish & Optimisation**
- 📱 Interface responsive mobile
- 🎵 Système audio et musique d'ambiance
- ✨ Animations et transitions fluides
- 🚀 Optimisations performances
- 🧪 Tests automatisés complets

### 🚀 **Phase 10 - Lancement**
- 🌐 Déploiement production haute disponibilité
- 📈 Monitoring et analytics
- 🐛 Bug fixes et hotfixes
- 👥 Community management
- 📊 Métriques et KPIs business

## 🏗️ Architecture Technique

### Base de Données (Prisma + PostgreSQL)
```
Users -> Cities -> Provinces -> Buildings
                -> ResourceStocks
                -> Constructions
                -> Governors
      -> PlayerSkills -> Skills
      -> Quests -> QuestProgress  
      -> Technologies -> ResearchedTech
      -> Alliances -> AllianceMembers
      -> Seasons -> PlayerSeasonStats
```

### API Layer (tRPC)
- **Type-safe** de bout en bout
- **Auto-completion** complète
- **Validation** Zod intégrée
- **Error handling** centralisé

### Frontend (Next.js 14)
- **App Router** avec layouts
- **Server-side rendering**
- **React Query** pour le cache
- **TailwindCSS** pour le styling
- **Custom hooks** pour la logique métier

## 🎮 Comment Jouer

1. **Créez votre compte** et votre premier empire
2. **Construisez des bâtiments** pour produire des ressources
3. **Assignez des gouverneurs IA** pour automatiser la gestion
4. **Recherchez des technologies** pour débloquer de nouveaux bonus
5. **Explorez de nouveaux territoires** pour étendre votre empire
6. **Débloquez et utilisez des compétences** pour des bonus temporaires puissants
7. **Complétez des quêtes** pour gagner des récompenses
8. **Votre empire grandit même offline** grâce au système idle !

## 🔧 Configuration Environnement

### Variables d'environnement requises :
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Pour Railway :
```env
RAILWAY_PRIVATE_DOMAIN=true
PORT=3001
```

## 🤝 Contribution

Le projet est actuellement en développement actif. Les phases 1-5 sont terminées et fonctionnelles.

### Structure du Code
- `/src/components/` - Composants React UI
- `/src/hooks/` - Hooks React réutilisables  
- `/src/lib/` - Logique métier et utilitaires
- `/src/server/api/routers/` - Endpoints tRPC
- `/prisma/` - Schema et migrations DB

### Conventions
- **TypeScript strict** partout
- **Composants fonctionnels** React
- **Hooks customs** pour la logique
- **tRPC** pour toutes les API calls
- **Prisma** pour toutes les DB queries

## 📈 Progression Actuelle

**Phase 1-5 ✅ TERMINÉES** (Décembre 2024)
- Système complet et fonctionnel
- Interface moderne et intuitive
- Performance optimisée
- Code propre et maintenable

**Phase 6-10** 📅 **PLANIFIÉES** (2025)
- Combat et PvP (Q1 2025)
- Alliances (Q2 2025)
- Polish et lancement (Q3-Q4 2025)

## 🌟 Points Forts Techniques

- **100% Type-Safe** avec TypeScript + tRPC
- **Performance** : calculs idle optimisés, cache intelligent
- **UX Moderne** : interfaces intuitives, feedback temps réel
- **Architecture Scalable** : préparé pour des milliers d'utilisateurs
- **Code Quality** : structure claire, patterns cohérents
- **Auto-déploiement** : CI/CD avec Railway

---

**🎯 Objectif** : Créer le meilleur idle empire builder moderne, alliant nostalgie des classiques et innovations actuelles.

**Made with ❤️ for the love of classic browser MMOs**