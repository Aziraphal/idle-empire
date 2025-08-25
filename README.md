# 🏛️ Idle Empire

Modern idle/incremental empire builder inspired by classic browser MMOs like Travian and OGame.

## 🎯 Core Concept

Build and manage your empire through **AI Governors** while you focus on strategic decisions. 15 minutes of daily gameplay, maximum fun.

## 🛠️ Tech Stack

- **Backend**: Node.js + TypeScript + Prisma + PostgreSQL
- **API**: tRPC (type-safe)
- **Frontend**: Next.js 14 + TailwindCSS
- **Auth**: JWT
- **Cache**: Redis
- **Hosting**: Railway/Render

## 📅 Development Roadmap

### Mois 1 (MVP Core)
- [x] Database schema design
- [ ] Auth system (register/login)  
- [ ] Province management
- [ ] Resource production (idle)
- [ ] AI Governors v1

### Mois 2-6
- Combat system
- Multiplayer features
- Premium monetization
- Polish & launch

## 🚀 Getting Started

```bash
# Clone & install
git clone https://github.com/[username]/idle-empire.git
cd idle-empire
npm install

# Setup database
npx prisma migrate dev
npx prisma db seed

# Run development server
npm run dev
```

## 🎮 Game Features

- **Idle Progression**: Empire grows even offline
- **AI Governors**: Automated province management
- **Strategic Depth**: Focus on big decisions, not micro-management
- **Social Elements**: Alliances and leaderboards
- **Ethical Premium**: Cosmetics only, no pay-to-win

---

**Made with ❤️ for the love of classic browser MMOs**