# 🚀 Commandes VPS - Démarrage Rapide

Guide ultra-rapide pour déployer sur votre VPS Linux.

---

## ⚡ Installation Complète en 5 Minutes

### 1. Connexion au VPS
```bash
ssh root@votre-ip-vps
```

### 2. Installation des dépendances système
```bash
# Copier-coller cette commande complète
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && \
sudo apt update && sudo apt install -y \
    nodejs python3 python3-pip python3-venv \
    postgresql postgresql-contrib git \
    build-essential libpq-dev
```

### 3. Configuration PostgreSQL
```bash
# Créer la base de données
sudo -u postgres psql << EOF
CREATE DATABASE julianna_db;
CREATE USER julianna_user WITH PASSWORD 'VotreMotDePasse123!';
GRANT ALL PRIVILEGES ON DATABASE julianna_db TO julianna_user;
ALTER ROLE julianna_user SET client_encoding TO 'utf8';
ALTER ROLE julianna_user SET timezone TO 'UTC';
\q
