# nilecrz design system — package

Open **index.html** in a browser to browse everything: the cover, colour tokens, the type scale and every component as a live, interactive preview, with a Day / Night switch. It works offline (React is bundled); only the two Google fonts, Cormorant Garamond and Jost, need a connection.

## What's inside

| Path | What |
|---|---|
| `index.html` | Gallery of the whole system |
| `BRAND-BOOK.md` | Voice, colour, type, spacing, imagery, motion, iconography: the usage rules |
| `tokens/tokens.json` | Source of truth: colours (Day and Night themes), type, spacing, radius, shadow, layout |
| `tokens/tokens.css` | The same tokens as CSS custom properties, plus one class per type style (`.display-xl`, `.body`…) |
| `components/bundle.js` | All 22 React components as one script: `window.Nilecrz` |
| `components/bundle.css` | Component styles (loads the Google fonts) |
| `components/index.d.ts` | Props for every component |
| `components/lib/` | React 18.3.1 and ReactDOM 18.3.1, production builds |
| `components/<Name>/README.md` | Guidelines: what to pass, when to use it, do's and don'ts |
| `components/<Name>/preview.html` | Live preview of that component |
| `components/LandingPage/` | A full homepage composed from the system |

## Using it in a page

```html
<link rel="stylesheet" href="tokens/tokens.css">
<link rel="stylesheet" href="components/bundle.css">
<script src="components/lib/react.production.min.js"></script>
<script src="components/lib/react-dom.production.min.js"></script>
<script src="components/bundle.js"></script>
<div id="app"></div>
<script>
  var N = Nilecrz, h = React.createElement;
  ReactDOM.createRoot(document.getElementById('app')).render(h(N.PriceAnatomy));
</script>
```

Set `data-theme="dark"` on `<html>` for the Night theme. In a Next.js or other React app, port the `bundle.js` components to modules and keep `tokens.css` global; the token names are the contract.

The figures in `PriceAnatomy` and `VesselCompare` are illustrative defaults: pass your real rate data through their props.
