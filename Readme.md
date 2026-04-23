/* Open for Auction Draft */

- Design Mobile auf dem Handy muss sich entsprechend gut im Design anpassen
- Mobile kann noch optimiert werden

Funktionality
- Spieler (Owner) hinterlegen als Dropdown Menü, sodass sich jeder auswählen kann

Bid-Logik absichern (sehr wichtig)
Aktuell kann theoretisch:
jemand gleichzeitig bieten
jemand ein niedrigeres Gebot überschreiben (Race Condition)

👉 Lösung:
Check + Update in einem Schritt (Supabase RPC oder stricter Check)
Optional: Mindest-Erhöhung (z. B. +1 oder +5)

Anpassungen/Rules

- Mindestgebot einstellen - Also es muss mindestens 100k mehr geboten werden - 500k Minimum
- PopUp wenn Gebot zu niedrig verbessern
