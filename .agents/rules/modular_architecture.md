---
trigger: always_on
---

# Modulaarse Arhitektuuri Nõue (Modular Architecture Requirement)

Kõik mängud ja funktsionaalsused selles projektis peavad järgima puhast modulaarset arhitektuuri. **On rangelt keelatud kirjutada monoliitseid "god-faile" või kuhjata kogu koodi ühte `main.ts` faili.**

### Reeglid ja nõuded koodi struktuurile:

1. **`main.ts` peab olema õhuke orkestraator (< 350 rida):**
   `main.ts` ülesanne on ainult Three.js stseeni initsialiseerimine, tsükli (`animate`) käivitamine ja süsteemide/moodulite kokku sidumine.

2. **Koodi eraldamine spetsiaalsetesse kataloogidesse ja failidesse:**
   Iga mängu kataloog (`src/games/[mäng]/`) peab olema jaotatud järgmiselt:
   - `types.ts`: TypeScript liidesed, tüübid ja andmemudelid.
   - `catalog.ts`: Esemete, sõidukite, relvade või kaartide staatilised definitsioonid ja parameetrid.
   - `state/`: Puhas olekuhaldus (raha, inventar, salvestused, profiili ja andmebaasi sünkroonimine). **Peab olema eraldatud Three.js stseenist ja DOM-ist**, et seda saaks eraldiseisvalt testida.
   - `world/` või `environment/`: Maastik, rajad, jaamad, valgustus, tunnelid ja keskkonnamuudatused.
   - `models/`: 3D mudelite genereerimine (nt vedurid, relvad, tegelased).
   - `systems/`: Mänguloogika, füüsika, kaamera režiimid, sisendi töötlejad (`input.ts`), tehisintellekt.
   - `ui/`: Kasutajaliides (HUD, dialoogid, poed, teavitused).
   - `effects/`: Osakeste emitterid, heliefektid, animatsioonid.

3. **Korduskasutatav kood `src/shared/` kataloogi:**
   Kui mehaanika (nt puutetundlikud juhtnupud, helihaldus, avatarid, yardService, teavitused) kordub mitmes mängus, tuleb see tõsta `src/shared/` alla, mitte dubleerida koodi eri mängudes.

4. **Kõik uued funktsioonid peavad austama neid piire:**
   Uue funktsiooni lisamisel (nt uus sõiduk, uus pood, uus relv, uus režiim) ära lisa seda otse `main.ts` faili, vaid lisa see vastavasse moodulisse või loo uus spetsiaalne moodul.
