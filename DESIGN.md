# Design

## Theme

Premium SaaS dashboard with teal dominance. Dark sidebar (Teal #0D6B5F) with vibrant teal accents (#16A89C), massively scaled typography, and clean white content surfaces. Audacious, professional, efficient.

## Color Palette

### Grounding
- **Background**: #F5F6F7 (clear light gray, content surface)
- **Surface**: #FFFFFF (cards, elevated surfaces)
- **Sidebar**: #0D6B5F (teal dark, fixed UI container)
- **Border**: #E0E3E6 (subtle dividers)

### Primary Accent Family (Teal)
- **Teal Primary**: #0D6B5F (sidebar, dark actions)
- **Teal Accent**: #16A89C (buttons, highlights, active states, icons)
- **Teal Light**: #A8D5D0 (backgrounds, hover tints)

### Semantic Colors
- **Success**: #4CAF50 (green, positive states)
- **Warning**: #FF9800 (orange, caution states)
- **Danger**: #E53935 (red, destructive actions)
- **Info**: #2196F3 (blue, informational states)

### Text
- **Primary Text**: #1A1A1A (titles, body text, numbers)
- **Secondary Text**: #666666 (metadata)
- **Tertiary Text**: #999999 (labels, muted)
- **Inverted (on dark bg)**: #FFFFFF (primary), #D4D4D4 (secondary)

## Typography

**Font Families**: 
- Display numbers: DM Serif Display, serif
- UI: DM Sans, -apple-system, BlinkMacSystemFont, sans-serif

### Scale — Audacious
- **KPI Number**: 72px, DM Serif, weight 400, line-height 1.1
- **Display (page title)**: 36px, DM Sans, weight 600, line-height 1.15
- **Heading 1**: 28px, DM Sans, weight 600, line-height 1.2
- **Heading 2**: 20px, DM Sans, weight 600, line-height 1.3
- **Heading 3**: 18px, DM Sans, weight 600, line-height 1.3
- **KPI Label**: 14px, DM Sans, weight 600, line-height 1.3, uppercase, letter-spacing 0.5px
- **Body**: 16px, DM Sans, weight 400, line-height 1.5
- **Secondary**: 14px, DM Sans, weight 400, line-height 1.4
- **Small**: 13px, DM Sans, weight 400, line-height 1.4
- **Caption**: 12px, DM Sans, weight 500, line-height 1.3

## Components

### Sidebar
- Width: 240px (desktop), full screen (mobile drawer)
- Background: #172236
- Text color: #CCCCCC (default), #FFFFFF (active/hover)
- Active indicator: #C5A55A background with text highlight
- Focus states: 2px outline in gold (#C5A55A)

### Buttons (Primary)
- Background: #C5A55A (rest), darker shade on hover
- Text: #1A1A1A (dark on gold)
- Padding: 12px 16px, rounded 8px
- Focus: 2px outline in gold, 2px offset
- Disabled: opacity 0.5

### Buttons (Secondary)
- Background: #F0F0EE (rest), #E8E8E6 (hover)
- Text: #1A1A1A
- Border: 1px #D8D8D6
- Same focus and padding as primary

### Cards
- Background: #FFFFFF
- Border: 1px #E8E8E6
- Padding: 20px
- Radius: 8px
- Shadow: 0 1px 3px rgba(0,0,0,0.08)

### Inputs/Forms
- Background: #FFFFFF
- Border: 1px #D8D8D6 (rest), #C5A55A (focus)
- Padding: 10px 12px
- Focus: 2px #C5A55A outline, border removed
- Radius: 6px

### Data Tables
- Header background: #F9F9F8
- Row hover: #FAFAF9
- Borders: 1px #E8E8E6

## Motion

- Transition duration: 200ms (state changes)
- Easing: ease-out
- Reduced motion: `@media (prefers-reduced-motion: reduce)` applies instant transitions

## Spacing Scale

8px base unit: 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64

## Responsive

- Mobile: < 640px (stacked layout, full-width inputs)
- Tablet: 640px - 1023px (2-column grids, drawer sidebar)
- Desktop: ≥ 1024px (fixed sidebar, multi-column grids)
