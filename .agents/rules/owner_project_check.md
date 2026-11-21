# Owner Projekti Kontrollimise Reegel (Owner Project Verification Rule)

Alati enne uue funktsiooni tegemist või koodi muutmist pead kontrollima Owneri paneeli projektide staatust.

## Nõutav käitumine:
1. Kontrolli Owner paneeli projekte (kas `localStorage.getItem('playard_owner_projects')` või `getActiveOpenProject()` kaudu):
   - **KUI mõni projekt on avatud (`isOpen === true`)**:
     - Teed nõutud muudatused ja laadid uuenduse otse selle avatud projekti alla (lisad update'i selle projekti ID ja pealkirjaga).
   - **KUI mitte ühtegi projekti ei ole avatud**:
     - **ÄRA tee muudatusi enne, kui oled kasutajalt küsinud järgmise valikuga**:
       > "Mida ma teen?
       > 1. Lae kohe ülesse
       > 2. Stop
       > 3. Vaata uuesti ja jätka"
