-- ADR-102: Nilecruz's sightseeing programmes get their own tour rate kind. On its own, so the next migration can use it.
alter type public.tour_rate_mode add value if not exists 'program';
