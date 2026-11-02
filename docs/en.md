# Carte des artisans (French craftsmen map)

Find craftsmen of a trade around your house, right in Gladys: plumbers,
electricians, carpenters, bakers, mechanics… The integration reads the public
data of the [Carte des artisans](https://cartedesartisans.fr/), an independent
website (not affiliated with Insee or the French chambers of trades) listing
more than 3 million active craft businesses in mainland France and Corsica.
Trade names and texts are in French.

## Before you start

- **Gladys 5.1 or later.**
- **Your house location** must be set in **Settings › Houses**. The
  integration searches around the first located house (alphabetical order).
- The installation asks for the **house location**: it is only used to compute
  distances, **inside Gladys**, and never sent to the website or any other
  service.

There is nothing to set up in the **Configuration** tab: the
**Test the connection** button checks that the data can be read and that the
house is located.

## "Craftsmen near me" widget

Add it to a dashboard, then choose in its settings:

- **Trade**: one of the 126 trades of the map;
- **Radius**: 5, 10, 25 or 50 km around the house;
- **Certified companies only** (RGE, EPV, master craftsman).

The widget shows how many craftsmen were found and up to 8 businesses. Tap one
to see its activity, address, certifications, phone number when the craftsman
added it, and the **Details** and **Directions** links. **Open the map** opens
the website map for this trade and your town (never your exact location).

Add several widgets to follow several trades.

### Order of the results

As on the website: **certified businesses** (RGE, Living Heritage Company,
master craftsman) first, then **the nearest**.

### "Sponsored" entries

Up to 3 entries marked **Sponsored** may appear at the top of the list:
craftsmen who subscribed to the paid "recommended craftsman" option for this
trade in your department or town. They are drawn at random, always marked, and
**never change the other results or their order**. The scene action never
returns them. Details: [ranking rules](https://cartedesartisans.fr/faq.html#classement) (in French).

## "Find a craftsman" scene action

In the scene editor, **Integrations** category. Choose the trade, the radius
and optionally "certified only". The action gives the next actions of the
scene:

| Variable    | Content                                          |
| ----------- | ------------------------------------------------ |
| `trouve`    | true when at least one craftsman was found       |
| `nombre`    | number of craftsmen within the radius            |
| `nom`       | name of the first craftsman (certified first)    |
| `telephone` | phone number, when added on the website          |
| `adresse`   | address                                          |
| `distance`  | distance to the house ("2,4 km")                 |
| `lien`      | link to the business page on cartedesartisans.fr |

## Data and privacy

- Sources: Sirene (Insee) and the trades register (CMA), open licence, updated
  monthly; RGE (ADEME) and EPV (DGE) certifications.
- The integration only downloads the files it needs (one per trade and nearby
  department, a few kilobytes), keeps them in its `/data` folder and only reads
  them again after the monthly update. What craftsmen add themselves (phone,
  master craftsman title, recommended craftsmen) is read again every 6 hours.
- Nothing about you is sent: no location, no identifier, no cookie. Links to
  the website only carry `mtm_campaign=gladys`, to count visits coming from
  Gladys.

## Troubleshooting

- **"Set your house location"**: set it in Settings › Houses, then reopen the
  dashboard.
- **"This trade no longer exists"**: the trade was removed from the website;
  pick another one in the widget settings.
- **No result**: widen the radius.
- **Wrong information about a business** (address, removal request): use the
  "Signaler une erreur" link of its page on the website.
