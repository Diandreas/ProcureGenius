# 🪟 Installation de GTK3 sur Windows pour WeasyPrint

## ⚠️ Pourquoi GTK3 ?

WeasyPrint utilise **GTK3** et **Pango** pour le rendu de texte et des polices dans les PDF.
Sans GTK3, vous obtiendrez l'erreur : `cannot load library 'gobject-2.0-0'`

## 📦 Installation (5 minutes)

### Étape 1 : Télécharger GTK3 Runtime

1. Aller sur : **https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases**

2. Télécharger la **dernière version** :
   - Nom du fichier : `gtk3-runtime-x.x.x-x-x86_64.exe`
   - Exemple : `gtk3-runtime-3.24.31-2024-04-12-ts-win64.exe`

### Étape 2 : Installer GTK3

1. **Lancer l'installateur** téléchargé

2. **Suivre les instructions** :
   - Accepter la licence
   - Choisir le répertoire d'installation (par défaut : `C:\Program Files\GTK3-Runtime Win64`)
   - Cliquer sur "Install"

3. **Importante** : Cocher "Add to PATH" si proposé

### Étape 3 : Vérifier l'installation

Ouvrir un **nouveau terminal PowerShell** et taper :

```powershell
py -c "from weasyprint import HTML; print('WeasyPrint fonctionne!')"
```

**Résultat attendu :**
```
WeasyPrint fonctionne!
```

**Si erreur :** Redémarrer le terminal/IDE et réessayer.

## ✅ Test complet

Une fois GTK3 installé, testez la génération de PDF :

```powershell
py test_weasyprint_pdf.py
```

**Résultat attendu :**
- 3 fichiers PDF créés
- Aucune erreur "gobject-2.0-0"

## 🔧 Dépannage

### Problème 1 : "gobject-2.0-0" toujours pas trouvé

**Solution 1 : Vérifier le PATH**

1. Ouvrir "Variables d'environnement système"
2. Vérifier que le PATH contient :
   ```
   C:\Program Files\GTK3-Runtime Win64\bin
   ```
3. Redémarrer le terminal

**Solution 2 : Réinstaller GTK3**

1. Désinstaller GTK3 (Panneau de configuration → Programmes)
2. Réinstaller en cochant "Add to PATH"
3. Redémarrer l'ordinateur

### Problème 2 : DLL manquantes

**Solution :**

Télécharger les DLL manquantes depuis : https://gtk-win.sourceforge.io/

### Problème 3 : Version incompatible

**Solution :**

Installer une version spécifique de GTK3 compatible avec WeasyPrint :
- GTK3 Runtime 3.24.31 ou supérieur

## 🎯 Alternative : Utiliser ReportLab

Si vous ne pouvez pas installer GTK3, le système utilise automatiquement **ReportLab** comme fallback :

**Avantages ReportLab :**
- ✅ Fonctionne sans GTK3
- ✅ QR code déjà intégré
- ✅ 3 templates disponibles
- ✅ Design professionnel

**Les PDF fonctionnent déjà avec ReportLab !**

Voir : [test_reportlab_classic.pdf](test_reportlab_classic.pdf)

## 📋 Résumé

| Option | Avantages | Inconvénients |
|--------|-----------|---------------|
| **WeasyPrint + GTK3** | - Support CSS3 complet<br>- Templates HTML flexibles<br>- Design moderne | - Nécessite GTK3<br>- Installation Windows complexe |
| **ReportLab** | - Pas de dépendances système<br>- Fonctionne immédiatement<br>- QR code intégré | - Moins flexible pour CSS<br>- Code Python plus verbeux |

## 🚀 Recommandation

### Pour développement Windows :
**Utiliser ReportLab** → Fonctionne immédiatement, QR code inclus

### Pour production Linux/Docker :
**Utiliser WeasyPrint** → Installation GTK3 plus simple sur Linux

```bash
# Linux (Ubuntu/Debian)
sudo apt-get install python3-cffi python3-brotli libpango-1.0-0 libpangoft2-1.0-0
pip install WeasyPrint
```

---

**Besoin d'aide ?** Consulter :
- Documentation WeasyPrint : https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#installation
- GTK Windows : https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer
