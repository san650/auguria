# Auguria · Cifras del día

A small celestial PWA that conjures a stable daily set of lottery numbers
for the five major Spanish drawings and reads the numerology of each one.
The numbers are seeded from the day's date in the **Europe/Madrid** (Valencia)
timezone — so the cifras don't shift while you read them, and the whole world
sees the same combination per game per day.

Lives at **[auguria.42.uy](https://auguria.42.uy)**.

## Games

| Sorteo                      | Combinación      | Extras                          |
|-----------------------------|------------------|---------------------------------|
| La Primitiva                | 6 de 1–49        | Complementario · Reintegro (0–9) |
| El Gordo de la Primitiva    | 5 de 1–54        | Número clave (0–9)              |
| Bonoloto                    | 6 de 1–49        | Reintegro (0–9)                 |
| Euromillones                | 5 de 1–50        | 2 Estrellas (1–12)              |
| EuroDreams                  | 6 de 1–40        | Número Dream (1–5)              |

## How it works

- **Deterministic randomness.** A `cyrb128` string hash of `YYYY-MM-DD::game-id`
  (date interpreted in Europe/Madrid) seeds a `mulberry32` PRNG. Same date,
  same game, same numbers — everywhere, all day.
- **Per-game seed.** Each game has its own seed so the combinations aren't
  correlated across the five sorteos.
- **Numerology.** Each number reduces to a digit 1–9 (or to a master number
  11/22/33). The reduction's archetype name appears under each medallion;
  tap a medallion for the full reading.
- **PWA.** Vanilla HTML/CSS/JS. A small service worker caches the shell so the
  app works offline. Installable on iOS and Android.

## Disclaimer

Auguria does not guarantee fortune. The numerology is symbolic and the cifras
are pseudo-random; nothing here improves your odds. Juega con mesura.

## License

[MIT](./LICENSE).
