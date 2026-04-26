# Résumé du Projet : Bulk-Invoice-Rename

Ce document est destiné à un expert en prompting pour optimiser l'extraction de données via l'IA.

## 🎯 Objectif Ambitieux
L'objectif est de supprimer la friction du renommage manuel et du classement des documents comptables (factures, reçus, avoirs) pour les professionnels (freelances, PME, comptables).
*   **Gain de temps x10** : Passer d'un renommage manuel fastidieux à une validation en un clic.
*   **Standardisation** : Appliquer des patterns de nommage professionnels constants (ex: `2024-03-14_Amazon_150.00EUR_F-12345.pdf`).
*   **Intelligence Multilingue & Multimodale** : Extraire avec précision des données complexes (montants, dates, fournisseurs, catégories) sur des documents de formats variés, langues multiples (FR, DE, EN) et même des documents scannés/manuscrits.
*   **Privacy-by-design** : Le traitement lourd (PDF parsing, miniatures) est fait côté client. L'IA n'est utilisée que pour l'extraction de métadonnées structurées via un proxy sécurisé.

## 🛠 Ce qui existe déjà

### 1. Composantes IA (`src/lib/ai-extract.ts` & `/api/extract`)
Le système utilise actuellement **OpenAI GPT-4o-mini** avec deux modes de fonctionnement :
*   **Mode Vision (Principal)** : Envoie des captures (base64) des pages du PDF pour une extraction visuelle (idéal pour documents scannés).
*   **Mode Texte (Fallback)** : Envoie le texte brut extrait via `pdf.js` si le mode vision échoue.
*   **Prompting Actuel** : 
    *   Instructions strictes pour retourner du **JSON pur**.
    *   Champs extraits : `date`, `amount`, `currency`, `vendor`, `category`, `invoiceNumber`, `paymentMethod`, `dueDate`, `isCreditNote`, `confidence`.
    *   Gestion multilingue intégrée (FR, DE, EN).
    *   Logique de "Hints" (indices) : Le système peut passer des pré-détections à l'IA pour vérification.
    *   Validation après extraction : Vérification des dates futures, des montants aberrants et normalisation des formats (YYYY-MM-DD).

### 2. Workflows & Patterns
*   **Workflow Utilisateur** : 
    1.  **Dropzone** : Upload en masse de PDFs.
    2.  **Processing** : Extraction parallèle via IA (avec file d'attente et gestion des rate limits).
    3.  **Table de Prévisualisation** : Édition manuelle inline des champs extraits si nécessaire.
    4.  **Pattern Editor** : Système de tokens dynamiques `{date}`, `{vendor}`, `{amount}`, etc., avec prévisualisation en temps réel du futur nom de fichier.
    5.  **Export** : Génération d'un ZIP renommé (JSZip) ou export direct vers Google Drive via API.
*   **Gestion des Patterns (`src/lib/naming-utils.ts`)** :
    *   Nettoyage automatique des noms de fichiers (suppression des caractères spéciaux).
    *   Gestion des doublons (incrémentation auto `-1`, `-2`).
    *   Formatage des dates et montants personnalisable.

### 3. Stack Technique
*   **Frontend** : Next.js 14, Tailwind CSS, shadcn/ui.
*   **État** : Zustand (store persistant pour les fichiers et patterns).
*   **Processing PDF** : `pdf.js` (client-side).
*   **Backend** : Supabase (Auth & Profils), API Routes Next.js (Proxy IA, Google Drive OAuth).

## 🚀 Défis pour le Prompting Perfect
1.  **Fiabilité à 99%** : Éviter les erreurs d'inversion entre le fournisseur (vendor) et le client, ou entre le montant HT et TTC.
2.  **Identification de Catégorie** : Mapper précisément les fournisseurs à une liste de catégories prédéfinies par l'utilisateur (ex: "Admin", "Logiciels", "Logistique").
3.  **Avoirs (Credit Notes)** : Détecter sans erreur si un document est un remboursement/avoir pour inverser la logique de montant si nécessaire.
4.  **Optimisation des Coûts/Latence** : Tirer le meilleur parti de `gpt-4o-mini` tout en restant extrêmement rapide pour des lots de 50 fichiers.

---
*Ce résumé est prêt à être transmis au développeur expert en prompting.*
