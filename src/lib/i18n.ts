import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "header.title": "Bulk Invoice Manager",
      "header.history": "Export History",
      "hero.title": "Rename your invoices in bulk",
      "hero.subtitle": "Upload your PDFs, data extraction is fully automatic via our secure server-side AI processing.",
      "upgrade.title": "Upgrade to Pro",
      "upgrade.price": "{{price}} {{currency}} / year",
      "upgrade.description": "You've reached your free limit of 5 invoice extractions.",
      "upgrade.features": "Get unlimited invoice extraction, expanded currency mapping, and smart folder ZIP exports.",
      "upgrade.cancel": "Cancel",
      "upgrade.subscribe": "Subscribe Now",
      "upgrade.processing": "Processing...",
      "common.signin": "Sign In",
      "common.signout": "Sign Out",
      "dropzone.drag": "Drag & drop invoice PDFs here",
      "dropzone.drop": "Drop your files here",
      "dropzone.browse": "or browse files",
      "dropzone.trial": "Free Trial: {{used}} / 5 invoices used",
    }
  },
  fr: {
    translation: {
      "header.title": "Gestionnaire de Factures",
      "header.history": "Historique des exports",
      "hero.title": "Renommez vos factures en masse",
      "hero.subtitle": "Téléchargez vos PDF, l'extraction des données est entièrement automatique via notre IA sécurisée.",
      "upgrade.title": "Passer à la version Pro",
      "upgrade.price": "{{price}} {{currency}} / an",
      "upgrade.description": "Vous avez atteint la limite gratuite de 5 extractions.",
      "upgrade.features": "Extraction illimitée, mapping devises étendu et exports ZIP intelligents.",
      "upgrade.cancel": "Annuler",
      "upgrade.subscribe": "S'abonner",
      "upgrade.processing": "Traitement...",
      "common.signin": "Connexion",
      "common.signout": "Déconnexion",
      "dropzone.drag": "Glissez-déposez vos factures PDF ici",
      "dropzone.drop": "Déposez vos fichiers ici",
      "dropzone.browse": "ou parcourir les fichiers",
      "dropzone.trial": "Essai gratuit : {{used}} / 5 factures utilisées",
    }
  },
  de: {
    translation: {
      "header.title": "Rechnungs-Manager",
      "header.history": "Export-Verlauf",
      "hero.title": "Rechnungen gesammelt umbenennen",
      "hero.subtitle": "Laden Sie Ihre PDFs hoch, die Datenextraktion erfolgt vollautomatisch über unsere sichere KI.",
      "upgrade.title": "Upgrade auf Pro",
      "upgrade.price": "{{price}} {{currency}} / Jahr",
      "upgrade.description": "Sie haben das kostenlose Limit von 5 Extraktionen erreicht.",
      "upgrade.features": "Unbegrenzte Rechnungsextraktion, erweiterte Währungszuordnung und intelligente ZIP-Exporte.",
      "upgrade.cancel": "Abbrechen",
      "upgrade.subscribe": "Jetzt abonnieren",
      "upgrade.processing": "Verarbeitung...",
      "common.signin": "Anmelden",
      "common.signout": "Abmelden",
      "dropzone.drag": "Rechnungs-PDFs hierher ziehen",
      "dropzone.drop": "Dateien hier ablegen",
      "dropzone.browse": "oder Dateien durchsuchen",
      "dropzone.trial": "Kostenlose Testversion: {{used}} / 5 Rechnungen",
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
