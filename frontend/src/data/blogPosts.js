// Articles du blog Procura.
// Le contenu (`body`) est un tableau de blocs simples rendus par BlogPost.jsx :
//   { type: 'p', text }           -> paragraphe
//   { type: 'h2', text }          -> sous-titre
//   { type: 'list', items: [] }   -> liste à puces
//   { type: 'quote', text }       -> citation / mise en avant
//   { type: 'image', src, alt, caption } -> capture d'écran
//   { type: 'cta', text, href }   -> bouton d'appel à l'action
//
// `audience` = profil cible (sert au filtre de la page Blog).

export const AUDIENCES = [
  { key: 'all', label: 'Tous' },
  { key: 'freelance', label: 'Freelances & indépendants' },
  { key: 'artisan', label: 'Artisans & commerçants' },
  { key: 'service', label: 'Prestataires de services' },
  { key: 'tpe', label: 'TPE / petites entreprises' },
];

export const BLOG_POSTS = [
  // ───────────────────────────────────────── 1
  {
    slug: 'combien-tu-as-gagne-ce-mois',
    title: 'Combien tu as gagné ce mois-ci ? Si tu réponds « à peu près », lis ça.',
    excerpt:
      "Tu gères ton activité mais tu ne suis pas vraiment tes comptes ? Voici pourquoi le « à peu près » te coûte cher — et comment reprendre le contrôle, sans devenir comptable.",
    cover: '/blog/dashboard.png',
    category: 'Gestion',
    audience: 'freelance',
    readingTime: '5 min',
    date: '2026-06-16',
    body: [
      { type: 'h2', text: '« Ouais, ça va, je m\'en sors »' },
      { type: 'p', text: "C'est la réponse que tu donnes quand on te demande comment va le business. Et c'est vrai : tu t'en sors. Tu factures, tu encaisses, tu bosses dur." },
      { type: 'p', text: "Mais si je te demande, là, tout de suite : combien tu as réellement gagné le mois dernier ? Pas « à peu près ». Pas « de tête ». Le chiffre exact." },
      { type: 'quote', text: "Si tu hésites, tu n'es pas seul. Et ce n'est pas grave. Mais c'est exactement là qu'est le problème." },
      { type: 'h2', text: 'Le piège du « de tête »' },
      { type: 'p', text: "Au lancement, on fait au plus simple. Une facture sur Word. Un devis vite fait. Les paiements, on les suit dans sa tête. Tant que ça roule, ça marche. Sauf que « ça marche » cache trois trous :" },
      { type: 'list', items: [
        "Tu ne sais pas qui te doit de l'argent. Chaque facture jamais relancée, c'est du cash qui dort.",
        "Tu ne vois pas venir les coups durs. Un mois creux, une grosse dépense — sans suivi, tu le découvres trop tard.",
        "Ta compta devient une montagne. En fin d'année, tu reconstitues ce que tu aurais dû noter au fil de l'eau.",
      ]},
      { type: 'p', text: "Le « de tête » ne te fait pas gagner du temps. Il te le vole, juste plus tard." },
      { type: 'h2', text: "Ce n'est pas un problème de discipline" },
      { type: 'p', text: "Si tu ne suis pas tes comptes, ce n'est pas parce que tu es « mauvais en gestion ». C'est parce que les outils sont nuls pour ça. Excel n'est pas fait pour suivre une activité. Word, encore moins. Et les gros logiciels de compta sont pensés pour des comptables, pas pour toi." },
      { type: 'p', text: "Tu n'as pas besoin d'apprendre la comptabilité. Tu as besoin d'un truc qui le fait à ta place." },
      { type: 'h2', text: 'À quoi ça ressemble, le contrôle' },
      { type: 'p', text: "Imagine ouvrir une seule appli et voir, en un coup d'œil : ton chiffre d'affaires du mois (exact), qui t'a payé et qui ne t'a pas encore payé, et ta trésorerie prévue pour les 90 prochains jours." },
      { type: 'image', src: '/blog/dashboard.png', alt: 'Tableau de bord Procura', caption: 'Le tableau de bord Procura : revenu, profit, factures et top clients en un coup d\'œil.' },
      { type: 'p', text: "Et pour créer une facture, tu écris simplement : « Fais une facture pour Martin SARL ». C'est fait — client retrouvé, TVA calculée, facture générée. Tes écritures comptables se créent toutes seules." },
      { type: 'h2', text: 'Reprendre le contrôle, sans devenir comptable' },
      { type: 'p', text: "Le but n'est pas que tu deviennes un pro de la gestion. C'est que tu n'aies plus à y penser — et que, pour la première fois, tu saches vraiment où tu en es." },
      { type: 'cta', text: 'Essayer Procura gratuitement (30 jours, sans carte)', href: '/register' },
    ],
  },

  // ───────────────────────────────────────── 2
  {
    slug: 'facture-pro-modele-minimaliste',
    title: 'Une facture qui fait pro change tout (et ça se voit en 3 secondes)',
    excerpt:
      "Une facture bâclée, c'est un client qui doute. Une facture propre, c'est une entreprise qu'on prend au sérieux. Regarde la différence — et comment l'avoir sans effort.",
    cover: '/blog/facture-minimaliste.png',
    category: 'Image de marque',
    audience: 'freelance',
    readingTime: '4 min',
    date: '2026-06-15',
    body: [
      { type: 'p', text: "Ton client reçoit ta facture par mail. En 3 secondes, il se fait une opinion de toi. Une facture Word approximative, des chiffres qui ne tombent pas juste, pas de logo… et le doute s'installe : « est-ce que je traite avec quelqu'un de sérieux ? »" },
      { type: 'p', text: "À l'inverse, une facture nette et soignée envoie un message clair : tu maîtrises, tu es pro, on peut te faire confiance. Et ça, ça vaut de l'or." },
      { type: 'h2', text: 'Le modèle minimaliste : l\'élégance qui rassure' },
      { type: 'p', text: "Voici une vraie facture générée en un clic dans Procura, modèle « Minimaliste ». Sobre, lisible, avec ton total bien visible et même un QR code de vérification. Le genre de document qu'on est fier d'envoyer." },
      { type: 'image', src: '/blog/facture-minimaliste.png', alt: 'Facture modèle minimaliste Procura', caption: 'Modèle « Minimaliste » : épuré, premium, prêt à imprimer ou à envoyer.' },
      { type: 'h2', text: 'Pas qu\'un seul style' },
      { type: 'p', text: "Selon ton activité, tu choisis le style qui te ressemble. Le modèle « Moderne », par exemple, met ta marque et ton total en avant avec une touche plus affirmée." },
      { type: 'image', src: '/blog/facture-moderne.png', alt: 'Facture modèle moderne Procura', caption: 'Modèle « Moderne » : plus affirmé, idéal pour marquer les esprits.' },
      { type: 'h2', text: 'Et tu ne fais (presque) rien' },
      { type: 'p', text: "Tu n'as pas à bricoler une mise en page. Tu crées ta facture — ou tu la demandes à l'assistant : « fais une facture pour Martin SARL » — tu choisis le modèle, et tu télécharges, imprimes ou envoies par mail. Trois clics." },
      { type: 'list', items: [
        "Aperçu instantané avant d'envoyer.",
        "Téléchargement PDF prêt à imprimer.",
        "Envoi par email directement depuis l'app.",
        "QR code de vérification pour l'authenticité.",
      ]},
      { type: 'quote', text: "Une belle facture ne coûte rien de plus. Mais elle te fait gagner en crédibilité à chaque envoi." },
      { type: 'cta', text: 'Créer ma première facture pro', href: '/register' },
    ],
  },

  // ───────────────────────────────────────── 3
  {
    slug: 'creer-une-facture-en-parlant-a-une-ia',
    title: "J'ai créé ma facture en parlant à une IA. Voici ce qui s'est passé.",
    excerpt:
      "Pas un chatbot qui répond à côté. Une IA qui agit vraiment sur tes données : elle retrouve le client, calcule la TVA et crée la facture. Démo.",
    cover: '/blog/ia-en-action.png',
    category: 'Intelligence artificielle',
    audience: 'service',
    readingTime: '4 min',
    date: '2026-06-14',
    body: [
      { type: 'p', text: "On t'a sûrement déjà vendu de « l'IA » qui se résume à un chatbot qui brasse du vent. L'assistant de Procura, lui, fait le travail. Pour de vrai." },
      { type: 'h2', text: 'Tu parles, il exécute' },
      { type: 'p', text: "J'ai juste écrit : « Fais une facture pour Martin SARL : 20 ramettes à 45€ ». Et là, sous mes yeux, étape par étape : il retrouve le client, vérifie le produit, calcule la TVA, et génère la facture. Quelques secondes." },
      { type: 'image', src: '/blog/assistant-ia.png', alt: 'Assistant IA Procura', caption: 'L\'assistant Procura et ses actions rapides : créer une facture, vérifier un prix, relancer un client…' },
      { type: 'h2', text: 'Pourquoi ce n\'est pas un gadget' },
      { type: 'p', text: "La différence avec un simple chatbot ? L'assistant ne devine jamais une réponse. Il va chercher tes vraies données, puis il agit dessus. Demande-lui une analyse de ton activité, et il te sort un vrai diagnostic :" },
      { type: 'image', src: '/blog/ia-en-action.png', alt: 'Analyse business par l\'IA Procura', caption: 'Une vraie analyse : clients à risque, dépendance, alertes de stock et recommandations concrètes.' },
      { type: 'p', text: "Dépendance à un seul client, stock surévalué par rapport au chiffre d'affaires, absence de diversification… des constats que tu n'aurais pas vus seul, avec des actions concrètes à la clé." },
      { type: 'h2', text: 'Et il va plus loin' },
      { type: 'list', items: [
        "Il anticipe ta trésorerie sur 30, 60 ou 90 jours.",
        "Il compare tes prix au marché (historique + recherche web).",
        "Il repère les factures en double et les anomalies.",
        "Il prépare tes relances d'impayés.",
        "Il lit même tes factures en photo.",
      ]},
      { type: 'cta', text: 'Tester l\'assistant IA gratuitement', href: '/register' },
    ],
  },

  // ───────────────────────────────────────── 4
  {
    slug: 'relancer-les-impayes-sans-passer-pour-le-mechant',
    title: 'Relancer un impayé sans passer pour le méchant (ni y passer ta soirée)',
    excerpt:
      "Tu détestes relancer ? Normal. Mais l'argent qu'on te doit ne rentrera pas tout seul. Voici comment relancer efficacement, au bon moment, avec le bon ton.",
    cover: '/blog/assistant-ia.png',
    category: 'Trésorerie',
    audience: 'service',
    readingTime: '5 min',
    date: '2026-06-13',
    body: [
      { type: 'p', text: "Soyons honnêtes : relancer un client qui ne paie pas, c'est inconfortable. On a peur de froisser, de passer pour le radin de service. Alors on attend. Et l'argent qu'on te doit reste dehors." },
      { type: 'quote', text: "Une facture impayée, ce n'est pas un cadeau que tu fais. C'est ton travail qu'on ne te paie pas." },
      { type: 'h2', text: 'Le secret : le bon ton, au bon moment' },
      { type: 'p', text: "Relancer efficacement, ce n'est pas harceler. C'est une progression logique : un rappel amical quelques jours après l'échéance, une relance plus ferme si ça traîne, puis une mise en demeure en dernier recours. Le ton s'adapte au retard." },
      { type: 'p', text: "Le problème ? Suivre tout ça à la main : qui en est où, depuis combien de jours, qu'est-ce que je lui ai déjà envoyé… C'est ingérable dès que tu as plus de quelques clients." },
      { type: 'h2', text: 'Laisse l\'assistant gérer les relances' },
      { type: 'p', text: "Dans Procura, tu demandes simplement : « relance mes impayés ». L'assistant liste les factures en retard, prépare un message adapté au niveau de retard pour chacune, et garde l'historique. Toi, tu valides." },
      { type: 'image', src: '/blog/assistant-ia.png', alt: 'Relances clients dans Procura', caption: 'L\'assistant prépare tes relances graduées : du rappel amical à la mise en demeure.' },
      { type: 'h2', text: 'Résultat' },
      { type: 'list', items: [
        "Plus aucune facture qui passe à la trappe.",
        "Un ton juste à chaque relance, jamais agressif.",
        "Des minutes au lieu d'une soirée par mois.",
        "Et surtout : du cash qui rentre enfin.",
      ]},
      { type: 'cta', text: 'Récupérer mes impayés avec Procura', href: '/register' },
    ],
  },

  // ───────────────────────────────────────── 5
  {
    slug: 'gerer-son-stock-sans-carnet',
    title: 'Gérer ton stock sans carnet (et ne plus jamais tomber en rupture)',
    excerpt:
      "Un carnet, un tableur, ta mémoire… et un jour, rupture sur le produit qui se vend le mieux. Voici comment garder ton stock sous contrôle, automatiquement.",
    cover: '/blog/produits.png',
    category: 'Stock',
    audience: 'artisan',
    readingTime: '4 min',
    date: '2026-06-12',
    body: [
      { type: 'p', text: "Tu connais ton stock « à peu près ». Et puis un jour, un client veut LE produit qui marche… et il n'y en a plus. Vente perdue. Ou pire : tu commandes trop, et ton argent dort dans des cartons qui ne partent pas." },
      { type: 'h2', text: 'Le tableur ne suit pas le rythme' },
      { type: 'p', text: "Le problème d'un carnet ou d'un Excel, c'est qu'il faut le mettre à jour à la main, à chaque vente, à chaque réception. Une fois, deux fois… puis on lâche. Et l'écart avec la réalité grandit." },
      { type: 'h2', text: 'Un stock qui se surveille tout seul' },
      { type: 'p', text: "Dans Procura, ton catalogue est vivant. Chaque vente et chaque réception met le stock à jour. Et tu vois d'un coup d'œil ce qui est en stock, ce qui est bas, ce qui est en rupture — avec des alertes avant que ce soit trop tard." },
      { type: 'image', src: '/blog/produits.png', alt: 'Gestion du stock dans Procura', caption: 'Stock disponible, stock bas, rupture : tout est visible, avec alertes intégrées.' },
      { type: 'h2', text: 'Et l\'IA t\'aide même à anticiper' },
      { type: 'p', text: "Tu peux demander à l'assistant ce qu'il faut réapprovisionner, ou repérer les produits qui dorment. Tu commandes au bon moment, ni trop, ni trop tard — et ton argent travaille au lieu de dormir." },
      { type: 'quote', text: "Une rupture, c'est une vente perdue. Un surstock, c'est de l'argent gelé. Le bon stock, c'est entre les deux — et ça se pilote." },
      { type: 'cta', text: 'Maîtriser mon stock avec Procura', href: '/register' },
    ],
  },

  // ───────────────────────────────────────── 6
  {
    slug: 'la-compta-qui-se-fait-toute-seule',
    title: 'La compta qui se fait toute seule (oui, même si tu détestes ça)',
    excerpt:
      "Les écritures comptables, le plan comptable, les journaux… rien que les mots donnent envie de fuir. Et si tout ça se faisait automatiquement, pendant que tu bosses ?",
    cover: '/blog/dashboard.png',
    category: 'Comptabilité',
    audience: 'tpe',
    readingTime: '5 min',
    date: '2026-06-11',
    body: [
      { type: 'p', text: "Pour la plupart des entrepreneurs, la comptabilité, c'est la corvée ultime. On repousse, on entasse les justificatifs dans une boîte, et on découvre l'ampleur des dégâts une fois par an, en panique, chez l'expert-comptable." },
      { type: 'h2', text: 'Le vrai problème : la saisie' },
      { type: 'p', text: "Ce qui prend du temps en compta, ce n'est pas de comprendre — c'est de saisir. Chaque facture, chaque encaissement, chaque dépense doit devenir une écriture, au bon compte, équilibrée. Fait à la main, c'est long et source d'erreurs." },
      { type: 'h2', text: 'Et si ça se faisait tout seul ?' },
      { type: 'p', text: "Dans Procura, c'est le cas. Quand tu crées une facture ou enregistres un paiement, l'écriture comptable correspondante se génère automatiquement, au bon compte du plan comptable. Tu ne touches à rien." },
      { type: 'image', src: '/blog/dashboard.png', alt: 'Vue d\'ensemble de l\'activité dans Procura', caption: 'Ton activité reste à jour en continu — la compta suit, sans saisie manuelle.' },
      { type: 'h2', text: 'Ce que ça change pour toi' },
      { type: 'list', items: [
        "Plus de saisie comptable à faire le soir ou le week-end.",
        "Des comptes toujours à jour, pas une fois par an.",
        "Moins d'erreurs, donc moins de stress au moment du bilan.",
        "Un échange beaucoup plus simple avec ton comptable.",
      ]},
      { type: 'quote', text: "Tu n'as pas besoin d'aimer la compta. Tu as juste besoin qu'elle soit faite. Correctement. Sans toi." },
      { type: 'cta', text: 'Laisser Procura tenir ma compta', href: '/register' },
    ],
  },

  // ───────────────────────────────────────── 7
  {
    slug: 'une-seule-app-pour-tout-gerer',
    title: 'De 10 outils éparpillés à une seule app : remets de l\'ordre dans ton activité',
    excerpt:
      "Clients, devis, factures, stocks, trésorerie, compta… Arrête de jongler entre dix outils qui ne se parlent pas. Voici à quoi ressemble une gestion enfin centralisée.",
    cover: '/blog/factures.png',
    category: 'Productivité',
    audience: 'tpe',
    readingTime: '4 min',
    date: '2026-06-10',
    body: [
      { type: 'p', text: "Un tableur pour les clients. Un Word pour les devis. Des PDF pour les factures. Un carnet pour le stock. La compta chez l'expert. Et des relances… qu'on oublie. Gérer une activité aujourd'hui, c'est jongler — et perdre un temps fou." },
      { type: 'h2', text: 'Tout au même endroit' },
      { type: 'p', text: "Procura réunit ce que tu éclatais entre dix outils : clients et fournisseurs, devis et factures, bons de commande, stocks, trésorerie, et même la comptabilité." },
      { type: 'image', src: '/blog/factures.png', alt: 'Gestion des factures Procura', caption: 'Tes factures, leur statut (payée, impayée, en retard) et tes encaissements, d\'un coup d\'œil.' },
      { type: 'h2', text: 'Tes produits et ton stock, sous contrôle' },
      { type: 'p', text: "Fini le carnet. Tu vois ton catalogue, ce qui est en stock, ce qui est bas, ce qui est en rupture — avec des alertes pour ne plus jamais te faire surprendre." },
      { type: 'image', src: '/blog/produits.png', alt: 'Gestion des produits et stocks Procura', caption: 'Produits, services et stock : alertes de rupture et de stock bas intégrées.' },
      { type: 'h2', text: 'Et la compta se fait toute seule' },
      { type: 'p', text: "Chaque facture, chaque encaissement génère automatiquement les écritures comptables. Tu ne touches à rien, et tout est à jour. En fin d'année, plus de montagne à reconstituer." },
      { type: 'quote', text: "L'objectif n'est pas que tu deviennes comptable. C'est que tu n'aies plus à y penser." },
      { type: 'cta', text: 'Centraliser ma gestion avec Procura', href: '/register' },
    ],
  },

  // ───────────────────────────────────────── 8
  {
    slug: 'devis-qui-se-transforme-en-facture',
    title: 'Du devis à la facture en un clic : arrête de tout retaper',
    excerpt:
      "Tu fais un devis, le client accepte… et tu retapes tout pour faire la facture. Quelle perte de temps. Voici comment passer de l'un à l'autre sans recommencer.",
    cover: '/blog/facture-moderne.png',
    category: 'Facturation',
    audience: 'service',
    readingTime: '3 min',
    date: '2026-06-09',
    body: [
      { type: 'p', text: "Le scénario classique : tu envoies un devis bien ficelé. Le client dit oui. Et là… tu rouvres ton Word, tu recrées une facture, tu recopies les lignes, les prix, les quantités. En espérant ne pas te tromper." },
      { type: 'h2', text: 'Le devis et la facture, c\'est (presque) la même chose' },
      { type: 'p', text: "Un devis accepté, c'est une facture qui attend. Alors pourquoi tout retaper ? Dans Procura, quand le client accepte, tu convertis le devis en facture en un clic. Les lignes, les montants, le client : tout est repris automatiquement." },
      { type: 'image', src: '/blog/facture-moderne.png', alt: 'Facture générée depuis un devis dans Procura', caption: 'Le devis devient une facture propre, sans ressaisie — prête à envoyer.' },
      { type: 'h2', text: 'Tu peux même le dire à l\'assistant' },
      { type: 'p', text: "« Le client a accepté, convertis le devis » — et c'est fait. L'assistant transforme le dernier devis en facture brouillon, que tu n'as plus qu'à valider et envoyer." },
      { type: 'list', items: [
        "Zéro ressaisie, zéro erreur de recopie.",
        "Un cycle commercial fluide : devis → accepté → facture.",
        "Du temps gagné sur chaque vente.",
      ]},
      { type: 'cta', text: 'Fluidifier mes devis et factures', href: '/register' },
    ],
  },
];

export const getPostBySlug = (slug) => BLOG_POSTS.find((p) => p.slug === slug);
