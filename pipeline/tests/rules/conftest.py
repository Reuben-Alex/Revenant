"""Shared test setup for the rule engine: Hypothesis profiles (task 6.1)."""

import os

from hypothesis import settings

# dev: quick local runs (200 examples). ci: thorough runs (1000). Pick with HYPOTHESIS_PROFILE.
# deadline=None: example timing varies on Windows and is not part of the spec.
settings.register_profile("dev", max_examples=200, deadline=None)
settings.register_profile("ci", max_examples=1000, deadline=None)
settings.load_profile(os.environ.get("HYPOTHESIS_PROFILE", "dev"))
