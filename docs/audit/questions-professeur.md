# Questions au professeur

## AUD-010 — Secret d'authentification

Question préparée, non envoyée. Source : `265924bc7274047989e708ab635c2854d376230f`, `src/lib/auth.ts:8,11`, `.env.example:5–6`, `Makefile:14–15`.

> Dans Expense.io, le secret utilisé par Auth.js pour protéger les sessions est actuellement une constante dans le code. Le fichier `.env.example` prévoit déjà `AUTH_SECRET`, mais cette configuration n'est pas utilisée par l'authentification. Notre proposition serait de sortir la clé du code, de fournir un secret privé propre à chaque environnement et de le conserver après les redémarrages.
>
> Nous devons préserver les fonctionnalités et la compatibilité avec vos tests fonctionnels, ainsi que les commandes de build et de démarrage du README. Une nouvelle clé peut rendre les sessions actuelles inutilisables ; nous n'avons effectué aucune rotation ni modification.
>
> Cette correction fait-elle partie du périmètre attendu ? Vos tests utilisent-ils une configuration de secret particulière ou des sessions préparées ? Comment souhaitez-vous que le secret soit fourni à la première installation et dans l'environnement de test, tout en conservant les commandes existantes ? Une reconnexion lors du passage à la nouvelle clé est-elle acceptable ?

Aucune valeur de secret incluse. Gestion/rotation reportées jusqu'à clarification ; aucune communication externe effectuée par l'agent.
