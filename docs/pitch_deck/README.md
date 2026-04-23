# HIPAApotamus Pitch Deck

## Files

- `HIPAApotamus_Pitch_Deck.pptx` — the deck
- `build_deck.py` — Python source (current)
- `build_pitch_deck.js` — earlier JS attempt, kept for reference only
- `package.json`, `node_modules/`, `pptxgenjs_helpers/` — left over from the JS attempt

## Design direction

Editorial, minimal, legally-toned. Ink charcoal background, warm bone text,
Georgia serif for every hero word, a single brass accent rule as the only
ornament. No boxes, no pills, no cards, no icons, no colorful borders.

## Interactivity model

One slide per concept. No redundant paired slides.

- Slide loads with the hero word centered, big, alone.
- First click: hero word fades out, a smaller version appears top-left with a
  brass rule under it, and the first content block fades in.
- Each subsequent click fades in the next content block on the same slide.

This is implemented with PowerPoint click-triggered entrance/exit animations
(fade, 450ms entr / 300ms exit). The effect XML matches PowerPoint's native
emission exactly, so the file opens without a "content cannot be loaded"
dialog.

## Technical grounding

Legal citations on every feature slide reference the actual implementation:
- `src/lib/signing/token.ts` — HMAC magic link
- `src/lib/signing/otp.ts` — email OTP challenge
- `src/lib/signing/kms.ts` — KMS ECDSA_SHA_256 digital signing
- `src/lib/pdf/generator.ts` — signed PDF pipeline
- `src/lib/baa/cfrMappings.ts` — 45 CFR §164.504(e)(2) → MSDH mapping
- `src/lib/ai/gemini.ts` — grounded audit copilot
- `cdk/lib/hipaa-baa-stack.ts` — AWS-native stack

CFR citations are worked into the footer of each reveal so the presenter can
speak to them without reading them, and the auditor-shaped objections
("attribution", "integrity", "retention") are named explicitly.

## Rebuild

```bash
python3 build_deck.py
```

No Python dependencies beyond `python-pptx` and `lxml` (both standard in most
venvs). The output file overwrites `HIPAApotamus_Pitch_Deck.pptx` in place.
