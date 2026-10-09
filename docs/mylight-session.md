# Session mylight

```sh
node ace mylight:status
node ace mylight:reconnect
node ace battery:refresh
```

`status` ouvre l'application et affiche `connected`, `disconnected`, `unknown`
ou `device-unavailable`. Le code de sortie vaut 0 uniquement si elle est connectée.
`reconnect` ne saisit les identifiants que si un écran de connexion est reconnu.
Les deux commandes referment l'application et remettent le téléphone en veille.

Configurer dans le `.env` du serveur :

```dotenv
MYLIGHT_EMAIL=
MYLIGHT_PASSWORD=
```

Les variables restent facultatives au démarrage. Elles sont nécessaires pour
reconnecter une session. La saisie Android accepte les caractères ASCII sans
espaces et ne prend pas en charge la séquence `%s`.

Le job de lecture, programmé toutes les cinq minutes, vérifie la session et tente
une reconnexion avant de rafraîchir l'écran. Un verrou Redis partagé par les
commandes et le job empêche les manipulations simultanées du téléphone.
Une tentative de connexion déclenche un délai de quinze minutes avant la suivante.
Un écran inconnu, une erreur ou une validation supplémentaire demande une
intervention manuelle ; aucun nouveau pourcentage n'est enregistré dans ce cas.

UIAutomator lit directement le pourcentage dans le texte accessible du bloc
« Batterie virtuelle ». Aucune capture ni OCR n'est nécessaire. Seul un pourcentage
entier de 0 à 100 est accepté ; une valeur absente, invalide ou ambiguë conserve
la dernière valeur de batterie enregistrée. Le job s'appelle `RefreshBattery`.
Au démarrage du serveur, le schedule `mylight-battery-refresh` est enregistré
et l'ancien schedule `CreateScreenshot` est supprimé pour éviter les doublons.

`battery:refresh` et `POST /api/battery/refresh` déclenchent cette même lecture.
`adb:screenshot` reste disponible pour une capture de diagnostic dans `tmp/screen.png`.
La commande `screenshot:ocr` est supprimée. Avant de déployer cette version,
laisser finir les anciens jobs `CreateScreenshot` et `OCRScreenshot` en attente
avec l'ancien worker.

Le parcours a été vérifié sur le Pixel 6a avec mylight 1.30.1 : écran
« Accéder à mon compte », navigateur Jelly, authentification sur
`mylightb2cprd.b2clogin.com`, puis retour dans l'application.
