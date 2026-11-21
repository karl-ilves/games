# Playardi Reeglid (Playard Rules)

See dokument koondab kõik Playardi platvormi, arendaja ja tehisintellekti ametlikud reeglid.

---

## 1. Owner Paneeli Projekti Kontrollimise Reegel (Kohustuslik)
Alati enne mis tahes tegevuse, funktsiooni või koodimuudatuse alustamist tuleb kontrollida Owner paneeli projektide staatust:
- **Kui mõni projekt on avatud (`isOpen === true`)**:
  - Teostatud töö ja uuendused laaditakse/seotakse otse selle avatud projekti alla.
- **Kui ühtegi projekti ei ole avatud**:
  - Tuleb küsida omanikult suunist:
    > "Mida ma teen?
    > 1. Lae kohe ülesse
    > 2. Stop
    > 3. Vaata uuesti ja jätka"

---

## 2. Ühtse Hubi Reegel (Mängimine otse Hubis)
- Mängija viibib alati ühtsel Playardi lehel (`/index.html`).
- Mängude käivitamisel **ei vahetu veebiaadress ega brauseri lehekülg** – mäng avaneb sujuvalt täisekraanis Hubi sees (`#playard-in-hub-game-container`).
- Mängust väljumisel ("🚪 Välju Hubi" või "Leave / Lahku") naaseb mängija koheselt Hubi ilma lehe ümberlaadimiseta.
- Kui keegi üritab mängu otse aadressiribal avada, suunatakse ta automaatselt Hubi mängukonteinerisse.

---

## 3. Modulaarse Arhitektuuri Nõue (Modular Architecture)
- **Monoliitsed failid on rangelt keelatud**: `main.ts` failid peavad olema õhukesed orkestraatorid (< 350 rida).
- Selge vastutuse jaotus:
  - `types.ts`: TypeScript liidesed ja andmemudelid.
  - `catalog.ts`: Staatilised konfiguratsioonid ja esemete nimekirjad.
  - `state/`: Puhas olekuhaldus (raha, inventar, salvestus), eraldatud Three.js-ist ja DOM-ist.
  - `models/`: 3D mudelite genereerimine ja geomeetriad.
  - `world/` või `environment/`: Maastik, valgustus, rajad.
  - `systems/`: Mänguloogika, füüsika, kaamera, sisendikontrollerid.
  - `ui/`: HUD, aknad, dialoogid.
  - `src/shared/`: Ülekasutatavad süsteemid (avatarid, juhtnupud, valuutad, inGameMenu jne).

---

## 4. Testimise ja Verifitseerimise Nõue (Mandatory Testing)
- Iga kord pärast koodi muutmist tuleb enne töö lõpetamist käivitada:
  ```bash
  node verify_game.js
  ```
- Ükski viga ega hoiatus ei tohi jääda lahendamata. Kõik testid peavad läbima edukalt (`All Playard Platform tests passed successfully!`).
- Uue funktsiooni lisamisel tuleb lisada vastav automaattest `verify_game.js` faili, et vältida regressioone.

---

## 5. GitHubi Automaatne Uuendamine (Git Push Nõue)
- Kui koodimuudatused on tehtud ja `node verify_game.js` on edukalt läbitud:
  ```bash
  git add .
  git commit -m "kirjeldus tehtud muudatustest"
  git push
  ```

---

## 6. Turvalisuse ja Õiglase Mängu Reeglid
- Pettused, haavatavuste ärakasutamine ja ebasobiv käitumine on keelatud.
- Kõikides mängudes on paremas ülanurgas raporti nupp (`🚩 Report`), mis võimaldab mängijaid raporteerida. Raportid laekuvad otse Owner paneeli ülevaatamiseks.
- Serverite loendites kuvatakse ainult reaalsed mängijad (mitte tehislikud bottid).
