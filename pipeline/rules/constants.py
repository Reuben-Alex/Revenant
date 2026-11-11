"""Rule constants. Every value comes from docs/method.md ("Rule as implemented")."""

# docs/method.md: melt needs every valid observation in the window "with snow fraction < 15%" (strict).
SNOW_FREE_BELOW = 0.15

# docs/method.md: melt day starts "a 7-day window".
MELT_WINDOW_DAYS = 7

# docs/method.md: the window needs "≥ 3 valid observations".
MIN_VALID_OBS = 3

# docs/method.md: Risen = on-scar detection "on a day in [melt, melt + 50]".
RISE_WINDOW_DAYS = 50

# docs/method.md: "Zombie year = risen / 24 > 1.4 × chance".
ZOMBIE_FACTOR = 1.4
