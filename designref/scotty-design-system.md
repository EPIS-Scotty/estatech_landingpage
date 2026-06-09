# SCOTTY Design System Reference

> Extracted from **Scotty Wireframe** (`hAdvz6euDnH9KzrkZNO1nN`) — UI Design page.  
> Use this document when implementing UI in code to match the Figma wireframe's color scheme, typography, spacing, and conventions.

---

## 1. Product & Visual Identity

**SCOTTY** is a smart lock / door access control mobile app. The visual language is:

- **Dark, premium, hardware-forward** — deep blue gradients with white/light-gray type
- **iOS-native framing** — iPhone 16 Pro artboard (402 × 874 pt), system status bar, bottom tab navigation
- **3D product renders** — keypad and door handle imagery are hero elements on lock screens
- **Material Design 3 typography** on Roboto, with SF Pro reserved for the iOS status bar clock
- **Semantic iconography** — Battery, Wifi, Lock, Key, Settings, Home, etc., used consistently across flows

---

## 2. Color Palette

### 2.1 Brand & Background

| Token | Hex / Value | Usage |
|-------|-------------|-------|
| `gradient.start` | `#15324C` | Top of primary screen gradient (deep navy) |
| `gradient.mid` | `#255C8C` | Mid-stop at ~50.8% of vertical gradient |
| `gradient.end` | `#64B5F6` | Bottom of primary screen gradient (sky blue) |
| `surface.nav` | `#4387B9` | Bottom tab bar background |
| `surface.card` | `rgba(30, 38, 48, 0.79)` | Status/control cards, overlays on gradient |
| `surface.base` | `#FFFFFF` | Declared as screen base in some frames; visually dominated by gradient |

**Primary background** is always a **vertical linear gradient**:

```css
background: linear-gradient(
  180deg,
  #15324C 0%,
  #255C8C 50.807%,
  #64B5F6 100%
);
```

Decorative **vector wave/blob overlays** sit above the gradient on most screens (non-interactive atmosphere).

---

### 2.2 Text & Labels

Colors map to **Material 3 label tokens** and iOS vibrant control labels:

| Token | Hex | Role |
|-------|-----|------|
| `text.primary` | `#FFFFFF` | Headlines, active tab labels, selected states |
| `text.tertiary` | `#D9D9D9` | Body copy, menu items, status labels, icons on dark |
| `text.secondary` | `#8C8C8C` | Timestamps, de-emphasized metadata (e.g. "Latest Updated…") |
| `text.muted-hint` | `#D9D9D9` at **34% opacity** | Pull-to-refresh hints, tertiary instructional copy |

---

### 2.3 Semantic / Status Colors

| Token | Hex / Value | Usage |
|-------|-------------|-------|
| `status.connected` | Icon + `#D9D9D9` label | Wi-Fi connectivity indicator |
| `status.locked` | Lock icon + `#D9D9D9` label | Active lock state (white underline bar on selected tab) |
| `status.battery-full` | Green fill in battery icon | 100% battery display |
| `alert.forced-lock.bg` | `rgba(155, 67, 67, 0.5)` | Forced lock warning box fill |
| `alert.forced-lock.border` | `#9B4343` | Forced lock warning box border (3px solid) |
| `divider.handle` | `#A7A7A7` | Drag handle pill on bottom sheets/cards (94 × 3px, 5px radius) |

---

### 2.4 Shadows & Borders

| Token | Value | Usage |
|-------|-------|-------|
| `shadow.card` | `0 4px 4px rgba(0, 0, 0, 0.25)` | Cards, alert boxes, elevated surfaces |
| `radius.card` | `10px` | Primary content cards |
| `radius.small` | `5px` | Pills, small alert boxes, drag handles |
| `radius.pill` | `5px` | Horizontal status indicator underline |

---

### 2.5 Suggested CSS Custom Properties

```css
:root {
  /* Brand gradient */
  --scotty-navy: #15324c;
  --scotty-blue: #255c8c;
  --scotty-sky: #64b5f6;
  --scotty-nav: #4387b9;

  /* Surfaces */
  --scotty-surface-card: rgba(30, 38, 48, 0.79);

  /* Text */
  --scotty-text-primary: #ffffff;
  --scotty-text-tertiary: #d9d9d9;
  --scotty-text-secondary: #8c8c8c;

  /* Semantic */
  --scotty-danger: #9b4343;
  --scotty-danger-muted: rgba(155, 67, 67, 0.5);
  --scotty-divider: #a7a7a7;

  /* Effects */
  --scotty-shadow-card: 0 4px 4px rgba(0, 0, 0, 0.25);
  --scotty-radius-card: 10px;
  --scotty-radius-sm: 5px;
}
```

---

## 3. Typography

### 3.1 Font Families

| Context | Family | Notes |
|---------|--------|-------|
| App UI (default) | **Roboto** | All M3 text styles |
| iOS status bar clock | **SF Pro** (Semibold, weight 590) | System chrome only; do not use for app content |

Load Roboto weights: **Regular (400)**, **Medium (500)**, **SemiBold (600)**.

---

### 3.2 Type Scale (Material 3)

All styles below use Roboto unless noted.

| Style | Size | Line Height | Weight | Letter Spacing | Typical Usage |
|-------|------|-------------|--------|----------------|---------------|
| **Headline Large** | 32px | 40px | Medium (500) | 0 | Screen titles — e.g. device name **"SCOTTY"** |
| **Title Medium** | 16px | 24px | Medium (500) | 0.15px | Subtitles — e.g. **"Front Door"** |
| **Body Medium** | 14px | 20px | Medium (500) | 0.25px | List row labels — Password View, Key Sharing, Configuration |
| **Body Small** | 12px | 16px | Regular (400) | 0.4px | Status row labels (Connected, Locked, 100%), timestamps |
| **Label Medium** | 12px | 16px | SemiBold (600) | 0.5px | Section chips — e.g. **"Forced Lock"**, refresh hints |
| **Label Small** | 11px | 16px | Medium (500) | 0.5px | Bottom tab labels — Home, Notification, Setting |
| **Login headline** | ~28px line box | 28px | — | — | **"Login to your account"** (auth screens) |
| **Divider label** | ~14px line box | 14px | — | — | **"OR CONTINUE WITH"**, **"WAITING FOR INVITE?"** |
| **Status bar time** | 17px | 22px | SF Pro Semibold (590) | — | System clock only |

---

### 3.3 Text Hierarchy on Lock Screens

```
[Back]                          ← 18px icon
Front Door                      ← Title Medium, tertiary
SCOTTY                          ← Headline Large, white
Pulled down to refresh status   ← Label Medium, tertiary @ 34% opacity, centered

Latest Updated: 19/10/25 16:34PM  ← Body Small, secondary, right-aligned above card
```

---

### 3.4 Suggested CSS Type Tokens

```css
.text-headline-lg {
  font-family: 'Roboto', sans-serif;
  font-size: 32px;
  font-weight: 500;
  line-height: 40px;
  letter-spacing: 0;
}

.text-title-md {
  font-family: 'Roboto', sans-serif;
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  letter-spacing: 0.15px;
}

.text-body-md {
  font-family: 'Roboto', sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  letter-spacing: 0.25px;
}

.text-body-sm {
  font-family: 'Roboto', sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  letter-spacing: 0.4px;
}

.text-label-md {
  font-family: 'Roboto', sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  letter-spacing: 0.5px;
}

.text-label-sm {
  font-family: 'Roboto', sans-serif;
  font-size: 11px;
  font-weight: 500;
  line-height: 16px;
  letter-spacing: 0.5px;
}
```

---

## 4. Spacing & Layout

### 4.1 Screen Grid

| Property | Value |
|----------|-------|
| Artboard width | **402px** |
| Artboard height | **874px** (iPhone 16 Pro) |
| Status bar height | **54px** |
| Bottom tab bar height | **99px** |
| Usable content area (below status bar) | ~820px |
| Standard horizontal inset | **20–24px** from screen edge |
| Primary card width | **362px** (20px margin each side) |

---

### 4.2 Spacing Scale

Figma references a tokenized spacing scale. Observed values across screens:

| Token / Size | px | Usage |
|--------------|-----|-------|
| `spacing/3` | **12px** | Small icons, tight gaps, trailing chevrons |
| `spacing/6` | **24px** | Standard icon size in lists and alerts |
| **16px** | 16px | Small button icons, compact controls |
| **18px** | 18px | Back navigation, social login icons |
| **20px** | 20px | Home tab icon, horizontal card margin |
| **23px** | 23px | Profile container left inset |
| **29px** | 29px | Login form outer horizontal margin |
| **32px** | 32px | Status row icons (Wifi, Lock, Battery) |
| **36px** | 36px | Login form inner padding, primary button height |
| **48px** | 48px | Alert component height |
| **62px** | 62px | Form control field height |
| **82px** | 82px | Vertical gap between stacked form fields |
| **99px** | 99px | Bottom navigation bar total height |
| **128px** | 128px | Avatar diameter (user settings) |

---

### 4.3 Border Radius Scale

| Token | px | Usage |
|-------|-----|-------|
| `border-radius/xl` | **12px** | Small icon containers |
| `border-radius/3xl` | **24px** | Standard list/action icons |
| Card default | **10px** | Status cards, device cards |
| Small UI | **5px** | Drag handles, forced-lock box, pills |

---

### 4.4 Icon Sizes

| Size | Context |
|------|---------|
| **12px** | Trailing chevron / reveal toggle in list rows |
| **16px** | Inline button icons |
| **18px** | Back arrow, OAuth provider icons |
| **20px** | Home tab icon, edit actions |
| **24px** | List row leading icons, tab bar center/right icons, alert icons |
| **32px** | Status strip icons (connectivity, lock, battery) |

Icons are **line-style**, white or `#D9D9D9` on dark backgrounds. Battery uses a green fill when full.

---

### 4.5 Key Vertical Positions (Lock Screen Reference)

These are useful for matching the wireframe layout proportions:

| Element | Top offset (from screen top) |
|---------|------------------------------|
| Refresh hint | ~51px |
| Back icon | ~68px |
| Subtitle ("Front Door") | ~93px |
| Title ("SCOTTY") | ~112px |
| Forced lock chip | ~152–170px |
| 3D keypad render | ~164px |
| Door handle render | ~333px |
| "Latest Updated" label | ~507px |
| Status card top | ~525px |
| Status icons row | ~541px |
| Status labels row | ~575px |
| Drag handle pill | ~607px |
| Settings list block | ~624px |
| Bottom tab bar | ~791px |

---

## 5. Component Conventions

### 5.1 Screen Shell (Every Primary Screen)

Every main screen shares this structure:

1. **Full-bleed gradient background** (`#15324C` → `#255C8C` → `#64B5F6`)
2. **Decorative vector overlays** (abstract curves; no interaction)
3. **iOS Status Bar** component — 54px, time `9:41`, cellular/wifi/battery
4. **Scrollable content area** between status bar and bottom nav
5. **Fixed bottom tab bar** — 99px, `#4387B9` background

---

### 5.2 Bottom Tab Bar

| Property | Value |
|----------|-------|
| Height | 99px |
| Background | `#4387B9` |
| Tabs | **Home** · **Notification** · **Setting** |
| Icon size | 20px (Home), 24px (bell, gear) |
| Label style | Label Small, white |
| Active state | White icon + label (Home shown active on lock screen) |
| Icon-to-label gap | ~22px (icon at y≈803, label at y≈825) |

---

### 5.3 Header / Navigation

- **Back chevron**: 18×18px, top-left (~18px from left edge)
- **Context label** below back: Title Medium, tertiary color
- **Page title**: Headline Large, white, left-aligned below context label
- Optional **centered hint** above header content at reduced opacity (pull-to-refresh)

---

### 5.4 Status Card (Lock Screen)

The primary control surface on lock screens:

```
┌─────────────────────────────────────┐  ← 362×~349px, radius 10px
│  [Wifi]    [Lock]    [Battery]      │  ← 32px icons
│ Connected  Locked    100%          │  ← Body Small labels
│              ▬▬▬▬                   │  ← white active indicator under "Locked"
│  ─────────────────────────────────  │
│  👁 Password View          XXXXXX   │  ← Body Medium rows, 24px icons
│  ─────────────────────────────────  │
│  🔑 Key Sharing                     │
│  ─────────────────────────────────  │
│  ⚙ Configuration                   │
│  ─────────────────────────────────  │
│  ⊖ Mode                            │
└─────────────────────────────────────┘
     ▬▬▬▬▬▬▬                          ← drag handle: 94×3px, #A7A7A7
```

- Card fill: `rgba(30, 38, 48, 0.79)`
- Shadow: `0 4px 4px rgba(0,0,0,0.25)`
- Row dividers: 1px horizontal lines, full inner width (~306px)
- List inset from card edge: ~28px left (icon at 55px, card at 20px + 48px group offset)

---

### 5.5 Status Indicator Row

Three equal columns:

| Column | Icon | Label |
|--------|------|-------|
| 1 | Wifi (32px) | "Connected" |
| 2 | Lock (32px) | "Locked" + active underline |
| 3 | Battery (32px) | "100%" |

Labels: Body Small, centered under each icon, `#D9D9D9`.

---

### 5.6 Alert / Warning (Forced Lock)

- Size: ~96 × 78px box beside keypad
- Fill: `rgba(155, 67, 67, 0.5)`
- Border: 3px solid `#9B4343`
- Radius: 5px
- Label above: "Forced Lock" — Label Medium, SemiBold, tertiary
- Icon: exclamation triangle, 24px, centered in box

---

### 5.7 Form Controls (Login & Settings)

Observed from Login screen structure:

| Element | Dimensions |
|---------|------------|
| Form container | 344px wide, centered (~29px side margins) |
| Inner padding | 36px |
| FormControl height | 62px |
| Field vertical gap | 82px between fields |
| Primary button (`Button-solid`) | 272 × **36px** |
| Outline/social button | ~83 × **40px** (3-up row) |
| Social button icon | 18×18px |
| Divider with label | 1px lines flanking 14px uppercase label |
| Checkbox row height | 21px |

**Login copy patterns:**
- Headline: "Login to your account"
- Secondary: "Don't have an account?" + link "Sign up"
- Divider: "OR CONTINUE WITH"
- Secondary divider: "WAITING FOR INVITE?"
- Social providers: icon-only outline buttons (Google, etc. + Apple)

---

### 5.8 List Rows (Settings / Menu)

Standard row anatomy:

```
[24px icon]  [Body Medium label]     [optional trailing value/icon]
─────────────────────────────────────────────────────────────────
```

- Leading icon: 24px, `#D9D9D9`
- Label: Body Medium (14px / Medium)
- Trailing: masked value ("XXXXXX") or 12px chevron
- Separator: 1px line between rows

---

### 5.9 Alert Banner (Home)

- Component: `Alert` instance
- Size: 362 × **48px**
- Positioned above bottom content on home/device list screens

---

### 5.10 Avatar (User Settings)

- Size: **128 × 128px**
- Centered horizontally (~135px from left on 402px screen)
- Edit action icon: 20×20px offset near avatar

---

### 5.11 Splash & Brand Mark

- Logo group ("Submark White 2"): **300 × 300px**
- Wordmark below logo: ~175 × 60px
- Vertically centered in upper-middle of screen (~253px from top)
- Same mark reused in **Feature Graphics** (1024 × 500 store asset)

---

## 6. Interaction & UX Conventions

| Pattern | Convention |
|---------|------------|
| Pull to refresh | Hint text at top, 34% opacity — "Pulled down to refresh status" |
| Password visibility | Eye icon + masked "XXXXXX" with toggle |
| Role-based UI | Separate frames for **owner** vs **guest**; connectivity states: in range, not in range, never connected, expired |
| Active status tab | White horizontal bar under selected status column (e.g. Locked) |
| Navigation | Back arrow top-left; bottom tabs for primary app sections |
| Timestamps | Body Small, secondary color, right-aligned above cards |
| Hardware visuals | 3D keypad + handle renders are non-interactive hero imagery |
| Auth flows | Email/password form → primary CTA → social OAuth row → invite/waiting path |

---

## 7. Elevation & Layering (Z-Order)

Bottom to top on a typical lock screen:

1. Gradient rectangle (full screen)
2. Decorative vector blobs
3. 3D hardware renders (keypad, handle)
4. Forced lock alert box
5. Status card (semi-transparent)
6. Header text & back button
7. Status bar (system chrome)
8. Bottom tab bar (fixed)

---

## 8. Responsive & Implementation Notes

- Design is **fixed-width mobile** (402px); scale proportionally for other devices or use standard safe-area insets on real iOS
- Prefer **CSS gradient + rgba overlays** over flat background colors
- Use **semantic color tokens** (not hardcoded grays) so owner/guest/error states can extend the palette consistently
- **Do not** use SF Pro for app body text — reserve it for status bar emulation only
- Card and list layouts use **absolute positioning** in Figma; in code, prefer flexbox/grid but preserve the visual spacing ratios above
- Icon components in Figma map to a shared icon set (Battery, Wifi, Lock, Key, Settings, Home, etc.) — keep names consistent in code

---

## 9. Screen Inventory (Context)

The wireframe file organizes flows across these screen families (for navigation context only):

| Family | Examples |
|--------|----------|
| Auth | Splash, Login, User setting |
| Home | iPhone 16 Pro -7 through -13 (device list variants) |
| Lock (owner) | In Range, Not In Range |
| Lock (guest) | In Range, Never Connected, Out of Range, Already Expired |
| Onboarding | Add Device (Owner/Guest), Choices, Configuration 4–7 |
| Sharing | Share TOTP Code List, Key Sharing |
| System | Settings (many variants), Notifications, Check for update 1–3 |
| Marketing | Feature Graphics, Screenshots |

---

## 10. Quick Reference Cheat Sheet

```
COLORS
  Gradient:   #15324C → #255C8C (51%) → #64B5F6
  Nav bar:    #4387B9
  Card:       rgba(30,38,48,0.79)
  Text:       #FFFFFF / #D9D9D9 / #8C8C8C
  Danger:     #9B4343 on rgba(155,67,67,0.5)

TYPE
  Font:       Roboto (UI), SF Pro (status bar only)
  Title:      32px Medium
  Subtitle:   16px Medium
  Body:       14px Medium / 12px Regular
  Tabs:       11px Medium

SPACE
  Screen:     402 × 874
  Margin:     20px horizontal (cards 362px wide)
  Status bar: 54px | Tab bar: 99px
  Icons:      12 / 18 / 20 / 24 / 32px
  Radius:     5px (small) · 10px (cards) · 24px (icons)

SHADOW
  Cards:      0 4px 4px rgba(0,0,0,0.25)
```

---

*Source: Figma file [Scotty Wireframe](https://www.figma.com/design/hAdvz6euDnH9KzrkZNO1nN/Scotty-Wireframe?node-id=2300-293) — extracted from UI Design page frames and Lock Page In Range (owner) design context.*
