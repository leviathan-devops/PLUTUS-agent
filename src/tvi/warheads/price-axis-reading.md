# HOW TO READ THE PRICE AXIS

The price axis is on the RIGHT side of the chart. It shows exact price levels.

1. Find the zone you want to identify on the chart (left side = time, right side = price)
2. Follow the horizontal line from the zone to the right edge
3. Read the number on the price axis where the line intersects
4. That number is your zone boundary (top or bottom)

Example:
- You see a supply zone at the top of a consolidation
- Follow the top edge of the consolidation to the right
- The price axis shows 101.14 at that level
- Your zone top = 101.14

For DXY: prices are like 100.95, 101.14 (2 decimal places)
For FX: prices are like 1.1415, 1.1480 (4 decimal places)

---

## Precision Rules
- Zone boundaries MUST have 3+ decimals in evidence (e.g. "at 1.1480") so the
  harness can verify the price reference.
- Read BOTH boundaries from the axis: top from the zone's upper edge, bottom
  from the zone's lower edge. Never estimate one from the other.
- top must be GREATER than bottom. If your mapping produces top <= bottom,
  you misread the axis — re-read the numbers.
- The crosshair label and the axis tick nearest your zone edge must agree.
  If they disagree by more than ~2 pips, trust the tick grid, not the crosshair.
- Round numbers (101.00, 1.1500) are magnets for liquidity — when a zone edge
  sits just beyond one, say so in your evidence.

## Common Failures
- Reading the axis of the WRONG pane (indicator pane below the chart).
- Using the last traded price label instead of the grid tick at the zone edge.
- Swapping DXY's 2-decimal convention with FX's 4-decimal convention.
