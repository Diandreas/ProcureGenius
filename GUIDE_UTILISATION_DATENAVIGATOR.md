# Guide d'Utilisation du Filtre de Date

## Vue d'ensemble

Le nouveau filtre de date a été ajouté aux pages **Factures** et **Bons de commande** pour vous permettre de filtrer rapidement vos documents par date.

## Accès au filtre de date

### Page des Factures
1. Accédez à **Factures** depuis le menu de navigation
2. Le filtre de date se trouve dans la barre de recherche, juste à côté du champ de recherche

### Page des Bons de Commande
1. Accédez à **Bons de commande** depuis le menu de navigation
2. Le filtre de date se trouve dans la barre de recherche, juste à côté du champ de recherche

## Utilisation du filtre

### 1. Navigation rapide entre les jours

#### Jour précédent (←)
- Cliquez sur le bouton avec la flèche gauche pour afficher les documents du jour précédent
- Chaque clic recule d'un jour

#### Aujourd'hui (icône calendrier)
- Cliquez sur l'icône calendrier au centre pour revenir à la date du jour
- Utile pour réinitialiser rapidement le filtre à aujourd'hui

#### Jour suivant (→)
- Cliquez sur le bouton avec la flèche droite pour afficher les documents du jour suivant
- Chaque clic avance d'un jour

### 2. Sélection d'une date spécifique

1. Cliquez sur le champ de date (affiche la date sélectionnée)
2. Un calendrier s'ouvre automatiquement
3. Choisissez la date souhaitée
4. Le filtre est appliqué immédiatement

### 3. Désactivation du filtre

Pour afficher à nouveau tous les documents sans filtre de date:

**Option 1**: Cliquez sur la croix (×) du chip affiché sous la barre de recherche
```
Filtre par date: 27/12/2025 [×]
```

**Option 2**: Videz manuellement le champ de date

## Comportement du filtre

### Pour les Factures
Le filtre recherche dans:
- **Date d'émission** (issue_date): Date à laquelle la facture a été créée
- **Date d'échéance** (due_date): Date limite de paiement

Une facture s'affiche si **l'une OU l'autre** de ces dates correspond à la date filtrée.

**Exemple**: Si vous filtrez pour le 15/01/2025
- Facture A (émise le 15/01/2025, échéance le 15/02/2025) → **AFFICHÉE**
- Facture B (émise le 10/01/2025, échéance le 15/01/2025) → **AFFICHÉE**
- Facture C (émise le 10/01/2025, échéance le 15/02/2025) → **MASQUÉE**

### Pour les Bons de Commande
Le filtre recherche dans:
- **Date de commande** (order_date): Date à laquelle le bon de commande a été créé
- **Date de livraison** (delivery_date): Date prévue de livraison

Un bon de commande s'affiche si **l'une OU l'autre** de ces dates correspond à la date filtrée.

**Exemple**: Si vous filtrez pour le 20/01/2025
- BC001 (commandé le 20/01/2025, livraison le 25/01/2025) → **AFFICHÉ**
- BC002 (commandé le 15/01/2025, livraison le 20/01/2025) → **AFFICHÉ**
- BC003 (commandé le 15/01/2025, livraison le 25/01/2025) → **MASQUÉ**

## Combinaison avec d'autres filtres

Le filtre de date peut être combiné avec:
- **Recherche textuelle**: Rechercher par numéro, titre, client/fournisseur ET date
- **Filtres rapides**: Les cartes statistiques cliquables (Payées, Impayées, etc.)
- **Filtres avancés**: Le filtre de statut dans le panneau de filtres avancés

**Exemple de combinaison**:
1. Cliquez sur la carte "Payées" → Affiche uniquement les factures payées
2. Utilisez le filtre de date pour le 15/01/2025 → Affiche les factures payées du 15/01/2025
3. Tapez "ABC" dans la recherche → Affiche les factures payées du 15/01/2025 contenant "ABC"

## Conseils d'utilisation

### Cas d'usage courants

1. **Voir les factures du jour**
   - Cliquez sur l'icône "Aujourd'hui" (calendrier)

2. **Vérifier les échéances de la semaine**
   - Utilisez les flèches ← et → pour naviguer jour par jour
   - Vérifiez les factures à échéance chaque jour

3. **Trouver une facture émise à une date précise**
   - Cliquez sur le champ de date
   - Sélectionnez la date dans le calendrier

4. **Consulter les livraisons prévues**
   - Sélectionnez la date de livraison prévue
   - Voir tous les bons de commande concernés

## Support mobile

Le filtre de date est entièrement responsive:
- Sur **mobile**: Le composant s'adapte automatiquement et peut passer à la ligne si nécessaire
- Sur **tablette et desktop**: Affichage optimal sur une seule ligne

## Traduction

Le composant est disponible dans les langues suivantes:
- **Français**: "Jour précédent", "Aujourd'hui", "Jour suivant"
- **Anglais**: "Previous day", "Today", "Next day"

La langue s'adapte automatiquement selon les paramètres de votre compte.

## Questions fréquentes

**Q: Le filtre ne trouve aucun résultat?**
R: Vérifiez que:
- Des documents existent pour cette date
- Aucun autre filtre trop restrictif n'est actif
- La date recherchée est correcte

**Q: Comment voir tous les documents à nouveau?**
R: Cliquez sur la croix du chip de date ou videz le champ de date.

**Q: Les boutons de navigation ne fonctionnent pas?**
R: Vérifiez que le champ de date n'est pas désactivé. Si le problème persiste, actualisez la page.

**Q: Puis-je naviguer avec le clavier?**
R: Oui, utilisez la touche Tab pour naviguer entre les boutons et Entrée pour activer un bouton.

## Support

Pour toute question ou problème avec le filtre de date, contactez le support technique.
