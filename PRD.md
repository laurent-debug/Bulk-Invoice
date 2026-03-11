# PRD — Bulk-Invoice-Formatting

## 1. Vue d'ensemble

| Champ | Valeur |
|---|---|
| **Nom** | Bulk-Invoice-Formatting |
| **Baseline** | Renommez et classez vos factures en quelques clics |
| **Problème résolu** | Le renommage manuel de dizaines de factures PDF est chronophage, sujet aux erreurs et non standardisé |
| **Utilisateur cible** | Freelances, comptables, PME qui gèrent > 10 factures/mois |
| **Valeur principale** | Gain de temps × 10 : l'utilisateur dépose ses PDF, l'app extrait les métadonnées, renomme automatiquement et exporte un lot prêt à archiver |

---

## 2. Fonctionnalités core (MVP)

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Upload en masse** | Glisser-déposer ou sélectionner plusieurs fichiers PDF simultanément ; afficher la liste avec miniature, nom original et taille |
| F2 | **Extraction automatique** | Extraire via OCR/parsing côté client : date de facture, montant TTC, nom du fournisseur, numéro de facture |
| F3 | **Prévisualisation du renommage** | Afficher en temps réel le nouveau nom généré pour chaque fichier selon le format choisi ; permettre l'édition manuelle par champ |
| F4 | **Modèle de nommage configurable** | Proposer un éditeur de pattern avec tokens glissables (`{date}`, `{fournisseur}`, `{montant}`, `{numero}`) et séparateurs personnalisables |
| F5 | **Téléchargement du lot renommé** | Générer un ZIP contenant tous les PDF renommés et le télécharger localement |
| F6 | **Export Google Drive** | Connecter un compte Google via OAuth 2.0, sélectionner un dossier cible et y envoyer les fichiers renommés |
| F7 | **Historique des lots** | Sauvegarder en localStorage les 20 derniers lots traités (date, nombre de fichiers, pattern utilisé) pour consultation |

---

## 3. Écrans & flux utilisateur

### Écran 1 — Landing / Upload
- **Header** : logo + nom de l'app, bouton « Connexion Drive » (icône Google)
- **Zone centrale** : drop-zone plein écran avec icône upload, texte « Glissez vos factures PDF ici ou cliquez pour parcourir » ; accepte uniquement `.pdf`, max 50 fichiers, max 20 Mo/fichier
- **Transition** : dès qu'au moins 1 fichier est déposé → afficher l'Écran 2 en dessous de la drop-zone (scroll fluide)

### Écran 2 — Configuration & Prévisualisation
- **Barre supérieure** : éditeur de pattern de nommage ; champs-tokens sous forme de badges cliquables ; champ texte affichant le pattern résultant ; séparateur configurable (`_`, `-`, `.`, espace)
- **Tableau principal** : une ligne par fichier ; colonnes : ☑ sélection, miniature 1re page, nom original, date extraite (éditable inline), fournisseur (éditable inline), montant (éditable inline), numéro (éditable inline), nouveau nom (lecture seule, généré live)
- **Pied de tableau** : compteur « X fichiers sélectionnés », boutons « Tout sélectionner / Désélectionner »
- **Barre d'actions sticky en bas** : bouton primaire « Télécharger ZIP », bouton secondaire « Envoyer vers Drive » (grisé si non connecté), bouton tertiaire « Réinitialiser »
- **Transition** : clic sur un bouton d'action → modal de progression avec barre de pourcentage

### Écran 3 — Modal de progression
- **Contenu** : barre de progression segmentée (1 segment = 1 fichier), nom du fichier en cours de traitement, bouton « Annuler »
- **Fin de traitement** : remplacer la barre par un résumé (✓ X fichiers traités, taille totale, dossier Drive si applicable), bouton « Fermer » + bouton « Voir l'historique »

### Écran 4 — Historique
- Accessible via icône horloge dans le header
- Liste des lots passés : date du traitement, nombre de fichiers, pattern utilisé, bouton « Réappliquer ce pattern »
- Bouton « Vider l'historique »

---

## 4. Modèle de données

### `InvoiceFile`
| Champ | Type | Description |
|-------|------|-------------|
| `id` | `string (UUID)` | Identifiant unique |
| `originalName` | `string` | Nom de fichier original |
| `fileSize` | `number` | Taille en octets |
| `fileBlob` | `Blob` | Contenu binaire du PDF |
| `thumbnailDataUrl` | `string` | Data-URL de la miniature de la 1re page |
| `extractedDate` | `Date \| null` | Date extraite du PDF |
| `extractedVendor` | `string \| null` | Nom du fournisseur extrait |
| `extractedAmount` | `number \| null` | Montant TTC extrait |
| `extractedInvoiceNumber` | `string \| null` | Numéro de facture extrait |
| `isSelected` | `boolean` | Sélectionné pour export |
| `newName` | `string` | Nom de fichier généré (lecture seule, calculé) |

### `NamingPattern`
| Champ | Type | Description |
|-------|------|-------------|
| `tokens` | `Array<enum['date','vendor','amount','invoiceNumber']>` | Ordre des tokens |
| `separator` | `enum['_', '-', '.', ' ']` | Séparateur entre tokens |
| `dateFormat` | `enum['YYYY-MM-DD', 'DD-MM-YYYY', 'YYYYMMDD']` | Format de date |

### `BatchRecord`
| Champ | Type | Description |
|-------|------|-------------|
| `id` | `string (UUID)` | Identifiant |
| `processedAt` | `Date` | Horodatage |
| `fileCount` | `number` | Nombre de fichiers traités |
| `patternUsed` | `NamingPattern` | Pattern appliqué |
| `destination` | `enum['zip', 'drive']` | Mode d'export |

---

## 5. Logique métier

```
SI fichier.type ≠ "application/pdf" ALORS rejeter avec message "Format non supporté"
SI fichier.size > 20 Mo ALORS rejeter avec message "Fichier trop volumineux (max 20 Mo)"
SI nombre_fichiers > 50 ALORS rejeter les fichiers excédentaires avec message "Maximum 50 fichiers par lot"

POUR CHAQUE fichier accepté :
  extraire le texte du PDF via pdf.js
  SI texte contient un pattern de date reconnu ALORS remplir extractedDate
  SI texte contient un pattern monétaire (€, EUR) ALORS remplir extractedAmount
  SI texte contient un IBAN ou un en-tête société ALORS remplir extractedVendor
  SI texte contient un pattern "Facture N°" ou "Invoice #" ALORS remplir extractedInvoiceNumber
  SI un champ reste null ALORS afficher un badge ⚠ sur la cellule correspondante

POUR générer newName :
  POUR CHAQUE token dans pattern.tokens :
    SI token = "date" ET extractedDate ≠ null ALORS formater selon pattern.dateFormat
    SI token = "date" ET extractedDate = null ALORS utiliser "SANS-DATE"
    SI token = "vendor" ET extractedVendor ≠ null ALORS nettoyer (supprimer caractères spéciaux, tronquer à 30 chars)
    SI token = "vendor" ET extractedVendor = null ALORS utiliser "INCONNU"
    SI token = "amount" ET extractedAmount ≠ null ALORS formater en "123.45EUR"
    SI token = "amount" ET extractedAmount = null ALORS utiliser "0.00EUR"
    SI token = "invoiceNumber" ALORS utiliser la valeur ou "SANS-NUM"
  joindre les segments avec pattern.separator
  ajouter ".pdf"

SI deux fichiers ont le même newName ALORS ajouter un suffixe incrémental "-1", "-2"

SI action = "zip" ALORS générer un ZIP via JSZip, déclencher le téléchargement
SI action = "drive" ALORS :
  SI utilisateur non connecté ALORS déclencher le flux OAuth Google
  uploader chaque fichier vers le dossier sélectionné via Google Drive API v3
```

---

## 6. Stack & contraintes techniques

| Composant | Choix | Justification |
|-----------|-------|---------------|
| **Framework** | Next.js 14 (App Router) | SSR pour le landing, CSR pour le traitement |
| **UI** | Tailwind CSS 3 + shadcn/ui | Composants accessibles, design-system rapide |
| **PDF parsing** | `pdfjs-dist` (Mozilla pdf.js) | Extraction texte côté client, aucun envoi serveur |
| **Miniatures** | `pdfjs-dist` canvas rendering | Rendu de la 1re page en canvas → data URL |
| **ZIP** | `JSZip` + `file-saver` | Génération ZIP côté client |
| **Google Drive** | `googleapis` via API Route Next.js | OAuth 2.0 server-side, upload via API Route |
| **Persistance** | `localStorage` | Historique des lots uniquement (pas de BDD) |
| **Drag & Drop** | `react-dropzone` | Gestion native du glisser-déposer |
| **État** | `zustand` | Store léger pour l'état des fichiers et du pattern |

**Contraintes** :
- Tout le traitement PDF se fait côté client (confidentialité des données)
- Pas de backend/BDD sauf l'API Route pour le proxy OAuth Drive
- Compatible Chrome, Firefox, Edge dernières versions
- Responsive : desktop-first, utilisable sur tablette (pas de mobile)
- Accessibilité : contraste AA, navigation clavier sur le tableau

---

## 7. Critères d'acceptation

- [ ] L'utilisateur peut déposer 50 PDF de 5 Mo chacun sans erreur ni freeze du navigateur
- [ ] Les champs date, montant, fournisseur et numéro sont extraits correctement sur ≥ 70 % des factures françaises standard
- [ ] Le pattern de nommage est modifiable et le nouveau nom se met à jour en temps réel dans le tableau
- [ ] Chaque champ extrait est éditable manuellement dans le tableau
- [ ] Le téléchargement ZIP contient tous les fichiers sélectionnés avec les noms corrects
- [ ] La connexion Google Drive fonctionne et les fichiers sont uploadés dans le dossier choisi
- [ ] L'historique des 20 derniers lots est persisté et consultable après rechargement de la page
- [ ] Le temps de traitement d'un lot de 20 fichiers est < 30 secondes
- [ ] Aucun fichier PDF ne quitte le navigateur (sauf export Drive explicite)
- [ ] L'interface est fonctionnelle en 1440px et 1024px de large

---

## Prompt de démarrage

```
En utilisant ce PRD comme spécification complète, génère l'intégralité de
l'application Bulk-Invoice-Formatting. Commence par initialiser un projet
Next.js 14 (App Router) avec Tailwind CSS et shadcn/ui. Installe pdfjs-dist,
JSZip, file-saver, react-dropzone et zustand. Implémente chaque écran dans
l'ordre du flux utilisateur : Upload → Configuration/Prévisualisation →
Progression → Historique. Le parsing PDF, la génération de miniatures et
la création du ZIP doivent être entièrement côté client. Crée une API Route
pour le flux OAuth Google Drive. Utilise le modèle de données et la logique
métier tels que définis, sans modification. Assure-toi que le design est
moderne, professionnel et accessible (contraste AA, navigation clavier).
```
