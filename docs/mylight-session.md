# Session mylight

```sh
node ace mylight:status
node ace mylight:reconnect
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

Le job de capture, programmé toutes les cinq minutes, vérifie la session et tente
une reconnexion avant de rafraîchir l'écran. Un verrou Redis partagé par les
commandes et le job empêche les manipulations simultanées du téléphone.
Une tentative de connexion déclenche un délai de quinze minutes avant la suivante.
Un écran inconnu, une erreur ou une validation supplémentaire demande une
intervention manuelle ; aucun nouveau pourcentage n'est enregistré dans ce cas.

Chaque capture possède son propre fichier pour éviter les collisions entre jobs.
Les fichiers sont supprimés après un traitement OCR réussi et conservés en cas
d'échec pour permettre les relances. Une lecture OCR invalide conserve la dernière
valeur de batterie enregistrée.

Le parcours a été vérifié sur le Pixel 6a avec mylight 1.30.1 : écran
« Accéder à mon compte », navigateur Jelly, authentification sur
`mylightb2cprd.b2clogin.com`, puis retour dans l'application.
