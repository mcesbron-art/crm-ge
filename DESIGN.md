# Design

## Theme

Professional SaaS dashboard with restrained color palette. Dark sidebar navigation (Navy #172236) with gold accents (#C5A55A) and clean white content surfaces.

## Color Palette

### Grounding
- **Background**: #F9F9F8 (off-white, content surface)
- **Surface**: #FFFFFF (cards, elevated surfaces)
- **Sidebar**: #172236 (dark navy, fixed UI container)
- **Border**: #E8E8E6 (subtle dividers)

### Semantic Colors
- **Primary Accent**: #C5A55A (gold, buttons, highlights, active states)
- **Success**: #4CAF50 (green, positive states)
- **Warning**: #FF9800 (orange, caution states)
- **Danger**: #E53935 (red, destructive actions)
- **Info**: #2196F3 (blue, informational states)

### Text
- **Primary Text**: #1A1A1A (titles, body text)
- **Secondary Text**: #666666 (metadata, secondary info)
- **Tertiary Text**: #999999 (labels, disabled text)
- **Inverted (on dark bg)**: #FFFFFF (primary), #CCCCCC (secondary)

## Typography

**Font Family**: DM Sans (system stack fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)

### Scale
- **Display (page title)**: 30px, weight 400, line-height 1.15
- **Heading 1**: 24px, weight 600, line-height 1.2
- **Heading 2**: 20px, weight 600, line-height 1.2
- **Heading 3**: 16px, weight 600, line-height 1.3
- **Body**: 14px, weight 400, line-height 1.5
- **Small**: 12px, weight 400, line-height 1.4
- **Label**: 12px, weight 600, line-height 1.3
- **Code/Mono**: 12px, monospace, weight 400

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
