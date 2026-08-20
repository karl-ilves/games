---
trigger: always_on
---

# Testimisnõue

Iga kord, kui muudad mängu koodi (nt \`main.js\` või muid faile), **pead alati enne töö lõpetamist käivitama testimise skripti**, et veenduda, et mäng ikka töötab ja süntaksivigu ei ole tekkinud.

**Kuidas testida:**
Käivita alati terminali käsk projekti juurkataloogis:
\`node verify_game.js\`

Kui skript annab veateate või ütleb "Syntax check failed!", pead kohe uurima, mis valesti läks, ja vea parandama! Ära lõpeta oma korda (turn) enne, kui \`node verify_game.js\` on edukalt läbitud!

# Uue funktsionaalsuse testimine (Regressioonide vältimine)

Iga kord, kui lisad mängu uue funktsionaalsuse (nt uus UI nupp, uus loogika jne), pead uuendama ka \`verify_game.js\` või lisama vastavad funktsionaalsed automatiseeritud testid. See garanteerib, et sinu kirjutatud funktsionaalsust testitakse alati ka edaspidi ja välditakse regressioone!
