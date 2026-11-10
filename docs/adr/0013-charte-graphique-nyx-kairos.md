# 13. Charte graphique NYX-KAIROS pour toute l'application

Date : 2026-11-10

## Statut

Accepté. Remplace le point 8 « Interface » de l'ADR 0010 pour les couleurs, et règle la dette
« convertir les couleurs NYX en jetons clair/sombre » de cet ADR.

## Contexte

Après la fusion (ADR 0010), l'application avait deux apparences :

- les pages de K suivaient le thème du système (clair ou sombre), avec un accent sarcelle
  (`#0f766e`) ;
- les écrans NYX étaient affichés dans un encadré sombre (`.life-zone`), avec la palette
  noir / argent / or, mais leurs composants utilisaient encore l'ancien ambre de NYX (`#f59e0b`,
  `#fbbf24`, `#d97706`).

Le propriétaire a demandé que tout le front suive la maquette NYX-KAIROS :

| Rôle | Couleur | Usage |
| --- | --- | --- |
| Dominante (60 %) | Noir `#000000` | fond de page, `html`, éléments de base |
| Secondaire (30 %) | Argenté `#c0c0c0` | texte principal, dégradés de fond, barres de défilement |
| Accent (10 %) | Doré `#d4af37` | boutons, lueurs, curseurs, bordures de survol |
| Profondeur | Violet aubergine `#4b0082` | dégradés de fond discrets, éléments de sélection |

## Décision

- Un seul thème, sombre, pour toutes les pages (`color-scheme: dark`). Le thème clair est
  abandonné : la maquette est sombre par nature.
- Les jetons de `src/app/globals.css` partent des quatre couleurs de la maquette. Les noms
  utilisés par les écrans NYX (`ember`, `ash`, `smoke`, `raise`…) pointent vers les mêmes jetons
  que ceux de K (`accent`, `foreground`, `muted`…) : une seule source.
- Application de la maquette :
  - noir : fond de `html` et `body` ;
  - argenté : texte, dégradé de fond bas-gauche, barres de défilement (`scrollbar-color`, et
    `::-webkit-scrollbar` pour les navigateurs qui ne le gèrent pas) ;
  - doré : boutons principaux (avec lueur au survol), contour de focus, curseur de saisie
    (`caret-color`), cases et curseurs (`accent-color`, curseur de plage NYX), bordures de survol
    (boutons secondaires, cartes NYX, navigation), logo ;
  - aubergine : dégradé de fond haut-droite, sélection de texte (`::selection`), page courante
    dans la navigation, survol des lignes (`accent-soft`, teinte aubergine).
- L'ancien ambre NYX est remplacé par la gamme or : `#d4af37`, or clair `#e6c35c`, or sombre
  `#a8862a`. Les gris légèrement bleutés des écrans NYX deviennent des gris neutres.
- Les champs de saisie de K et de NYX ont le même style : fond `#0f0f0f`, bordure `#808080`
  (NYX utilisait `#404040`, 1,6:1, sous le seuil de 3:1 du critère 1.4.11), bordure dorée au focus.
- Les domaines d'intérêt enregistrés avec l'ancien ambre s'affichent en or
  (`interestColor()`), sans migration de données.
- `.life-zone` ne porte plus de fond ni de couleur : les écrans NYX s'alignent sur les pages de K.
- Icônes de l'application et du manifeste PWA régénérées : K doré sur fond noir avec halo
  aubergine.

### Contrastes (WCAG 2.2 AA)

Rapports calculés avec la formule de luminance relative de WCAG 2.2 :

| Couple | Rapport | Seuil |
| --- | --- | --- |
| Argenté sur noir | 11,5:1 | 4,5:1 |
| Argenté sur la surface la plus claire `#333333` | 6,9:1 | 4,5:1 |
| Texte secondaire `#a0a0a0` sur `#333333` | 4,8:1 | 4,5:1 |
| Doré sur noir | 10,0:1 | 4,5:1 |
| Texte noir sur bouton doré | 10,0:1 | 4,5:1 |
| Blanc sur aubergine (page courante) | 13,0:1 | 4,5:1 |
| Bordure de champ `#808080` sur la carte `#1a1a1a` | 4,4:1 | 3:1 |
| Contour de focus doré sur noir | 10,0:1 | 3:1 |

L'aubergine `#4b0082` n'est jamais utilisé comme couleur de texte (1,6:1 sur noir).

## Conséquences

- Apparence unique : les pages de K et les écrans NYX ont les mêmes fonds, boutons, bordures et
  focus.
- Les personnes qui préfèrent un thème clair ne l'ont plus. Rien dans WCAG n'impose un thème
  clair ; le zoom et l'agrandissement du texte restent pris en charge.
- Les couleurs qui portent un sens restent hors de la palette : rouge (erreur, danger), vert
  (réussi), avertissement brun et jaune, et les couleurs de catégories des graphiques (piliers,
  types d'activité, liens de parenté, domaines d'intérêt). Les remplacer par la palette rendrait
  les catégories impossibles à distinguer.
- Un QR code garde son fond blanc : il doit rester lisible par les applications TOTP.
